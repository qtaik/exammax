# PRD: ExamMax 选择题刷题框架系统

**Author:** 独立开发者 | **Status:** Draft | **Date:** 2026-05-21

---

## 1. Summary

ExamMax 是一个轻量级的选择题刷题框架系统，核心目标是通过 xlsx 导入选择题，提供随机抽题、按个答题、考试三种刷题模式，帮助用户加强对题目的熟练度。平台采用分类管理（独立分类，无学科概念），支持完整的用户管理、积分/徽章/排行榜/打卡等奖励机制，以及虚拟商店兑换功能。通过邀请码准入机制控制用户注册，管理员可通过后台管理题库、用户和数据统计。技术栈采用 Next.js 全栈方案（TypeScript + Tailwind CSS + Prisma + MySQL），通过 Docker Compose 打包实现一键部署。

---

## 2. Contacts

| Role | Name | Responsibility |
|------|------|----------------|
| PM / Owner | 独立开发者 | 产品决策、需求优先级 |
| Engineering | 独立开发者 | 技术架构、开发交付 |

---

## 3. Background

### 触发因素
- 需要一个轻量级的刷题工具，通过 xlsx 导入选择题，支持多种刷题模式
- 现有平台功能过于复杂，缺少简单直接的刷题框架
- 通过奖励机制（积分、徽章、排行榜）提升刷题动力

### 核心理念
- **核心功能**：选择题刷题框架（xlsx 导入 + 三种刷题模式）
- **附加功能**：用户管理、奖励机制（积分/徽章/排行榜/签到/商店）

### 约束与假设
- **约束：** 个人开发，需要快速上线
- **约束：** 初期仅支持选择题（单选/多选），后续可扩展
- **假设：** 用户通过 xlsx 文件批量导入题目

---

## 4. Objective

### 主要目标
1. **实现核心刷题功能**：支持 xlsx 导入选择题，提供随机抽题、按个答题、考试三种模式
2. **建立奖励机制**：积分、徽章、排行榜、签到、商店等附加功能
3. **一键部署**：通过 Docker Compose 实现简单部署

### 明确不做（Non-Goals）
- 不做学科概念（分类独立，不关联学科）
- 不做填空题、判断题（仅支持选择题）
- 不做实时视频/直播教学
- 不做移动端原生 App（仅 Web 端）
- 不做支付/商业化功能

---

## 5. Market Segments

| Segment | 描述 | 优先级 |
|---------|------|--------|
| **刷题用户** | 需要通过刷题加强题目熟练度的用户 | P0 |
| **管理员** | 平台运营者，管理题库和用户 | P0 |

---

## 6. Value Propositions

| 用户类型 | Job-to-be-Done | Pain Relieved | Gain Created |
|----------|---------------|---------------|--------------|
| **刷题用户** | 通过多种模式刷题，加强题目熟练度 | 消除"没有好的刷题工具"的困扰 | 积分/徽章/排行榜带来的成就感 |
| **刷题用户** | 查看刷题历史和统计 | 消除"不知道练了多少"的焦虑 | 答题记录和正确率统计 |
| **管理员** | 管理题库和用户 | 消除手动管理的繁琐 | xlsx 批量导入、数据统计 |

---

## 7. Solution

### 功能模块概览

```
ExamMax
├── 核心功能：刷题系统
│   ├── xlsx 导入选择题
│   ├── 分类管理（独立分类）
│   ├── 随机抽题模式
│   ├── 按个答题模式
│   └── 考试模式
├── 附加功能：奖励机制
│   ├── 积分/经验值系统
│   ├── 徽章/成就系统
│   ├── 排行榜
│   ├── 连续打卡签到
│   └── 虚拟商店
├── 用户管理
│   ├── 邀请码注册
│   ├── 用户角色（学生/管理员）
│   └── 个人主页
└── 管理后台
    ├── 题库管理（CRUD + xlsx 导入）
    ├── 分类管理
    ├── 用户管理
    ├── 邀请码管理
    └── 数据统计
```

### 三种刷题模式

#### 模式 1：随机抽题
- 从题库中随机抽取 N 道题
- 支持按分类筛选
- 答完显示结果统计

#### 模式 2：按个答题
- 逐题显示，答完一题显示下一题
- 即时反馈对错和解析
- 支持按分类筛选

#### 模式 3：考试模式
- 一次性抽取 N 道题，限时完成
- 答完统一显示结果
- 支持设置考试时间

### User Stories

#### P0 -- Must Have（核心功能）

**US-01: xlsx 导入选择题**
```
As a 管理员,
I want 通过 xlsx 文件批量导入选择题,
so that 我能快速建立题库。

Acceptance Criteria:
- [ ] Given 管理员进入题库管理页面, When 点击"导入题目", Then 显示导入对话框
- [ ] Given 导入对话框, Then 支持选择 xlsx 文件和目标分类
- [ ] Given 上传 xlsx 文件, Then 自动解析并导入题目
- [ ] Given 导入完成, Then 显示导入结果：成功数、失败数、错误详情
- [ ] Given xlsx 格式, Then 支持列：题目内容、答案、选项1-4、题目类目
```

**US-02: 随机抽题模式**
```
As a 用户,
I want 从题库中随机抽取题目练习,
so that 我能全面复习题库内容。

Acceptance Criteria:
- [ ] Given 用户进入练习页面, When 选择"随机抽题", Then 从题库中随机抽取 N 道题
- [ ] Given 用户选择分类, Then 仅从该分类中随机抽取
- [ ] Given 答题完成, Then 显示结果统计：总题数、正确数、正确率、获得积分
```

**US-03: 按个答题模式**
```
As a 用户,
I want 逐题答题并即时看到反馈,
so that 我能及时了解自己的掌握情况。

Acceptance Criteria:
- [ ] Given 用户进入练习页面, When 选择"按个答题", Then 逐题显示题目
- [ ] Given 用户提交答案, Then 立即显示是否正确、正确答案和解析
- [ ] Given 答题完成, Then 显示结果统计
```

**US-04: 考试模式**
```
As a 用户,
I want 模拟考试环境完成一组题目,
so that 我能测试自己的整体水平。

Acceptance Criteria:
- [ ] Given 用户进入练习页面, When 选择"考试模式", Then 一次性抽取 N 道题
- [ ] Given 考试模式, Then 显示倒计时和题目数量
- [ ] Given 用户完成所有题目或时间到, Then 统一显示结果
```

**US-05: 分类管理**
```
As a 管理员,
I want 管理题目分类,
so that 我能组织题库结构。

Acceptance Criteria:
- [ ] Given 管理员进入分类管理, Then 显示分类列表和题目数量
- [ ] Given 管理员创建分类, Then 输入分类名称和描述
- [ ] Given 管理员编辑/删除分类, Then 支持修改和删除操作
```

**US-06: 用户注册（邀请码）**
```
As a 新用户,
I want 通过邀请码注册,
so that 我能使用平台。

Acceptance Criteria:
- [ ] Given 用户访问注册页, When 输入有效邀请码、用户名、密码, Then 注册成功
- [ ] Given 邀请码无效或已使用, Then 显示错误提示
```

**US-07: 积分/经验值系统**
```
As a 用户,
I want 通过答题获得积分和经验值,
so that 我能看到自己的成长。

Acceptance Criteria:
- [ ] Given 用户答对一题, Then 获得积分（基础分 + 难度加成）
- [ ] Given 经验值达到阈值, Then 等级提升
- [ ] Given 用户查看主页, Then 显示积分、经验值、等级
```

**US-08: 连续打卡签到**
```
As a 用户,
I want 每天签到获得奖励,
so that 我能保持刷题习惯。

Acceptance Criteria:
- [ ] Given 用户点击签到, Then 获得积分奖励（基础 +5，连续递增）
- [ ] Given 用户已签到, Then 显示"今日已签到"
- [ ] Given 签到页面, Then 显示连续签到天数
```

**US-09: 徽章/成就系统**
```
As a 用户,
I want 通过完成成就获得徽章,
so that 我能展示自己的刷题成就。

Acceptance Criteria:
- [ ] Given 用户满足条件（如答题100道）, Then 自动获得徽章
- [ ] Given 用户查看成就页, Then 显示所有徽章和获得状态
```

**US-10: 排行榜**
```
As a 用户,
I want 查看积分排行榜,
so that 我能了解自己的排名。

Acceptance Criteria:
- [ ] Given 用户进入排行榜, Then 显示积分/经验值排名
- [ ] Given 排行榜, Then 显示用户装备的徽章和称号
```

**US-11: 虚拟商店**
```
As a 用户,
I want 用积分兑换勋章和称号,
so that 我能展示个性。

Acceptance Criteria:
- [ ] Given 用户进入商店, Then 显示可兑换物品和价格
- [ ] Given 用户积分足够, Then 可兑换物品
- [ ] Given 用户查看主页, Then 显示已兑换的称号
```

**US-12: 管理后台 -- 题库管理**
```
As a 管理员,
I want 管理题库,
so that 我能维护题目内容。

Acceptance Criteria:
- [ ] Given 管理员进入题库管理, Then 显示题目列表（类型、内容、分类、难度）
- [ ] Given 管理员创建/编辑/删除题目, Then 支持 CRUD 操作
- [ ] Given 管理员导入题目, Then 支持 xlsx 批量导入
```

**US-13: 管理后台 -- 用户管理**
```
As a 管理员,
I want 管理用户,
so that 我能维护平台用户。

Acceptance Criteria:
- [ ] Given 管理员进入用户管理, Then 显示用户列表
- [ ] Given 管理员编辑用户, Then 可修改角色和状态
```

**US-14: 管理后台 -- 邀请码管理**
```
As a 管理员,
I want 管理邀请码,
so that 我能控制用户注册。

Acceptance Criteria:
- [ ] Given 管理员进入邀请码管理, Then 显示邀请码列表
- [ ] Given 管理员生成邀请码, Then 支持批量生成
```

**US-15: 管理后台 -- 数据统计**
```
As a 管理员,
I want 查看平台数据统计,
so that 我能了解运营状况。

Acceptance Criteria:
- [ ] Given 管理员进入统计页, Then 显示核心指标（用户数、答题数、正确率）
- [ ] Given 统计页, Then 显示趋势图
```

### Non-Functional Requirements

| Category | Requirement | Target |
|----------|------------|--------|
| **Performance** | 页面首屏加载 | < 2s |
| **Performance** | API 响应 | < 500ms |
| **Security** | 密码存储 | bcrypt 哈希 |
| **Security** | 邀请码防爆 | 限流 |
| **Accessibility** | 响应式设计 | 桌面 + 移动端 |

### Dependencies

| Dependency | 备注 |
|------------|------|
| Next.js 14+ | App Router |
| Prisma ORM | 数据库 |
| Tailwind CSS | 样式 |
| shadcn/ui | UI 组件 |
| MySQL 8.0 | 数据库 |
| Docker | 部署 |
| xlsx | Excel 解析 |

---

## 8. Release

### MVP 范围
- 用户注册/登录（邀请码）
- xlsx 导入选择题
- 分类管理
- 三种刷题模式（随机/按个/考试）
- 基础管理后台

### V1.0 范围
- 完整 MVP
- 积分/经验值系统
- 连续打卡签到
- 徽章/成就系统
- 排行榜
- 虚拟商店
- 邀请码管理
- 数据统计

### V2.0 规划 — 师生模式
- 教师角色（TEACHER）
- 教师创建/管理班级
- 教师布置作业（指定分类、题数、截止时间）
- 学生加入班级、完成作业
- 教师查看学生答题数据和统计
- 班级排行榜

### Success Metrics

| Metric | Target |
|--------|--------|
| 题库导入成功率 | 95%+ |
| 刷题完成率 | 80%+ |
| 用户留存率 | 40%+ |

---

## Appendix A: 技术架构

```
Docker Compose
├── app (Next.js) :3000
│   ├── 前端：Tailwind CSS + shadcn/ui
│   ├── API：Next.js API Routes
│   ├── 认证：JWT
│   └── ORM：Prisma
├── db (MySQL) :3306
└── redis (Redis) :6379 — 登录限流、缓存
```

## Appendix B: 数据模型

```
User (用户)
├── id, username, passwordHash
├── role: STUDENT | TEACHER | ADMIN
├── points, experience, level
├── streakDays, lastCheckIn
└── activeTitleId

Category (分类) - 独立，无学科关联
├── id, name, description
└── questions → Question[]

Question (选择题)
├── id, type: CHOICE
├── content, options (JSON), answer, explanation
├── categoryId, difficulty, imageUrl
└── createdAt

AnswerRecord (答题记录)
├── id, userId, questionId
├── userAnswer, isCorrect, timeSpent
└── createdAt

Badge (徽章)
├── id, name, icon, description, condition
└── userBadges → UserBadge[]

UserBadge (用户徽章)
├── id, userId, badgeId
├── equipped (是否装备)
└── earnedAt

ShopItem (商店物品)
├── id, name, type: MEDAL | TITLE
├── price, description, icon
└── userItems → UserItem[]

InvitationCode (邀请码)
├── id, code, role, status
├── expiresAt, usedById, usedAt
└── createdAt

PointLog (积分记录)
├── id, userId, points, reason
└── createdAt
```

## Appendix C: xlsx 导入格式

| 列 | 字段 | 必填 | 说明 |
|----|------|------|------|
| A | 题目内容 | 是 | 题目文本 |
| B | 答案 | 是 | 正确答案（如 A、AB） |
| C | 题目类型 | 是 | single / multi |
| D | 题目类目 | 是 | 分类名 |
| E | 图片路径 | 否 | 可选 |
| F-I | 选项1-4 | 条件 | 选择题必填 |

---

*PRD Version: 2.1 | Last Updated: 2026-05-21*
