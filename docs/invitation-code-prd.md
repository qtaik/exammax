# 邀请码模块重构 PRD

> 状态：已确认，待实现 | 2026-05-22

## 核心变更

邀请码从"一次性注册凭证"改为"账户有效期控制"，拆分为两张独立表。

---

## 1. AccountCode（账户码）

### 用途
控制用户账户有效期。Admin 生成 → 分发 → 用户注册时绑定 → 码状态决定用户能否登录。

### 数据模型

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | PK |
| code | String (unique) | 邀请码，前缀 `exam_` |
| status | AccountCodeStatus | ACTIVE / EXPIRED / REVOKED |
| role | Role | 注册后赋予的角色 |
| expiresAt | DateTime? | 过期时间，null = 永不过期 |
| usedById | String? (unique) | 绑定的 User，一对一 |
| usedAt | DateTime? | 注册绑定时间 |
| createdById | String? | 生成者 |
| createdAt | DateTime | 创建时间 |

### 状态机

```
[Admin生成] → ACTIVE
  ├→ 自然到期 → EXPIRED → [Admin续期] → ACTIVE
  ├→ Admin吊销 → REVOKED → [Admin恢复] → ACTIVE
  └→ 注册绑定时从 ACTIVE 的码中选一个
```

### 权限

| 操作 | 角色 |
|------|------|
| 生成 | Admin only |
| 列表查看 | Admin only |
| 延期 | Admin only |
| 吊销/恢复 | Admin only |
| 注册使用 | 任何未登录用户 |

---

## 2. ClassCode（班级码）

### 用途
学生加入班级。Teacher 为班级生成，一班级一码，可重复使用，无过期机制。

### 数据模型

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | PK |
| code | String (unique) | 邀请码，前缀 `exmclass_` |
| classId | String | 关联班级 |
| createdById | String? | 生成者 |
| createdAt | DateTime | 创建时间 |

### 规则
- 一个班级同一时间只有一个码（重复生成返回旧的）
- 学生加入班级后码不变，其他学生可继续使用
- 删除班级时级联删除码

### 权限

| 操作 | 角色 |
|------|------|
| 生成 | Teacher（自己班级）/ Admin |
| 查看 | Teacher（自己班级）/ Admin |
| 使用（加入班级） | 任何已登录用户 |

---

## 3. User 表变更

| 变更 | 说明 |
|------|------|
| + accountCodeId | FK → AccountCode，可空 |
| - usedInvitations | 删除 InvitationCode 关联 |
| - createdInvitations | 删除 InvitationCode 关联 |

**Admin 内置账户**（admin/admin123）`accountCodeId = null`，不受码控制。

---

## 4. Auth 中间件变更

### requireAuth
```ts
// 验 JWT → 查 accountCodeId → 查码状态
if (user.role !== "ADMIN" && user.accountCodeId) {
  const code = await getAccountCode(user.accountCodeId)
  if (!code || code.status === "EXPIRED" || code.status === "REVOKED") {
    return 401  // 码失效，即時踢出
  }
}
```

### 登录
验证凭据后，对非 Admin 用户查绑定的 AccountCode 状态，EXPIRED/REVOKED → 拒绝登录。

### JWT 过期时间
JWT `exp` = `AccountCode.expiresAt`（null 则默认 7 天）。

---

## 5. 注册流程变更

```
用户输入码 + 用户名 + 密码
  → 查 AccountCode（status = ACTIVE）
  → 创建 User，设置 accountCodeId
  → 码的 usedById 绑定到该 User
```

---

## 6. API 端点

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | /api/admin/account-codes | 列表，支持 ?status= & ?page= & ?limit= |
| POST | /api/admin/account-codes | 生成，body: { count, role?, expiresAt? } |
| PATCH | /api/admin/account-codes/[id] | 延期 / 吊销 / 恢复，body: { action, expiresAt? } |
| POST | /api/classes/join-by-code | 学生加入班级（改为查 ClassCode） |
| ~~POST~~ | ~~/api/classes/[id]/join~~ | 删除（前端未使用） |

---

## 7. 前端变更

| 页面 | 变更 |
|------|------|
| Admin 邀请码管理 | 改为 AccountCode 管理页，加延期按钮、绑定用户列 |
| Admin 侧边栏 | "邀请码管理" → "账户码管理" |
| Teacher 班级管理 | "邀请码"按钮改为 ClassCode API |
| 学生加入班级 | 不变（后端切换即可） |
| 注册页 | 不变（后端切换即可） |

---

## 8. 清理

- [ ] 删除 `InvitationCode` 模型
- [ ] 删除 `InvitationStatus` 枚举
- [ ] 数据库迁移
- [ ] 更新 seed.ts
