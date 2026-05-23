# ExamMax 刷题平台 — 使用手册

## 目录

- [快速开始](#快速开始)
- [环境要求](#环境要求)
- [配置说明](#配置说明)
- [首次初始化](#首次初始化)
- [角色功能一览](#角色功能一览)
- [核心流水线](#核心流水线)
- [题库导入](#题库导入)
- [运维指南](#运维指南)
- [测试](#测试)
- [技术栈](#技术栈)
- [项目结构](#项目结构)

---

## 快速开始

```bash
git clone <repo-url> && cd exammax

# Docker 一键启动（MySQL + Redis + Next.js）
docker compose up -d --build

# 初始化表结构 + 种子数据
docker compose exec app npx prisma db push
docker compose exec app npx prisma db seed

# 浏览器访问
# http://localhost:3000
```

**默认账户：**

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | `admin` | `admin123` |
| 教师 | `teacher` | `teacher123` |
| 学生 | （使用账户码注册） | 自设 |

---

## 环境要求

### 生产部署

| 资源 | 最低 | 推荐 |
|------|------|------|
| CPU | 2 核 | 4 核 |
| 内存 | 2 GB | 4 GB |
| 磁盘 | 20 GB | 40 GB SSD |
| 系统 | Linux (Ubuntu 22.04 / Debian 12) | — |

### 软件依赖

| 依赖 | 版本 |
|------|------|
| Node.js | 20+ |
| Docker + Docker Compose v2 | 24+ |
| MySQL（非 Docker 方式） | 8.0 |
| Redis（非 Docker 方式） | 7 |

---

## 配置说明

### 环境变量（`.env`）

```bash
# 数据库连接
DATABASE_URL="mysql://exammax:exammax123@localhost:3306/exammax"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# JWT（生产环境必须更换为随机 64 位字符串）
JWT_SECRET="exammax-jwt-secret-key-2026"
```

Docker Compose 中这些变量已设默认值，生产环境请通过宿主机的 `.env` 文件覆盖。

### Docker 服务端口

| 服务 | 端口 | 公网暴露建议 |
|------|------|-------------|
| Next.js | 3000 | 开放（或 Nginx 反代） |
| MySQL | 3306 | **关闭** |
| Redis | 6379 | **关闭** |

### 系统设置（管理员可在后台面板修改）

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `answer_retention_days` | 30 | 答题记录保留天数，超时自动清理 |
| `timezone` | Asia/Shanghai | 系统时区 |
| `scheduler_interval_seconds` | 3600 | 定时清理间隔（1小时） |

---

## 首次初始化

### Docker 方式（推荐）

```bash
# 1. 构建并启动
docker compose up -d --build

# 2. 建表
docker compose exec app npx prisma db push

# 3. 灌种子数据（管理员、教师、徽章、称号）
docker compose exec app npx prisma db seed
```

### 本机开发方式

```bash
# 1. 安装依赖
npm install

# 2. 确保 MySQL + Redis 已运行，修改 .env 连接信息

# 3. 生成 Prisma Client + 建表
npx prisma generate
npx prisma db push

# 4. 灌种子数据
npx prisma db seed

# 5. 启动开发服务器
npm run dev
```

> 种子数据会创建管理员账户、教师账户、5 个学生账户码、7 个成就徽章、10 个称号。

---

## 角色功能一览

### 管理员（`/dashboard/admin`）

| 模块 | 功能 |
|------|------|
| 数据统计 | 8 张摘要卡片 + 6 张图表（30 天趋势、角色分布、题型分布、积分消费、错题 TOP 10） |
| 用户管理 | 搜索、修改角色/积分/经验/密码、授予/移除徽章和称号 |
| 题目管理 | 增删改查、批量删除、Excel 导入导出、按分类/类型筛选 |
| 称号管理 | 创建/编辑/删除商城称号和限定抽奖称号 |
| 账户码 | 批量生成、吊销、延期、删除、复制 |
| 系统设置 | 答题记录保留天数、时区、定时清理间隔 |
| 清理过期 | 一键手动触发 AnswerRecord 清理 + 错题自愈 |

### 教师（`/dashboard/teacher`）

| 模块 | 功能 |
|------|------|
| 班级管理 | 创建班级、生成/删除班级码、查看成员 |
| 考试管理 | 创建考试（选题 + 截止时间 + 防作弊设置）、查看提交状态和成绩 |

### 学生（`/dashboard`）

| 模块 | 功能 |
|------|------|
| 首页 | 模块导航卡片（积分、等级、连签） |
| 练习 | 随机抽题、选择/填空/判断、即时判分 |
| 错题回顾 | 错题列表、分类筛选、错题重练、频错排行、自愈操作 |
| 班级 | 通过班级码加入、查看班级考试列表 |
| 考试 | 在线答题、防作弊（切屏检测+倒计时）、自动提交 |
| 积分抽奖 | 50 积分一次、30 抽保底金色传说、限定称号 |
| 积分商店 | 兑换称号 |
| 签到 | 每日签到领积分、连签奖励 |
| 成就勋章 | 7 种勋章自动发放 |
| 个人中心 | 修改密码、称号/徽章展示、展示顺序 |
| 排行榜 | 正确率榜 / 积分榜 |

---

## 核心流水线

### 积分系统

```
签到 → 练习答对 → 考试全对 → 抽奖中积分红包
                  ↓
            积分商店兑换称号
            抽奖消耗 50/次
```

### 错题自愈流水线

1. 定时任务每小时执行（`scheduler_interval_seconds` 可配）
2. **自愈阶段**：根据 AnswerRecord 重建 WrongQuestion → 某题不再答错则标记 COMPLETED
3. **清理阶段**：删除 `answer_retention_days` 天之前的 AnswerRecord
4. 管理员可在统计页手动触发

### 经验值 & 等级

- 练习答对：+10 经验
- 考试全对：额外奖励
- 等级公式：`(1 + √(1 + 8 × 经验 / 100)) / 2`（渐进增长）

### Session 管理

- Redis 存储 `sessionVersion:{userId}`
- 每次登录，sessionVersion +1
- JWT 中携带 `sv` 字段
- 每次 API 请求校验 `token.sv === redis.sessionVersion`
- 不一致 → 401 "账号已在其他设备登录"

---

## 题库导入

支持 Excel（`.xlsx`）格式批量导入。表头：

| 列 | 必填 | 说明 |
|----|------|------|
| type | 是 | `CHOICE` / `FILL` / `JUDGE` |
| content | 是 | 题目内容 |
| answer | 是 | 正确答案（选择题填选项字母 A/B/C/D） |
| options | 选择题必填 | JSON 数组格式：`["A. 选项1","B. 选项2"]` |
| explanation | 否 | 解析 |
| category | 否 | 分类名（不存在则自动创建） |
| difficulty | 否 | 难度 1-5，默认 1 |

操作路径：管理员 → 题目管理 → 导入 Excel。

---

## 运维指南

### 数据备份

```bash
# 导出数据库
docker compose exec db mysqldump -u exammax -pexammax123 exammax > backup_$(date +%Y%m%d).sql

# 导入恢复
docker compose exec -T db mysql -u exammax -pexammax123 exammax < backup.sql
```

### 数据迁移到服务器

```bash
# 本地导出
docker compose exec db mysqldump -u exammax -pexammax123 exammax > backup.sql

# 上传 + 导入
scp backup.sql user@server:/path/
ssh user@server "cd /path && docker compose exec -T db mysql -u exammax -pexammax123 exammax < backup.sql"
```

> 注意：Docker 镜像本身**不含数据库数据**，数据存在 named volume 中。搬到新服务器需重建镜像 + 导入数据。

### 日志查看

```bash
docker compose logs -f app      # Next.js 日志
docker compose logs -f db       # MySQL 日志
docker compose logs -f redis    # Redis 日志
docker compose logs -f --tail 100 app  # 最近 100 行
```

### 重启 / 停止

```bash
docker compose restart app      # 重启应用
docker compose down             # 停止所有服务（保留数据卷）
docker compose down -v          # 停止并删除数据卷（⚠️ 数据丢失）
```

### 更新部署

```bash
git pull
docker compose up -d --build    # 重建镜像
docker compose exec app npx prisma db push  # 更新表结构（如有变更）
```

### 生产环境安全清单

- [ ] 修改 `JWT_SECRET` 为随机 64 位字符串
- [ ] 修改 `NEXTAUTH_SECRET`
- [ ] 修改 MySQL root 和 exammax 用户密码
- [ ] 关闭 3306/6379 端口的公网访问
- [ ] 配置 HTTPS（Nginx 反代 + Let's Encrypt）
- [ ] 配置 Docker 日志轮转（`/etc/docker/daemon.json`）
- [ ] 设置定时备份 cron job

---

---

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 14 (App Router, standalone output) |
| 语言 | TypeScript 5.4 (strict mode) |
| 数据库 | MySQL 8.0 + Prisma ORM |
| 缓存 | Redis 7 (session version 持久化) |
| 认证 | JWT (jsonwebtoken) + bcryptjs |
| UI | React 18 + Tailwind CSS 3.4 + shadcn/ui + Radix |
| 图表 | Recharts 2.12 |
| 通知 | Sonner (toast) |
| 定时任务 | Node.js instrumentation hook |
| — | — |

---

## 项目结构

```
exammax/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # 登录/注册页面
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── api/                # API 路由
│   │   │   ├── auth/           # 认证（login/logout/register）
│   │   │   ├── user/           # 用户（me/password）
│   │   │   ├── admin/          # 管理（users/questions/categories/stats/settings/titles/account-codes）
│   │   │   ├── practice/       # 练习（抽题/提交/模拟考试）
│   │   │   ├── tasks/          # 考试（创建/提交）
│   │   │   ├── wrong-questions/ # 错题（列表/自愈/重练）
│   │   │   ├── lottery/        # 抽奖（状态/抽奖）
│   │   │   ├── shop/           # 商店（列表/兑换）
│   │   │   ├── checkin/        # 签到
│   │   │   ├── achievements/   # 成就
│   │   │   ├── leaderboard/    # 排行榜
│   │   │   ├── profile/        # 个人中心（装备/称号）
│   │   │   ├── classes/        # 班级
│   │   │   └── categories/     # 分类
│   │   └── dashboard/          # 前端页面（按角色分目录）
│   ├── components/             # UI 组件
│   │   └── ui/                 # shadcn/ui 组件
│   └── lib/                    # 工具库
│       ├── api.ts              # 前端 API 客户端（统一 401 拦截）
│       ├── auth.ts             # JWT 认证 + session 校验
│       ├── prisma.ts           # Prisma 单例
│       ├── wrong-questions.ts  # 错题自愈逻辑
│       ├── badge-checker.ts    # 徽章自动发放
│       └── scheduler.ts        # 定时任务
├── prisma/
│   ├── schema.prisma           # 数据库 Schema
│   └── seed.ts                 # 种子数据
├── docker-compose.yml
├── Dockerfile
└── .env.example
```
