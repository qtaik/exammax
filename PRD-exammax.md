# PRD: ExamMax 选择题刷题框架系统

**Author:** 独立开发者 | **Status:** Draft | **Date:** 2026-05-22

---

## 1. Summary

ExamMax 是一个轻量级的选择题刷题框架系统，核心目标是通过 xlsx 导入选择题，提供随机抽题、按个答题、考试三种刷题模式，帮助用户加强对题目的熟练度。平台采用分类管理（独立分类，无学科概念），支持完整的用户管理、积分/徽章/排行榜/打卡等奖励机制、错题回顾与管理（权重机制 + 错题榜）、虚拟商店兑换功能。通过邀请码准入机制控制用户注册，管理员可通过后台管理题库、用户、系统设置和数据统计。

V1.6 新增**师生交互考试体系**：教师可创建班级、发布指定题目的限时考试（配置切屏限制、每题时限、题目顺序），学生在全屏防作弊环境下逐题作答（每题独立倒计时、切屏检测自动交卷），教师可查看学生成绩统计与切屏日志。

V2.0 重构**用户管理模块**：统一使用抽屉式面板管理用户，单管理员唯一约束（系统仅 admin 一个管理员），角色变更限制 STUDENT 与 TEACHER 互通，提供 7 条单一职责 API 覆盖用户名、密码、积分、经验值、徽章、称号的全方位管理。

V2.1 升级**邀请码体系为账户码+班级码双模型**：将原有单表 InvitationCode 拆分为 AccountCode（账户码，绑定用户角色与有效期）和 ClassCode（班级码，绑定班级供学生加入），管理员/教师各自管理所属的码。

V2.2 引入 **Redis 基础设施升级**：在已有登录限流基础上新增 JWT 登出黑名单（退出登录后 token 立即失效）和 **单终端登录机制**（sessionVersion 版本号写入 JWT，每次请求校验，新登录踢掉旧会话），前端配合全局 401 拦截和 30s 心跳检测，实现被踢即时跳转登录页。

V2.3 重构 **数据统计页**：将原有仅 4 张基础卡片 + 近 7 日简易表格的统计页升级为 8 张摘要卡片 + 6 张 recharts 可视化图表（双 Y 轴折线图、面积图、3 个环形图、柱状图、水平条形图）的运营仪表盘。新增 activeUsers、totalClasses、考试状态分布、totalPointsIssued、shopExchanges、lotteryCount、avgWrongPerUser、wrongByCategory TOP10、30 天 dailyStats 等后端指标。前端新增「清理过期记录」按钮，联动系统设置中的 answer_retention_days 参数，支持管理员一键清理超期 AnswerRecord。

V2.4 重设计 **首页落地页**：将浏览器标题和页面 H1 从"ExamMax 刷题平台"改为"ExamMax"，副标题从"通过刷题练习和奖励激励提升学习效果"改为"不刷题的学生不是好卷王"。引入 framer-motion 实现入场 stagger 淡入动画 + 标题持续微呼吸动效，保持极简居中布局，不加功能卖点卡片。

技术栈采用 Next.js 全栈方案（TypeScript + Tailwind CSS + Prisma + MySQL + Redis），通过 Docker Compose 打包实现一键部署。

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
- **错题回顾需求：** 用户需要系统化的错题管理功能，而非简单的答题历史列表。通过权重机制追踪错题掌握程度，配合错题榜激励用户攻克薄弱环节
- **师生交互考试需求（V1.6）：** 现有的模拟考试模式是学生自选分类/题数/时间自测，缺少教师主导的正式考试场景。教师需要能指定题目、设置截止时间、指派班级、监控学生作答行为（防作弊），学生需要全屏逐题作答并自动收卷，形成完整的"教师发布→学生作答→教师阅卷"闭环
- **用户管理重构需求（V2.0）：** 当前管理后台用户列表仅支持角色修改，缺少对用户名、密码、积分、经验值、徽章、称号等细粒度操控能力。管理员需逐个用户管理时操作路径分散、体验低下。同时需强化"单管理员"设计约束，移除 ADMIN 角色的自由分配能力，将角色变更范围限定为 STUDENT 与 TEACHER 双向转换
- **邀请码体系升级需求（V2.1）：** 原有单表 InvitationCode 混合承载"账户注册码"和"班级加入码"两类职责，字段耦合、逻辑模糊、过期策略混乱。需拆分为 AccountCode（账户准入码）和 ClassCode（班级邀请码）双模型，各司其职，独立管理生命周期
- **安全升级需求（V2.2）：** 平台缺少登出后 token 失效机制（退出登录后旧 token 仍可用）和单终端登录保护（同一账户可同时在多个设备登录）。引入 Redis 实现 JWT 黑名单和 sessionVersion 版本号校验，前端配合全局 401 拦截，形成"后登录踢前登录"的完整安全链路
- **数据统计页重构需求（V2.3）：** 当前统计页（`/dashboard/admin/stats`）仅展示 4 张基础卡片（用户/题目/答题/正确率）+ 2 个分布进度条 + 近 7 日简易表格，缺乏可视化图表、缺少关键运营指标（活跃用户、考试状态追踪、积分发放、商店兑换、抽奖次数、错题分类分布），且无 30 天趋势数据。管理员无法从单一页面了解平台全貌，需升级为现代化运营仪表盘
- **首页重设计需求（V2.4）：** 当前首页（`/`）仅展示标题"ExamMax 刷题平台"、副标题"通过刷题练习和奖励激励提升学习效果"和登录/注册两个按钮，文案平淡无吸引力、无动画效果、缺乏品牌调性。需重新设计文案和视觉动效以匹配 Z 世代学生用户群体的审美

### 核心理念
- **核心功能**：选择题刷题框架（xlsx 导入 + 三种刷题模式）
- **附加功能**：用户管理、奖励机制（积分/徽章/排行榜/签到/商店）、错题回顾与管理
- **师生交互（V1.6）**：班级管理、教师发布考试、学生防作弊作答、教师成绩统计
- **用户管理重构（V2.0）**：单管理员唯一、抽屉式操控面板、7条单一职责API
- **数据统计重构（V2.3）**：8张摘要卡片 + 6张 recharts 图表 + 清理过期记录
- **首页重设计（V2.4）**：新文案"不刷题的学生不是好卷王"、framer-motion 动画、极简居中布局

### 约束与假设
- **约束：** 个人开发，需要快速上线
- **约束：** 初期仅支持选择题（单选/多选），后续可扩展
- **约束：** 错题回顾模块与练习模块解耦，练习模块零改动
- **约束（V1.6）：** 防作弊全屏机制依赖浏览器 Fullscreen API，无法防止物理作弊（如使用第二台设备）
- **假设：** 用户通过 xlsx 文件批量导入题目
- **假设（V1.6）：** 教师已有题库基础，可直接从题库选题发布考试
- **约束（V2.0）：** 系统仅允许存在一个 ADMIN 用户（username=admin），不允许管理员创建或提升其他用户为 ADMIN
- **约束（V2.0）：** 角色变更仅允许 STUDENT 与 TEACHER 之间的双向转换，ADMIN 不参与角色流转
- **假设（V2.0）：** 管理员手动覆盖用户密码时无需验证旧密码，直接替换为新密码

---

## 4. Objective

### 主要目标
1. **实现核心刷题功能**：支持 xlsx 导入选择题，提供随机抽题、按个答题、考试三种模式
2. **建立错题回顾体系**：通过权重机制追踪错题，提供错题重做、错题榜和分类筛选，替代传统答题历史
3. **建立奖励机制**：积分、徽章、排行榜、签到、商店等附加功能
4. **一键部署**：通过 Docker Compose 实现简单部署
5. **建立师生交互考试体系（V1.6）**：班级管理、教师发布指定题目的正式考试、学生全屏防作弊逐题作答、教师查看成绩统计
6. **重构用户管理模块（V2.0）**：抽屉式集中操控面板，单一职责 API，细粒度管理用户名/密码/积分/经验值/徽章/称号，实施单管理员唯一约束
7. **升级邀请码体系为账户码+班级码双模型（V2.1）**：AccountCode 管理用户注册准入，ClassCode 管理班级加入邀请，独立模型、独立过期策略、独立 CRUD
8. **升级安全基础设施（V2.2）**：JWT 登出黑名单（Redis Set），单终端登录（Redis sessionVersion + JWT sv 字段），前端全局 401 拦截 + 30s 心跳检测
9. **重构数据统计页为运营仪表盘（V2.3）**：8 张摘要卡片覆盖核心运营指标，6 张 recharts 可视化图表（双 Y 轴折线图、面积图、3 个环形图、柱状图、水平条形图），30 天趋势数据，分类错题排行榜，一键清理过期记录联动系统设置
10. **重设计首页落地页（V2.4）**：更换标题和副标题文案以匹配目标用户群体（Z 世代学生），引入 framer-motion 实现入场 stagger 淡入动画和标题持续微呼吸动效，提升品牌调性和首屏视觉冲击力

### 明确不做（Non-Goals）
- 不做学科概念（分类独立，不关联学科）
- 不做填空题、判断题（仅支持选择题）
- 不做实时视频/直播教学
- 不做移动端原生 App（仅 Web 端）
- 不做支付/商业化功能
- 不修改练习模块以适配错题记录（fire-and-forget 解耦）
- 不修改自测"模拟考试"模式（教师考试与模拟考试并行，互不干扰）

---

## 5. Market Segments

| Segment | 描述 | 优先级 |
|---------|------|--------|
| **刷题用户（学生）** | 需要通过刷题加强题目熟练度的用户 | P0 |
| **教师** | 发布考试、管理班级、查看学生成绩的教学者（V1.6） | P0 |
| **管理员** | 平台运营者，管理题库和用户 | P0 |

---

## 6. Value Propositions

| 用户类型 | Job-to-be-Done | Pain Relieved | Gain Created |
|----------|---------------|---------------|--------------|
| **刷题用户** | 通过多种模式刷题，加强题目熟练度 | 消除"没有好的刷题工具"的困扰 | 积分/徽章/排行榜带来的成就感 |
| **刷题用户** | 系统化管理错题，针对性攻克薄弱环节 | 消除"不知道哪些题需要重点复习"的焦虑 | 错题权重追踪 + 错题榜排名带来的攻克动力 |
| **刷题用户** | 重做错题直到掌握 | 消除"错题反复错"的挫败感 | 权重机制（对-1/错+1）让进步可视化 |
| **教师（V1.6）** | 创建班级、邀请学生，发布指定题目的限时考试 | 消除"无法组织正式考试"的痛点 | 班级管理 + 考试发布一站完成 |
| **教师（V1.6）** | 查看学生成绩统计、切屏日志、答题分析 | 消除"无法了解学生薄弱环节"的盲区 | 全班正确率统计 + 逐人答题详情 |
| **学生（V1.6）** | 加入班级、参加教师发布的正式考试 | 消除"只有自测缺少正式考试"的缺憾 | 完整考试流程 + 防作弊计时 |
| **学生（V1.6）** | 查看考试成绩和正确答案解析 | 消除"不知道自己错在哪"的困惑 | 交卷即出分 + 逐题展示正确/错误/解析 |
| **管理员** | 管理题库和用户 | 消除手动管理的繁琐 | xlsx 批量导入、数据统计 |
| **管理员** | 配置系统参数（如答题记录保留天数） | 消除硬编码配置的运维负担 | 可视化系统设置页面 |
| **管理员（V2.0）** | 在抽屉面板中集中管理单个用户的所有属性和资产 | 消除"多个页面/弹窗操作同一用户"的分散感 | 右侧抽屉一站式操控：基本信息、密码、积分、经验、徽章、称号 |
| **管理员（V2.0）** | 通过单一职责 API 精确操作用户单项属性 | 消除"一次修改需要更新整个用户对象"的耦合风险 | 每个 API 正交、幂等、可审计 |
| **管理员（V2.0）** | 为用户灵活分配/调整积分、经验值、等级 | 消除"无法手动补偿/修正用户数值"的僵局 | 覆盖模式（设绝对值）+ 增量模式（加减）双模式 |
| **管理员（V2.3）** | 在单一仪表盘页面查看平台全维度运营数据 | 消除"统计指标散落各处、缺乏可视化、无法洞察趋势"的盲区 | 8 张摘要卡片 + 6 张图表 + 30 天趋势，运营决策一目了然 |
| **管理员（V2.3）** | 查看错题在各分类的分布排名，定位薄弱环节 | 消除"不知道哪个分类的题目错误率最高"的信息缺口 | 水平条形图 TOP10 展示，最易错分类一屏可见 |
| **管理员（V2.3）** | 一键清理超过保留天数的过期答题记录 | 消除"手动清理数据库或等待定时任务"的运维负担 | 按钮直接联动 answer_retention_days 系统设置，即时执行 |

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
│   └── 模拟考试模式（自选分类/题数/时间）
├── 师生交互考试系统（V1.6 新增）
│   ├── 班级管理（教师创建/编辑/删除班级，邀请码加入）
│   ├── 考试管理（教师指定题目→设置顺序→配置时限→指派班级→发布）
│   ├── 防作弊作答（全屏 + 每题独立倒计时 + 切屏检测自动交卷）
│   ├── 学生考试列表（待考/已考/已逾期三状态）
│   └── 成绩统计（逐人答题详情 + 全班正确率 + 切屏日志）
├── 错题回顾系统（V1.5 新增）
│   ├── 错题列表（待攻克 / 已攻克双 Tab）
│   ├── 错题榜 Top 20（按 errorCount 降序）
│   ├── 分类筛选（同时影响列表和榜单）
│   ├── 权重机制（答错+1，答对-1，归零自动移入已攻克）
│   ├── 错题重做（调用练习接口获取题目数据）
│   ├── Fire-and-Forget 更新（练习模块零改动）
│   └── 自愈机制（从 AnswerRecord 重建 WrongQuestion）
├── 附加功能：奖励机制
│   ├── 积分/经验值系统（独立计算）
│   ├── 徽章/成就系统（自动授予）
│   ├── 称号系统（商城购买 + 抽奖掉落）
│   ├── 抽奖系统（积分消费 + 保底机制）
│   ├── 排行榜
│   ├── 连续打卡签到
│   └── 虚拟商店
├── 用户管理
│   ├── 邀请码注册
│   ├── 用户角色（学生/教师/管理员）
│   ├── 个人主页
│   └── 管理后台用户操控面板（V2.0 重构）
│       ├── 用户列表 → 点击行 → 右侧抽屉
│       ├── 抽屉内：基本信息编辑（用户名 / 角色）
│       ├── 抽屉内：密码管理员覆盖
│       ├── 抽屉内：积分 / 经验值 / 等级（覆盖 / 增量模式）
│       ├── 抽屉内：徽章管理（已有列表 + 发放 + 删除）
│       └── 抽屉内：称号管理（已有列表 + 当前标记 + 设置 / 取消）
└── 管理后台
    ├── 题库管理（CRUD + xlsx 导入）
    ├── 分类管理
    ├── 用户管理
    ├── 邀请码管理
    ├── 系统设置（V1.5 新增）
    └── 数据统计（V2.3 重构）
        ├── 8 张摘要卡片（活跃用户 / 班级数 / 考试总数 / 完成率 / 积分发放 / 商店兑换 / 抽奖次数 / 人均错题）
        ├── 6 张 recharts 图表（双Y轴折线图 / 面积图 / 3个环形图 / 柱状图 / 水平条形图）
        └── 清理过期记录（联动 answer_retention_days）
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

### 错题回顾模块（V1.5）

#### 设计原则：与练习模块解耦

错题回顾模块的核心设计原则是**零侵入**：练习模块（`/dashboard/practice`）不做任何修改。前端在练习流程结束后，以 fire-and-forget 方式调用 `POST /api/wrong-questions` 更新错题状态，不等待响应，不阻塞 UI。

```
练习流程结束 (答对/答错)
    │
    ├──► fire-and-forget → POST /api/wrong-questions  (后台更新 WrongQuestion)
    │
    └──► 正常显示结果页面 (不等待 wrong-questions 响应)
```

#### 数据模型

**WrongQuestion 表：**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (CUID) | 主键 |
| userId | String | 用户 ID (FK) |
| questionId | String | 题目 ID (FK) |
| errorCount | Int | 错误权重计数（错+1，对-1，最小 0） |
| status | Enum: ACTIVE / COMPLETED | ACTIVE=待攻克，COMPLETED=已攻克 |
| wrongAnswers | Json (String[]) | 最近 5 次错误答案（FIFO 队列） |
| completedAt | DateTime? | 攻克完成时间 |

**索引：** `@@unique([userId, questionId])`，`@@index([userId, status])`，`@@index([errorCount])`

**Setting 表（key-value 配置）：**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (CUID) | 主键 |
| key | String (unique) | 配置键名（如 `answer_retention_days`） |
| value | String | 配置值（JSON 序列化，支持 number/boolean/string） |
| type | Enum: NUMBER / BOOLEAN / STRING | 值类型 |
| label | String | 前端显示标签 |
| description | String? | 配置说明 |
| updatedAt | DateTime | 更新时间 |

#### 权重机制

```
答题结果         WrongQuestion 更新逻辑
───────────────────────────────────────────
答错             errorCount += 1
                wrongAnswers 头部插入本次答案（保留最近5条）
                若 status=COMPLETED → 恢复为 ACTIVE

答对             errorCount -= 1（最小为 0）
                若 errorCount === 0 → status=COMPLETED, completedAt=now()
```

#### API 端点

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/wrong-questions` | 获取当前用户错题列表（支持 status/categoryId 筛选，分页） | 用户 |
| POST | `/api/wrong-questions` | Fire-and-forget 更新错题状态（body: questionId, isCorrect, userAnswer） | 用户 |
| POST | `/api/wrong-questions/self-heal` | 自愈：从 AnswerRecord 重建 WrongQuestion + 清理过期 AnswerRecord | 用户 |
| GET | `/api/wrong-questions/practice` | 获取错题题目数据用于重做（支持 categoryId 筛选，返回 Question[]） | 用户 |

**GET /api/wrong-questions 请求参数：**
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| status | ACTIVE / COMPLETED / all | ACTIVE | 筛选状态 |
| categoryId | string? | - | 分类筛选 |
| page | number | 1 | 页码 |
| limit | number | 20 | 每页条数 |

**GET /api/wrong-questions 响应：**
```json
{
  "records": [{ "id", "question": {...}, "errorCount", "status", "wrongAnswers", "completedAt" }],
  "total": 100,
  "page": 1,
  "totalPages": 5,
  "leaderboard": [{ "questionId", "content", "errorCount", "categoryName" }]  // Top 20
}
```

**POST /api/wrong-questions 请求体：**
```json
{
  "questionId": "xxx",
  "isCorrect": false,
  "userAnswer": "B"
}
```

**POST /api/wrong-questions/self-heal 逻辑：**
1. 遍历当前用户所有 AnswerRecord，按 questionId 分组
2. 对每题：统计总错误次数 = errorCount，最近 5 次错误答案 = wrongAnswers
3. Upsert WrongQuestion（userId + questionId 唯一）
4. 根据 Setting 表中的 `answer_retention_days` 清理过期 AnswerRecord
5. 返回修复统计：{ wrongQuestionsCreated, wrongQuestionsUpdated, answerRecordsDeleted }

#### 前端页面：错题回顾（替换 /dashboard/history）

**页面布局：**
```
┌──────────────────────────────────────────────────────┐
│  错题回顾                              [分类筛选 ▼]  │
├────────────────────────────────┬─────────────────────┤
│  [待攻克]  [已攻克]            │  错题榜 TOP 20      │
│                                │  ┌───────────────┐  │
│  ┌──────────────────────────┐  │  │ 1. xxx (15次) │  │
│  │ 题目卡片 (errorCount=N)  │  │  │ 2. xxx (12次) │  │
│  │ ─ 分类标签               │  │  │ 3. xxx (10次) │  │
│  │ ─ 最近错误答案: A, B, C  │  │  │ ...           │  │
│  │ ─ [重做] 按钮            │  │  │               │  │
│  └──────────────────────────┘  │  └───────────────┘  │
│  ┌──────────────────────────┐  │                     │
│  │ ...更多题目卡片           │  │                     │
│  └──────────────────────────┘  │                     │
│  [分页]                        │                     │
└────────────────────────────────┴─────────────────────┘
```

**双 Tab 行为：**
- **待攻克（ACTIVE）：** 默认 Tab，显示 errorCount > 0 的错题，按 errorCount 降序排列
- **已攻克（COMPLETED）：** 显示 errorCount === 0 的已攻克题目，按 completedAt 降序排列

**错题榜（右侧）：**
- 固定显示当前用户 errorCount 最高的 20 道错题（只统计 ACTIVE 状态）
- 显示题目的前 30 字符 + 分类名 + errorCount
- 分类筛选同时影响左侧列表和右侧榜单

**重做功能：**
- 点击「重做」按钮，调用 `GET /api/wrong-questions/practice?categoryId=xxx` 获取错题数据
- 可指定分类筛选，以练习模式呈现（复用现有练习组件或独立重做组件）
- 重做完成后调用 POST /api/wrong-questions 更新状态

#### 管理后台：系统设置页

**路由：** `/dashboard/admin/settings`（ADMIN only）

**功能：**
- 以表单形式展示所有 Setting 配置项
- 根据 type 渲染对应的输入控件（number input / toggle / text input）
- 显示 label 和 description 帮助文案
- 保存按钮：批量更新修改过的配置项

**预置配置项：**
| key | type | 默认值 | label | description |
|-----|------|--------|-------|-------------|
| answer_retention_days | NUMBER | 90 | 答题记录保留天数 | 超过此天数的 AnswerRecord 在 self-heal 时被清理 |

### 师生交互考试模块（V1.6）

#### 与模拟考试的区别

现有"模拟考试"是学生自选分类/题数/时间自测；V1.6 考试模块是**教师主导**的正式考试：
- 教师指定具体题目，而非学生自选范围
- 教师设置截止时间，而非学生自选时长
- 教师指派班级，所有成员均可参加
- 防作弊机制（全屏 + 每题倒计时 + 切屏检测）
- 教师查看全班统计和逐人答题详情

#### 数据模型变更

**新增 Class 模型：**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (CUID) | 主键 |
| name | String | 班级名称 |
| description | String? | 班级描述 |
| teacherId | String | 创建教师 ID (FK User) |
| createdAt | DateTime | 创建时间 |

**新增 ClassMember 模型：**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (CUID) | 主键 |
| classId | String | 班级 ID (FK Class) |
| userId | String | 学生 ID (FK User) |
| joinedAt | DateTime | 加入时间 |

**索引：** `@@unique([classId, userId])`

**修改 Task 模型（新增字段）：**
| 字段 | 类型 | 说明 |
|------|------|------|
| classId | String? | 指派班级 ID（替代多对多 assignedTo） |
| questionOrder | String | "manual"（手动顺序）\| "shuffle"（随机打乱） |
| perQuestionTime | Int? | 每题时限秒数（null=不限） |
| maxTabSwitches | Int | 最大切屏次数，默认 3 |

**修改 TaskSubmission 模型（新增字段）：**
| 字段 | 类型 | 说明 |
|------|------|------|
| tabSwitches | Int | 实际切屏次数，默认 0 |
| switchLog | Json | 切屏记录 `[{time, duration}]`，默认 `[]` |
| perQuestionTime | Json? | 每题实际用时 `{qId: seconds}` |
| submittedAt | DateTime? | 实际交卷时间 |

**修改 InvitationCode 模型（V1.6 新增字段，V2.1 中已拆分为 AccountCode + ClassCode）：**
| 字段 | 类型 | 说明 |
|------|------|------|
| classId | String? | 关联班级（班级专属邀请码） |
| createdById | String? | 创建者 ID（哪个教师生成的） |

#### 防作弊机制

```
学生进入考试
  │
  ├──► 强制全屏（调用 Fullscreen API）
  │     └── 拒绝 → 不允许开始考试
  │
  ├──► 每题独立计时器（切题暂停/恢复）
  │     ├── 前端 setInterval + 内存管理
  │     └── localStorage 快照防丢（刷新恢复计时状态）
  │
  ├──► 切屏检测
  │     ├── visibilitychange 事件（切换标签页/最小化）
  │     ├── blur 事件（窗口失焦）
  │     └── 切屏计数 >= maxTabSwitches → 自动交卷
  │
  ├──► 时限到 → 自动锁定当前题（不可再修改答案）
  │
  ├──► 截止时间到 → 自动交卷
  │
  └──► 答题记录同步写入 AnswerRecord
        └── 错题自动进入 WrongQuestion（fire-and-forget）
```

**计时器实现要点：**
- 每道题有独立 `perQuestionTime`（若配置），切到下一题时暂停当前计时器、恢复/启动新题计时器
- 每题剩余时间通过 `localStorage` 快照保存（key: `exam_{taskId}_q_{questionId}_remaining`），防止刷新丢失
- 交卷时清除所有 localStorage 快照
- 前端组件卸载时（`cleanup`）暂停所有计时器

**切屏检测实现要点：**
- `document.addEventListener("visibilitychange", ...)` — 检测标签页切换
- `window.addEventListener("blur", ...)` — 检测窗口失焦
- 每次切屏记录 `{time: DateTime, duration: 失焦时长}` 推入 `switchLog`
- `switchLog.length >= maxTabSwitches` 时触发自动交卷
- 交卷前弹出提示："您已切换屏幕超过限制次数，系统将自动交卷"

#### API 端点

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/classes` | 教师获取自己的班级列表 | TEACHER |
| POST | `/api/classes` | 教师创建班级 | TEACHER |
| PUT | `/api/classes/[id]` | 教师编辑班级 | TEACHER (owner) |
| DELETE | `/api/classes/[id]` | 教师删除班级 | TEACHER (owner) |
| GET | `/api/classes/[id]/members` | 获取班级成员列表 | TEACHER (owner) |
| POST | `/api/classes/[id]/members` | 手动添加学生 | TEACHER (owner) |
| DELETE | `/api/classes/[id]/members` | 移除学生 | TEACHER (owner) |
| POST | `/api/classes/[id]/join` | 学生通过邀请码加入班级 | STUDENT |
| GET | `/api/tasks` | 学生：获取自己的考试列表（按班级）；教师：获取自己发布的考试列表 | 用户 |
| POST | `/api/tasks` | 教师创建考试（选题→配置→指派班级） | TEACHER |
| PUT | `/api/tasks/[id]` | 教师编辑未开始的考试 | TEACHER (owner) |
| DELETE | `/api/tasks/[id]` | 教师删除未开始的考试 | TEACHER (owner) |
| GET | `/api/tasks/[id]` | 获取考试详情 + 题目列表 | 用户（教师/班级成员） |
| POST | `/api/tasks/[id]/submit` | 交卷（含切屏数据、每题用时） | STUDENT |
| GET | `/api/tasks/[id]/results` | 教师查看考试成绩统计 | TEACHER (owner) |
| GET | `/api/classes/[id]/invitations` | 获取班级邀请码列表 | TEACHER (owner) |
| POST | `/api/classes/[id]/invitations` | 生成班级邀请码 | TEACHER (owner) |

**POST /api/tasks 请求体（教师创建考试）：**
```json
{
  "title": "期中测试",
  "description": "第一章到第三章",
  "classId": "class_xxx",
  "questionIds": ["q1", "q2", "q3", "..."],
  "questionOrder": "manual",
  "deadline": "2026-06-01T23:59:59Z",
  "perQuestionTime": 120,
  "maxTabSwitches": 3
}
```

**POST /api/tasks/[id]/submit 请求体（学生交卷）：**
```json
{
  "answers": [
    { "questionId": "q1", "userAnswer": "A", "timeSpent": 45 }
  ],
  "tabSwitches": 1,
  "switchLog": [
    { "time": "2026-05-22T10:00:05Z", "duration": 3 }
  ],
  "perQuestionTime": {
    "q1": 45,
    "q2": 120
  }
}
```

**GET /api/tasks/[id]/results 响应（教师查看成绩）：**
```json
{
  "task": {
    "id": "task_xxx",
    "title": "期中测试",
    "class": { "id": "class_xxx", "name": "一班" },
    "totalQuestions": 20,
    "submissionsCount": 35,
    "averageCorrect": 14.5,
    "averageCorrectRate": 0.725
  },
  "submissions": [
    {
      "user": { "id": "u1", "username": "张三" },
      "status": "COMPLETED",
      "correctCount": 16,
      "totalCount": 20,
      "tabSwitches": 0,
      "switchLog": [],
      "submittedAt": "2026-05-25T14:30:00Z",
      "answers": [
        {
          "question": { "id": "q1", "content": "...", "answer": "A", "explanation": "..." },
          "userAnswer": "A",
          "isCorrect": true,
          "timeSpent": 45
        }
      ]
    }
  ]
}
```

**POST /api/tasks 服务端逻辑（创建考试时，为全班学生创建 TaskSubmission）：**
```
1. 验证教师身份
2. 创建 Task（含 classId, questionIds, questionOrder, perQuestionTime, maxTabSwitches）
3. 查询 ClassMember 获取该班级所有学生 userId
4. 为每个学生创建 TaskSubmission（status: PENDING）
5. 返回 Task 详情
```

#### 前端路由

| 路由 | 说明 | 角色 |
|------|------|------|
| `/dashboard/teacher/classes` | 班级管理页（创建/编辑/删除班级，查看成员） | TEACHER |
| `/dashboard/teacher/exams` | 考试管理页（创建/编辑/删除考试） | TEACHER |
| `/dashboard/teacher/exams/[id]/results` | 成绩查看页（逐人详情 + 统计） | TEACHER |
| `/dashboard/exams` | 学生考试列表（待考/已考/已逾期） | STUDENT |
| `/dashboard/exams/[id]` | 学生作答页（考试中）或考试结果页（已完成） | STUDENT |

#### 学生考试作答流程

```
学生进入 /dashboard/exams
  │
  ├──► 考试列表（三个状态Tab）
  │     ├── 待考（PENDING，未逾期）
  │     ├── 已考（COMPLETED）
  │     └── 已逾期（OVERDUE，未完成且已过截止时间）
  │
  └──► 点击"开始考试"
        │
        ├──► 请求全屏（Fullscreen API）
        │     └── 拒绝 → 提示"考试需要全屏模式，请允许后重试"，不允许开始
        │
        ├──► 进入逐题作答界面
        │     ├── 显示：题号（N/总数）、题目内容、选项、每题倒计时
        │     ├── 每题独立计时器（perQuestionTime 倒计时）
        │     ├── 切到下一题 → 暂停当前计时，记录用时
        │     ├── 切屏检测（visibilitychange + blur）
        │     │   ├── 切屏次数 < maxTabSwitches → 记录 + 警告提示
        │     │   └── 切屏次数 >= maxTabSwitches → 自动交卷
        │     ├── 每题时限到 → 锁定本题（不可再修改），自动跳到下一题
        │     └── 最后一题时限到或切屏超限 → 自动交卷
        │
        └──► 交卷（手动点击 或 自动触发）
              ├── 弹出确认弹窗："确定要交卷吗？已答 X/总数 题"
              ├── 提交答案 + 切屏日志 + 每题用时
              ├── 写入 AnswerRecord（逐题）
              ├── fire-and-forget → POST /api/wrong-questions（错题更新）
              ├── 清除 localStorage 计时快照
              ├── 退出全屏
              └── 跳转结果页：总分、对错、正确答案、解析
```

#### 教师成绩查看

```
教师进入 /dashboard/teacher/exams/[id]/results
  │
  ├──► 顶部统计卡片
  │     ├── 应参加人数 / 实际完成人数
  │     ├── 全班平均正确率
  │     └── 每题正确率分布
  │
  └──► 学生列表
        ├── 按正确率排序（降序）
        ├── 每行：姓名、状态、正确数/总数、切屏次数、交卷时间
        ├── 展开详情：逐题答案（正确/错误）、每题用时
        └── 切屏日志详情（时间线展示）
```

### 用户管理重构模块（V2.0）

#### 重构目标

当前管理后台用户管理页（`/dashboard/admin/users`）仅支持列表展示 + 角色修改，无法满足管理员对用户全维度管理需求。V2.0 将彻底重构该模块：

1. **交互升级**：从表格式管理转为抽屉式（Sheet/Drawer）集中操控面板
2. **API 拆分**：从单一 PATCH 端点拆为 7 条单一职责 API
3. **约束强化**：单管理员唯一、角色变更仅限 STUDENT↔TEACHER
4. **功能扩展**：新增密码覆盖、积分/经验/等级调整、徽章发放/删除、称号设置/取消

#### 单管理员唯一约束（ADMIN Singleton）

系统从设计层面保证全局仅存在一个 ADMIN 用户：
- 管理员端角色下拉仅显示 STUDENT 和 TEACHER，不包含 ADMIN 选项
- 后端所有涉及角色修改的 API 必须拒绝将任何用户角色设为 ADMIN
- 管理员自身不可将自己的角色从 ADMIN 改为其他角色
- 数据库层面：应用层而非数据库约束（保留枚举值但限制写入路径）
- 种子数据中预置 `admin` 用户，且不提供通过 UI 创建管理员的功能

#### 交互设计：用户行 → 右侧抽屉

```
┌─────────────────────────────────────────────────────────────┐
│  用户管理                                    [搜索...]       │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │ 用户名      角色    积分   经验   等级 操作  │           │
│  ├──────────────────────────────────────────────┤           │
│  │ 张三        STUDENT  150   200    2    →    │  ┌──────┐ │
│  │ 李四        TEACHER  300   500    5    →    │  │      │ │
│  │ 王五        STUDENT  50    100    1    →    │  │ 抽   │ │
│  │ ...                                        │  │      │ │
│  │                                            │  │ 屉   │ │
│  │                                            │  │ 面   │ │
│  │                                            │  │      │ │
│  │                                            │  │ 板   │ │
│  │                                            │  │      │ │
│  │                                            │  │      │ │
│  │                                            │  │      │ │
│  └──────────────────────────────────────────────┘  │      │ │
│                               [分页]                 └──────┘ │
└─────────────────────────────────────────────────────────────┘
```

**点击用户行 → 右侧抽屉展开，内容如下：**

```
┌──────────────────────────────────────┐
│  [关闭 X]       用户操控面板          │
│                                      │
│  ── 基本信息 ────────────────────────│
│  用户名: [张三__________] [保存]     │
│  角  色: [STUDENT ▼]       [保存]   │
│  注册时间: 2026-01-15               │
│                                      │
│  ── 密码管理 ────────────────────────│
│  新密码: [____________] [覆盖密码]   │
│  (管理员直接覆盖，无需旧密码验证)     │
│                                      │
│  ── 积分 / 经验 / 等级 ──────────────│
│  积分: 150  ○ 覆盖  ● 增量          │
│        [____] (+/- 数字)  [确认]    │
│  经验: 200  ○ 覆盖  ● 增量          │
│        [____] (+/- 数字)  [确认]    │
│  等级: 2    ○ 覆盖  ● 增量          │
│        [____] (+/- 数字)  [确认]    │
│                                      │
│  ── 徽章管理 ────────────────────────│
│  已有徽章:                           │
│  [我上我也行 ×] [扶我起来 ×] [对王 ×]│
│  发放徽章: [选择徽章 ▼] [发放]      │
│  (下拉显示该用户尚未拥有的徽章)       │
│                                      │
│  ── 称号管理 ────────────────────────│
│  已有称号:                           │
│  ● 哈基米 (当前使用)  [取消使用]    │
│    我的刀盾            [设为当前]    │
│    咕咕嘎嘎            [设为当前]    │
│                                      │
│   (用户无称号时显示："该用户暂无称号")│
│                                      │
└──────────────────────────────────────┘
```

**操作反馈规则：**
- 每个操作成功：显示 Toast 提示 "用户名已更新" / "密码已覆盖" / "积分已调整" 等
- 每个操作失败：显示错误原因 "用户名已被占用" / "参数无效" 等
- 操作后自动刷新抽屉中的用户数据，无需手动刷新

#### 积分 / 经验 / 等级调整模式

每种数值提供两种模式（默认增量模式）：

| 模式 | 行为 | 示例 |
|------|------|------|
| **增量模式** (默认) | 当前值 + 输入值。输入正数为增加，负数为减少 | 当前积分 100，输入 +50 → 150；输入 -30 → 70 |
| **覆盖模式** | 直接设置为输入值 | 当前积分 100，输入 500 → 500 |

**约束：**
- 积分不能 < 0，调整后最小值为 0
- 经验值不能 < 0，调整后最小值为 0
- 等级不能 < 1，调整后最小值为 1
- 等级变化规则：仅能通过覆盖模式设置（增量增减等级无意义）；若选择增量则按经验值公式反算（不直接增减等级）
- 调整积分/经验值后，`PointLog` 表写入审计记录（reason: `admin_manual_adjustment`）

#### API 设计：7 条单一职责路由

所有 API 均需 ADMIN 角色认证，路由前缀为 `/api/admin/users/[id]`：

| # | 方法 | 路径 | 单一职责 | 请求体 |
|---|------|------|----------|--------|
| 1 | `PATCH` | `/api/admin/users/[id]` | 更新用户名 + 角色 | `{ username?: string, role?: "STUDENT" \| "TEACHER" }` |
| 2 | `PUT` | `/api/admin/users/[id]/password` | 管理员覆盖密码 | `{ password: string }` |
| 3 | `PATCH` | `/api/admin/users/[id]/points` | 积分调整（覆盖/增量） | `{ mode: "set" \| "add", value: number }` |
| 4 | `PATCH` | `/api/admin/users/[id]/experience` | 经验值调整（覆盖/增量） | `{ mode: "set" \| "add", value: number }` |
| 5 | `POST` | `/api/admin/users/[id]/badges` | 授予徽章 | `{ badgeId: string }` |
| 6 | `DELETE` | `/api/admin/users/[id]/badges` | 删除用户的徽章 | `{ badgeId: string }` (query param 或 body) |
| 7 | `PUT` | `/api/admin/users/[id]/title` | 设置当前使用称号 | `{ titleId: string }` |
| 8 | `DELETE` | `/api/admin/users/[id]/title` | 取消当前使用称号 | (无请求体) |

**注意：** 实际上有 8 个端点（含 DELETE title），但用户称 7 个（将 PUT/DELETE title 视为一组 PUT、POST/DELETE badges 各一）。文档在此列出 8 个以防混淆，具体认路由定义。

**各 API 详细规格：**

**1. PATCH /api/admin/users/[id] — 更新用户名 + 角色**
```
Request:  { username?: string, role?: "STUDENT" | "TEACHER" }
Response: { user: { id, username, role, points, experience, level, ... } }
验证:
  - username 若变更：检查唯一性
  - role 若变更：仅允许 STUDENT 或 TEACHER，拒绝 ADMIN
  - 不允许管理员修改自己的角色
  - 至少提供 username 或 role 之一
```

**2. PUT /api/admin/users/[id]/password — 覆盖密码**
```
Request:  { password: string }
Response: { success: true }
验证:
  - password 长度 >= 6
  - 后端 bcrypt 哈希后覆盖存储
  - 不要求验证旧密码（管理员特权）
  - 写入审计日志（可选）
```

**3. PATCH /api/admin/users/[id]/points — 积分调整**
```
Request:  { mode: "set" | "add", value: number }
Response: { user: { id, points, ... } }
验证:
  - mode="set": 直接设置 points = value（value >= 0）
  - mode="add": points += value（结果 >= 0，否则截断为 0）
  - 写入 PointLog（reason: admin_manual_adjustment）
```

**4. PATCH /api/admin/users/[id]/experience — 经验值调整**
```
Request:  { mode: "set" | "add", value: number }
Response: { user: { id, experience, level, ... } }
验证:
  - mode="set": 直接设置 experience = value（value >= 0），重新计算等级
  - mode="add": experience += value（结果 >= 0），重新计算等级
  - 等级计算: level = floor(experience / 100) + 1（与现有升级公式一致）
```

**5. POST /api/admin/users/[id]/badges — 授予徽章**
```
Request:  { badgeId: string }
Response: { userBadge: { id, badgeId, userId, earnedAt } }
验证:
  - badgeId 存在
  - 用户尚未拥有该徽章（@@unique([userId, badgeId]) 防重）
  - 自动设置 equipped = false（由用户自行装备）
```

**6. DELETE /api/admin/users/[id]/badges — 删除徽章**
```
Request:  { badgeId: string } (query param: ?badgeId=xxx)
Response: { success: true }
验证:
  - 用户拥有该徽章
  - 删除 UserBadge 记录
  - 若删除的是用户当前 equipped 的徽章，自动取消装备状态
```

**7. PUT /api/admin/users/[id]/title — 设置当前称号**
```
Request:  { titleId: string }
Response: { user: { id, activeTitleId, ... } }
验证:
  - titleId 对应的 ShopItem 存在且 type=TITLE
  - 用户已拥有该称号（UserItem 中存在记录）
  - 设置 user.activeTitleId = titleId
```

**8. DELETE /api/admin/users/[id]/title — 取消当前称号**
```
Request:  (无)
Response: { user: { id, activeTitleId: null, ... } }
验证:
  - 用户当前有 activeTitleId
  - 设置 user.activeTitleId = null
```

#### 前端路由 & 组件

| 路由 | 说明 | 角色 |
|------|------|------|
| `/dashboard/admin/users` | 用户管理列表页（重构） | ADMIN |
| `/dashboard/admin/users` + Drawer | 点击用户行触发右侧抽屉操控面板 | ADMIN |

**组件树：**
```
/dashboard/admin/users/page.tsx
├── UserTable (用户列表表格)
│   ├── SearchBar (搜索框)
│   ├── UserRow (用户行，点击触发 onSelect)
│   └── Pagination (分页)
└── UserDrawer (右侧抽屉面板)
    ├── BasicInfoSection (用户名编辑 + 角色选择 + 注册时间)
    ├── PasswordSection (密码输入 + 覆盖按钮)
    ├── PointsSection (积分模式切换 + 数值输入 + 确认)
    ├── ExperienceSection (经验模式切换 + 数值输入 + 确认)
    ├── LevelSection (等级覆盖输入 + 确认)
    ├── BadgeSection (已有徽章列表 + 删除 + 发放下拉)
    └── TitleSection (已有称号列表 + 当前标记 + 设置/取消)
```

#### 数据流

```
用户列表页加载
  │
  ├── GET /api/admin/users (现有，无需改动)
  │     获取分页用户列表
  │
  └── 点击用户行
        │
        ├── 展开右侧抽屉
        ├── 通过已有列表数据渲染各 Section
        ├── 各 Section 按需调用独立 API
        │
        └── 操作完成后刷新抽屉数据
              (重新 GET 该用户详情或乐观更新)
```

#### 与现有 admin/users API 的关系

V2.0 将废弃现有 `PATCH /api/admin/users` 端点（批量角色修改）。替代方案：
- 保留 `GET /api/admin/users` 用于列表获取（无需改动）
- 新增 7 条细分端点置于 `/api/admin/users/[id]/...` 路径下
- 旧 PATCH 端点标记为 deprecated，待前端迁移完成后移除

### 账户码与班级码双模型（V2.1）

#### 重构目标

将原有单表 InvitationCode 拆分为两个独立模型，解耦"账户注册"与"班级加入"两类完全不同的业务场景：

| 维度 | AccountCode（账户码） | ClassCode（班级码） |
|------|----------------------|---------------------|
| **用途** | 控制用户注册准入 | 学生加入班级 |
| **创建者** | ADMIN 管理员 | TEACHER 教师 |
| **状态** | ACTIVE / EXPIRED / REVOKED | 无状态（一直有效，可手动删除） |
| **有效期** | 支持 expiresAt，自动过期 | 无过期概念 |
| **关联** | 绑定注册用户（one-to-one） | 关联班级（many-to-one） |
| **使用次数** | 一次性（使用后绑定用户） | 可复用（多个学生使用同一码加入） |

#### 数据模型

**AccountCode（账户码）：**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (CUID) | 主键 |
| code | String (unique) | 账户码 |
| status | Enum: ACTIVE / EXPIRED / REVOKED | 状态 |
| role | Role (STUDENT / TEACHER) | 注册时授予的角色 |
| expiresAt | DateTime? | 过期时间 |
| createdById | String? | 创建者（ADMIN） |
| boundUser | User? (one-to-one) | 绑定的注册用户 |

**ClassCode（班级码）：**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (CUID) | 主键 |
| code | String (unique) | 班级邀请码 |
| classId | String | 关联班级 |
| createdById | String? | 创建者（TEACHER） |

#### 关键行为

**账户码过期机制：**
- 每次查询账户码列表时，自动检查 `expiresAt <= now()` 的 ACTIVE 码，批量标记为 EXPIRED
- 账户码过期后，已绑定的用户不受影响（仅阻止新用户使用该码注册）
- 支持"延期"操作：管理员可修改 expiresAt 延长有效期，同时自动将 EXPIRED → ACTIVE

**账户码吊销：**
- REVOKED 状态的码不可用于注册
- 已绑定用户的账户码被吊销后，用户下次请求时 `requireAuth` 会检测到并返回 401 "账户已失效"
- REVOKED 状态可延期恢复为 ACTIVE

**账户码删除：**
- 未被绑定的账户码可直接删除
- 已被用户绑定的账户码需先解绑用户才能删除

**班级码前缀：**
- 班级邀请码以 `CLASS-` 前缀开头，与账户码区分
- 学生输入邀请码加入班级时，前端可识别前缀自动路由到对应 API

#### API 端点

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/admin/account-codes` | 管理员查看账户码列表（含分页、状态筛选） | ADMIN |
| POST | `/api/admin/account-codes` | 管理员批量生成账户码 | ADMIN |
| PUT | `/api/admin/account-codes/[id]` | 延期 / 吊销账户码 | ADMIN |
| DELETE | `/api/admin/account-codes/[id]` | 删除未绑定的账户码 | ADMIN |
| GET | `/api/classes/[id]/codes` | 教师查看班级邀请码列表 | TEACHER (owner) |
| POST | `/api/classes/[id]/codes` | 教师生成班级邀请码 | TEACHER (owner) |
| DELETE | `/api/classes/[id]/codes` | 教师删除班级邀请码 | TEACHER (owner) |
| POST | `/api/classes/join` | 学生通过班级码加入班级 | STUDENT |

#### 非 ADMIN 用户账户码校验

`requireAuth` 中间件对非 ADMIN 用户强制检查账户码有效性：
- 用户必须绑定有效 AccountCode（`accountCodeId` 非空）
- AccountCode 状态不能为 REVOKED
- AccountCode 不能已过期

### Redis 安全基础设施升级（V2.2）

#### 概述

在已有 Redis（登录限流）基础上扩展两大安全能力：**JWT 登出黑名单**和**单终端登录**。

#### JWT 登出黑名单

```
用户点击退出
  │
  ├──► Redis SADD blacklist:${jti} = "1"
  │     └── TTL = JWT 剩余有效期（exp - iat）
  │
  └──► 后续任何请求携带该 token → requireAuth 检查 Redis
        └── 命中黑名单 → 401 "认证失败"
```

**实现要点：**
- 登出时后端将 token 加入 Redis Set `blacklist:{jti}`，TTL 设为 token 剩余有效期
- `requireAuth` 每次校验时先查 `blacklist:{jti}` 是否存在
- 黑名单过期后自动清除（无需手动管理）

#### 单终端登录（Session Version）

**核心原理：**
```
Redis: sessionVersion:{userId} = N (自增整数)

登录时:
  sv = redis.incr(sessionVersion:{userId})  // N+1
  JWT payload = { ..., sv: N+1 }

每次请求时:
  currentSv = redis.get(sessionVersion:{userId})  // 当前最新版本
  tokenSv = payload.sv ?? 0                        // token 中的版本
  if (currentSv && currentSv != tokenSv) → 401 "账号已在其他设备登录"
```

**关键设计决策：**
- 老 token 无 `sv` 字段时视为 `sv=0`，一律与 Redis 校验（不允许绕过）
- sessionVersion 永不过期，始终保留 Redis 中
- 退出登录时同样自增 sessionVersion（`incr`），使所有旧 token 失效

**登录 API 变更：**
- `POST /api/auth/login`：生成 JWT 时写入 `sv = await redis.incr(sessionVersion:{userId})`
- `POST /api/auth/logout`：自增 sessionVersion + 将当前 token 加入黑名单

**前端全局 401 拦截（`src/lib/api.ts`）：**
```
API 客户端封装 fetch
  ├── 自动附加 Authorization: Bearer <token>
  ├── 拦截 401 响应
  │   └── error === "账号已在其他设备登录"
  │       ├── 清除 localStorage token / user
  │       └── window.location.replace("/login?reason=kicked")
  └── 其他 4xx/5xx → throw Error 让调用方处理
```

**心跳检测（`src/app/dashboard/layout.tsx`）：**
- 每 30 秒调用 `GET /api/user/me` 检查 session 有效性
- 页面可见时运行，隐藏时暂停（`visibilitychange` 事件）
- bfcache 恢复时重新检查（`pageshow` 事件，`event.persisted === true`）

**登录页被踢提示：**
- URL 参数 `?reason=kicked` 时显示琥珀色提示横幅："账号已在其他设备登录，请重新登录"
- 使用 `location.replace()` 跳转（替换历史记录，防止返回键回到已失效页面）

#### 前端迁移

所有页面的 `fetch()` 调用逐步迁移到统一 API 客户端 `api.get/post/put/delete()`，自动享受全局 401 拦截能力。已迁移的关键页面：
- `src/app/dashboard/layout.tsx` — 用户信息 + 登出
- `src/app/dashboard/practice/page.tsx` — 刷题所有接口
- `src/app/dashboard/exams/page.tsx` — 考试列表
- `src/app/dashboard/leaderboard/page.tsx` — 排行榜
- `src/app/dashboard/checkin/page.tsx` — 签到打卡

---

### 数据统计页重构模块（V2.3）

#### 重构目标

当前统计页（`/dashboard/admin/stats`）仅展示 4 张基础卡片（总用户/总题目/总答题/正确率）+ 2 个分布进度条 + 近 7 日简易表格。缺少以下能力：

1. **指标维度不足**：无活跃用户、班级数、考试状态追踪、积分发放总额、商店兑换次数、抽奖次数、人均错题数等运营指标
2. **可视化缺失**：无趋势图、分布图、排行榜图表，数据解读效率低
3. **时间范围短**：仅展示近 7 日数据，无法洞察 30 天以上趋势
4. **无运维操作**：无法从统计页直接触发过期记录清理

V2.3 将统计页彻底重构为**运营仪表盘（Dashboard）**，新增 10+ 后端指标、8 张摘要卡片、6 张 recharts 图表，同时提供「清理过期记录」按钮联动系统设置。

#### 后端 API 重构

**路由：** `GET /api/admin/stats`（替换现有实现，ADMIN only）

**新增指标：**

| 指标 | 字段名 | 计算逻辑 |
|------|--------|----------|
| 活跃用户数 | activeUsers | 近 30 天内有答题记录的去重用户数（`AnswerRecord.userId` DISTINCT） |
| 班级总数 | totalClasses | `Class.count()` |
| 考试总数 | totalExams | `Task.count()` |
| 已完成考试数 | completedExams | `TaskSubmission.count({ status: COMPLETED })` |
| 待考数 | pendingExams | `TaskSubmission.count({ status: PENDING })` |
| 已逾期数 | overdueExams | `TaskSubmission.count({ status: OVERDUE })` |
| 积分发放总额 | totalPointsIssued | `PointLog.aggregate({ _sum: { points } })`，仅统计正数记录 |
| 商店兑换次数 | shopExchanges | `UserItem.count()` |
| 抽奖总次数 | lotteryCount | `PointLog.count({ reason: "lottery" })` |
| 人均错题数 | avgWrongPerUser | `WrongQuestion.aggregate({ _avg: { errorCount } })`，仅统计 ACTIVE 状态 |
| 错题分类 TOP10 | wrongByCategory | 按 `Question.categoryId` 分组统计 WrongQuestion（ACTIVE）的 errorCount 总和，取前 10 |
| 30天每日统计 | dailyStats | 近 30 天每日的答题数 + 新用户数（数组长度 30） |

**保留原有指标：**
- totalUsers、usersByRole（STUDENT/TEACHER/ADMIN）
- totalQuestions、questionsByType（CHOICE/FILL/JUDGE）
- totalAnswerRecords、correctRate

**API 响应结构（V2.3）：**

```json
{
  "totalUsers": 150,
  "usersByRole": { "STUDENT": 120, "TEACHER": 25, "ADMIN": 5 },
  "activeUsers": 98,
  "totalQuestions": 2000,
  "questionsByType": { "CHOICE": 1500, "FILL": 300, "JUDGE": 200 },
  "totalAnswerRecords": 15000,
  "correctRate": 72.5,
  "totalClasses": 8,
  "totalExams": 45,
  "completedExams": 38,
  "pendingExams": 5,
  "overdueExams": 2,
  "totalPointsIssued": 125000,
  "shopExchanges": 67,
  "lotteryCount": 234,
  "avgWrongPerUser": 4.2,
  "wrongByCategory": [
    { "categoryName": "计算机网络", "errorCount": 156 },
    { "categoryName": "数据结构", "errorCount": 132 }
  ],
  "dailyStats": [
    { "date": "2026-04-24", "answers": 320, "newUsers": 5 },
    { "date": "2026-05-23", "answers": 450, "newUsers": 8 }
  ]
}
```

**服务端实现要点：**
- `activeUsers`：对 `AnswerRecord` 按 `userId` 去重，`createdAt >= 30天前`
- `totalPointsIssued`：`PointLog` 中 `points > 0` 的记录求和（排除扣除/消费记录）
- `lotteryCount`：`PointLog` 中 `reason === "lottery"` 的条数（每次抽奖写入一条 reason=lottery 的扣款记录）
- `avgWrongPerUser`：统计 `WrongQuestion.status === ACTIVE` 的 `AVG(errorCount)`；若无数据返回 0
- `wrongByCategory`：通过 `Question.categoryId` JOIN 分组，`_sum: { errorCount }`，取 TOP 10
- `dailyStats`：循环 30 天，每日 `AnswerRecord` count + 新 `User` count（复用现有 7 天逻辑扩展为 30 天）

#### 清理过期记录 API

**路由：** `POST /api/admin/stats/cleanup`（ADMIN only）

**功能：** 根据系统设置 `answer_retention_days` 的值，删除 `createdAt` 早于 N 天前的 `AnswerRecord`。

**请求体：** 无（保留天数从 Setting 表读取）

**响应：**
```json
{
  "deletedCount": 1234,
  "retentionDays": 30,
  "message": "已清理 1234 条超过 30 天的答题记录"
}
```

**服务端逻辑：**
```
1. 从 Setting 表读取 answer_retention_days 值（默认 30）
2. 计算截止时间: cutoffDate = now() - retentionDays
3. 执行: DELETE FROM AnswerRecord WHERE createdAt < cutoffDate
4. 返回删除条数
5. Warning: 不删除对应的 WrongQuestion（WrongQuestion 有独立的 self-heal 机制）
```

#### 前端页面：运营仪表盘

**路由：** `/dashboard/admin/stats`（ADMIN only，替换现有页）

**页面布局（三行式）：**

```
┌──────────────────────────────────────────────────────────────────┐
│  数据统计                                     [清理过期记录]      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │活跃用户  │ │班级总数  │ │考试总数  │ │考试完成率│               │
│  │  98 人   │ │  8 个   │ │ 45 次   │ │ 84.4%  │               │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │积分发放  │ │商店兑换  │ │抽奖次数  │ │人均错题  │               │
│  │ 125000  │ │ 67 次   │ │ 234 次  │ │  4.2   │               │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐ ┌────────────────────────────────┐ │
│  │ 双Y轴折线图              │ │ 面积图                         │ │
│  │ (30天每日答题+新用户)     │ │ (30天累计趋势)                 │ │
│  │ 左Y: 答题数 右Y: 新用户  │ │ 答题总量/活跃用户累计           │ │
│  └──────────────────────────┘ └────────────────────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │ 环形图    │ │ 环形图    │ │ 环形图    │                        │
│  │用户角色   │ │考试状态   │ │错题状态   │                        │
│  │分布       │ │分布       │ │分布       │                        │
│  └──────────┘ └──────────┘ └──────────┘                        │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐ ┌────────────────────────────────┐ │
│  │ 柱状图                    │ │ 水平条形图                      │ │
│  │ 考试概览                  │ │ 错题分类 TOP10                  │ │
│  │ (总/已完成/待考/已逾期)    │ │ (按 errorCount 降序)            │ │
│  └──────────────────────────┘ └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

#### 8 张摘要卡片

| # | 卡片标题 | 数据字段 | 图标 | 描述行 |
|---|---------|---------|------|--------|
| 1 | 活跃用户 | activeUsers | Users | "近30天有答题的用户" |
| 2 | 班级总数 | totalClasses | School | "平台班级数量" |
| 3 | 考试总数 | totalExams | FileText | "已完成 {completedExams} / 待考 {pendingExams} / 逾期 {overdueExams}" |
| 4 | 考试完成率 | completedExams/totalExams | CheckCircle | "{completedExams}/{totalExams} 次已完成" |
| 5 | 积分发放 | totalPointsIssued | Coins | "平台累计发放积分" |
| 6 | 商店兑换 | shopExchanges | ShoppingBag | "用户称号兑换总次数" |
| 7 | 抽奖次数 | lotteryCount | Gift | "用户抽奖总次数" |
| 8 | 人均错题 | avgWrongPerUser | AlertTriangle | "活跃错题人均权重" |

**前端渲染模式（与现有卡片一致）：**
```tsx
const statCards = [
  { title: "活跃用户", value: stats.activeUsers, icon: Users, description: "近30天有答题的用户" },
  // ... 8 cards total
]
// grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 (2 rows x 4 cols)
```

#### 6 张 recharts 图表

**依赖：** `npm install recharts`（前端新增依赖）

**1. 双 Y 轴折线图（30 天趋势）**

- 数据源：`dailyStats`（30 天数组）
- X 轴：日期（`date`）
- 左 Y 轴：每日答题数（`answers`），柱状图（Bar）
- 右 Y 轴：每日新用户（`newUsers`），折线图（Line）
- recharts 组件：`<ComposedChart>` + `<Bar yAxisId="left">` + `<Line yAxisId="right">`

**2. 面积图（30 天累计趋势）**

- 数据源：`dailyStats`，前端计算每日累计值
- X 轴：日期
- Y 轴：累计答题数
- 填充渐变（`<linearGradient>` + `<Area>`）
- recharts 组件：`<AreaChart>` + `<Area type="monotone">` + `<CartesianGrid>` + `<Tooltip>`

**3. 环形图 x3（分布占比）**

- **环形图 A — 用户角色分布**
  - 数据源：`usersByRole`
  - 三项：STUDENT / TEACHER / ADMIN
  - 颜色：primary / secondary / destructive

- **环形图 B — 考试状态分布**
  - 数据源：`completedExams` / `pendingExams` / `overdueExams`
  - 三项：已完成 / 待考 / 已逾期
  - 颜色：green / yellow / red

- **环形图 C — 错题状态分布**
  - 新增查询：`WrongQuestion` 按 status 分组计数（ACTIVE vs COMPLETED）
  - 颜色：orange / emerald

- recharts 组件：`<PieChart>` + `<Pie innerRadius={60} outerRadius={80}>` + `<Cell>` + `<Legend>` + `<Tooltip>`
- 中心显示总数（自定义 label）

**4. 柱状图（考试概览）**

- 数据源：4 个值（总考试 / 已完成 / 待考 / 已逾期）
- X 轴：类别
- Y 轴：数量
- recharts 组件：`<BarChart>` + `<Bar>` + `<CartesianGrid>` + `<XAxis>` + `<YAxis>` + `<Tooltip>`

**5. 水平条形图（错题分类 TOP10）**

- 数据源：`wrongByCategory`（TOP 10 数组）
- Y 轴：分类名（categoryName），按 errorCount 降序
- X 轴：errorCount
- recharts 组件：`<BarChart layout="vertical">` + `<Bar>` + `<XAxis type="number">` + `<YAxis type="category" dataKey="categoryName">`

**图表响应式：**
- 所有图表外层容器 `width="100%"` + `height={300}`
- 使用 `<ResponsiveContainer>` 包裹每个图表
- 移动端（< 768px）：图表 width 100%，height 250，卡片和图表单列排列

#### 清理过期记录按钮

**位置：** 页面顶部标题行右侧（与「数据统计」标题同行）

**交互：**
```
[清理过期记录] 按钮
  │
  ├── 点击 → 弹出确认对话框
  │     标题："清理过期答题记录"
  │     内容："将删除 {retentionDays} 天前的所有答题记录，此操作不可撤销。当前保留天数为 {retentionDays} 天（可在系统设置中修改）。确定继续？"
  │     按钮：[取消] [确认清理]
  │
  ├── 确认 → 调用 POST /api/admin/stats/cleanup
  │     ├── 成功 → Toast 提示 "已清理 X 条超过 N 天的答题记录"
  │     │          自动刷新页面数据
  │     └── 失败 → Toast 提示 "清理失败: {error}"
  │
  └── 取消 → 关闭对话框
```

**UI 细节：**
- 按钮使用 `variant="outline"` + `destructive` 色调（橙色/红色边框）
- 图标：`<Trash2 className="h-4 w-4 mr-1" />`
- 读取系统设置：前端先调 GET `/api/admin/settings` 获取 `answer_retention_days` 值，用于对话框文案
- 清理完成后自动刷新统计数据和图表

#### 前端组件树

```
/dashboard/admin/stats/page.tsx
├── StatsHeader（标题 + 清理过期记录按钮）
├── SummaryCards（8 张卡片，2 行 x 4 列响应式网格）
├── ChartsRow1
│   ├── DualYAxisChart（双 Y 轴折线图：答题+新用户 30 天趋势）
│   └── AreaTrendChart（面积图：累计答题趋势）
├── ChartsRow2
│   ├── DonutChart（用户角色分布）
│   ├── DonutChart（考试状态分布）
│   └── DonutChart（错题状态分布）
├── ChartsRow3
│   ├── BarChart（考试概览：总数/已完成/待考/逾期）
│   └── HorizontalBarChart（错题分类 TOP10）
└── CleanupDialog（清理过期记录确认弹窗）
```

#### 响应式设计

| 断点 | 布局 |
|------|------|
| >= 1280px | 双列图表，4 列卡片 |
| >= 768px | 单列图表，2 列卡片 |
| < 768px | 单列图表，1 列卡片（堆叠） |

#### 与现有系统设置联动

- 清理过期记录按钮读取 `Setting.key === "answer_retention_days"` 确定保留天数
- 在确认对话框中展示当前保留天数
- 建议：清理操作本身也写入 PointLog 或专门的审计表（`reason: "admin_cleanup_answer_records"`），以便追溯

### 首页重设计模块（V2.4）

#### 重设计目标

当前首页文案平淡（"ExamMax 刷题平台"、"通过刷题练习和奖励激励提升学习效果"），缺乏品牌调性和视觉冲击力，无法在首屏给未登录用户留下印象。V2.4 将聚焦于**文案重构**和**动画效果**两个维度，提升首页质感。

#### 文案变更

| 位置 | 旧文案 | 新文案 |
|------|--------|--------|
| 浏览器 `<title>` | ExamMax 刷题平台 | ExamMax |
| 页面 H1 | ExamMax 刷题平台 | ExamMax |
| 副标题 `<p>` | 通过刷题练习和奖励激励提升学习效果 | 不刷题的学生不是好卷王 |
| meta description | 通过刷题练习和奖励激励提升学习效果 | 不刷题的学生不是好卷王 |

#### 动画方案

**技术选型：** framer-motion（需 `npm install framer-motion`）

**入场动画：**
- 标题从下往上 stagger 依次淡入（`variants` + `initial="hidden"` + `animate="visible"`）
- 交错延迟：标题 → 副标题（delay 0.15s）→ 按钮组（delay 0.3s）
- 使用 `spring` 缓动（`type: "spring", stiffness: 100, damping: 15`）

**持续微动：**
- 标题有微弱的 scale 脉冲（`animate={{ scale: [1, 1.02, 1] }}`，周期 ~3s，`repeat: Infinity`）
- 按钮 hover 时有弹性缩放效果（`whileHover={{ scale: 1.05 }}` + `whileTap={{ scale: 0.97 }}`）

#### 布局

保持极简居中竖向排列（与现有布局一致），不加功能卖点卡片。用户首次到达首页看到标题动画 → 副标题 → 按钮，三要素干净利落地引导注册/登录。

#### 涉及文件

| 文件 | 改动 |
|------|------|
| `src/app/layout.tsx` | 修改 metadata title 和 description |
| `src/app/page.tsx` | 重写为 framer-motion 动画客户端组件（`"use client"`），替换文案 |

#### 依赖

- `framer-motion` — 前端动画库，需新增 npm 依赖
- 无后端 API 变更

#### 风险

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| framer-motion SSR 报错 | Low | Low | Page 组件为 `"use client"`，layout 中 metadata 为静态导出，无 SSR 风险 |
| 动画在低端设备卡顿 | Low | Low | framer-motion 使用 GPU 加速的 transform/opacity，性能开销小 |

---

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
I want 通过签到和考试获得积分与经验值,
so that 我能看到自己的成长并获得商城消费货币。

积分获取规则:
- 签到: min(5 + (连续天数-1) × 5, 50)
- 单题练习: 0
- 考试: 正确题数 × 5，全对 × 2

经验值获取规则:
- 签到: 10/天（固定）
- 单题练习: 0
- 考试: 100 + 正确题数 × 10

升级公式:
- 升至下一级所需经验 = 100 × 当前等级
- 判断: 每次获得经验后，当前经验 >= 100 × 当前等级 → 升级

积分消费:
- 商城兑换（称号）
- 抽奖（50积分/次）

Acceptance Criteria:
- [ ] Given 用户签到, Then 获得积分 min(5+(连续-1)×5, 50) 和经验 10
- [ ] Given 用户参加考试, Then 获得积分 正确数×5（全对×2）和经验 100+正确数×10
- [ ] Given 单题练习, Then 不获得积分或经验
- [ ] Given 经验达到升级门槛, Then 自动升级
- [ ] Given 用户查看主页, Then 显示积分、经验值、等级
```

**US-08: 连续打卡签到**
```
As a 用户,
I want 每天签到获得奖励,
so that 我能保持刷题习惯。

积分公式: min(5 + (连续天数-1) × 5, 50)，即第1天5分，第2天10分，...，第10天起封顶50分
经验值: 固定10/天（与积分独立计算）

Acceptance Criteria:
- [ ] Given 用户点击签到, Then 获得积分（5起递增，50封顶）+ 经验10
- [ ] Given 用户已签到, Then 显示"今日已签到"
- [ ] Given 签到页面, Then 显示连续签到天数
- [ ] Given 前天签到但昨天未签到, Then 连续天数重置为1
```

**US-09: 徽章/成就系统**
```
As a 用户,
I want 通过完成成就自动获得徽章,
so that 我能展示自己的刷题成就。

徽章列表（7个，触发时机为每次答题后自动检查授予）:

| 徽章名 | 条件 | 说明 |
|--------|------|------|
| 我上我也行 | 完成 1 题 | 完成第一道题目 |
| 扶我起来还能再刷 | 累计 10 题 | 累计答题10道 |
| 键盘冒烟了 | 累计 100 题 | 累计答题100道 |
| 难道我真的这么废柴吗？ | 正确率 ≥ 20% | 答题正确率达到20% |
| 好像有点东西 | 正确率 ≥ 50% | 答题正确率达到50% |
| 出题老师你过来一下 | 正确率 ≥ 90% | 答题正确率达到90% |
| 对王之王 | 累计答对 50 题 | 累计答对50道题 |

装备规则:
- 最多同时装备 1 个徽章
- 鼠标悬停徽章图标时显示徽章名称

Acceptance Criteria:
- [ ] Given 用户答题后满足条件, Then 自动授予对应徽章（如未获得过）
- [ ] Given 用户查看成就页, Then 显示所有徽章及获得状态
- [ ] Given 用户获得徽章, Then 可在个人主页装备（最多1个）
- [ ] Given 已装备的徽章, Then 在排行榜和个人资料上显示图标
```

**US-10: 排行榜**
```
As a 用户,
I want 查看刷题和考试的排行榜,
so that 我能了解自己和他人的排名。

规则:
- 仅统计学生用户（教师和管理员不计入）
- 按正确率降序排列
- 排行榜是展示勋章和称号的唯一位置

结构:
├── 刷题排行榜
│   ├── 个人排行（正确率降序，显示用户所属班级）
│   └── 班级排行（班级平均正确率降序）
└── 考试排行榜
    ├── 个人排行（正确率降序，显示用户所属班级）
    └── 班级排行（班级平均正确率降序）

用户条目展示顺序: 用户名 → 勋章/称号（按用户在个人主页设置的展示顺序）

Acceptance Criteria:
- [ ] Given 排行榜, Then 分刷题/考试两个 Tab
- [ ] Given 每个 Tab, Then 分个人排行/班级排行两个子 Tab
- [ ] Given 个人排行, Then 显示用户名、所属班级、勋章、称号、正确率
- [ ] Given 班级排行, Then 显示班级名、平均正确率、人数
- [ ] Given 排行榜, Then 不显示教师和管理员
- [ ] Given 勋章/称号展示顺序, Then 按用户在个人主页设置的顺序显示
```

**US-11: 虚拟商店**
```
As a 用户,
I want 用积分兑换称号,
so that 我能展示个性。

常驻商城称号:

| 称号 | 价格 |
|------|------|
| 哈基米 | 200 |
| 我的刀盾 | 300 |
| 比比拉布 | 400 |
| 咕咕嘎嘎 | 500 |
| 古希腊掌管摆烂的神 | 800 |
| 尊嘟假嘟 | 1000 |

Acceptance Criteria:
- [ ] Given 用户进入商店, Then 显示可兑换称号和价格
- [ ] Given 用户积分足够且未拥有, Then 可兑换
- [ ] Given 用户已拥有, Then 显示"已拥有"
- [ ] Given 用户兑换成功, Then 扣除积分并增加称号
```

**US-12: 个人主页管理**
```
As a 用户，
I want 管理个人资料和展示偏好，
so that 我能自定义个人主页和排行榜上的展示效果。

功能:
- 展示用户名
- 修改用户名
- 修改密码（需验证旧密码）
- 设置勋章/称号展示顺序（排行榜唯一展示勋章和称号的位置）

数据模型新增字段:
- User.showBadgeFirst: Boolean（默认 true，勋章在称号前）

Acceptance Criteria:
- [ ] Given 个人主页, Then 显示用户名、等级、积分、经验、打卡天数
- [ ] Given 修改用户名, Then 点击编辑按钮，输入新用户名保存
- [ ] Given 修改密码, Then 输入旧密码 + 新密码，验证后更新
- [ ] Given 展示顺序设置, Then 选择"勋章在前"或"称号在前"
- [ ] Given 设置保存, Then 排行榜立即反映新的展示顺序
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

**US-15: 抽奖系统**
```
As a 用户,
I want 用积分抽奖获得随机奖励,
so that 我能体验抽奖的刺激和乐趣。

规则:
- 单抽价格: 50 积分
- 保底: 30 抽必出金色传说
- 稀有度分层:

| 稀有度 | 概率 | 奖品 |
|--------|------|------|
| 经典时尚小垃圾 | ~68% | 积分红包 5/10、经验包 10/20 |
| 好像有点用 | ~28% | 经验包 100/200、积分红包 50/100 |
| 金色传说 | ~2% | 限定称号（仅抽奖获得） |
| 谢谢参与 | ~2% | 无 |

限定称号（仅抽奖掉落）:
- 命运的齿轮开始转动
- 被选召的孩子
- 此号已开光
- 服务器の守護神

Acceptance Criteria:
- [ ] Given 用户进入抽奖页, Then 显示抽奖按钮和剩余积分
- [ ] Given 用户积分 >= 50, Then 可点击抽奖
- [ ] Given 抽奖结果, Then 显示动画和奖励内容
- [ ] Given 30抽未出金色传说, Then 第30抽保底出金色传说
- [ ] Given 积分不足, Then 提示积分不够
```

**US-15b: 管理后台 -- 称号管理**
```
As a 管理员,
I want 自定义添加/管理称号,
so that 我能灵活配置商城和奖池内容。

Acceptance Criteria:
- [ ] Given 管理员进入称号管理, Then 显示称号列表（名称、类型、价格、所属池）
- [ ] Given 管理员新建称号, Then 输入名称、图标、选择放入商城或限定奖池
- [ ] Given 商城称号, Then 需设置价格
- [ ] Given 限定奖池称号, Then 无需价格，仅通过抽奖获得
- [ ] Given 管理员编辑/删除称号, Then 支持修改和删除
```

**US-15: 管理后台 -- 数据统计（V2.3 已重构，本 US 已被 US-43 至 US-50 替代）**
```
As a 管理员,
I want 查看平台数据统计,
so that 我能了解运营状况。

Acceptance Criteria:
- [ ] Given 管理员进入统计页, Then 显示核心指标和可视化图表（详见 US-43 至 US-50）
```

#### P1 -- Should Have（错题回顾模块 V1.5）

**US-16: 错题列表与权重追踪**
```
As a 用户,
I want 查看我的错题列表（按错误次数排序），区分待攻克和已攻克,
so that 我能集中精力攻克最容易出错的题目。

Acceptance Criteria:
- [ ] Given 用户进入错题回顾页, When 页面加载, Then 默认显示"待攻克"Tab，按 errorCount 降序
- [ ] Given 错题列表, Then 每张卡片显示：题目内容（截断）、分类、errorCount、最近错误答案
- [ ] Given 用户点击"已攻克"Tab, Then 显示 errorCount=0 的题目，按 completedAt 降序
- [ ] Given 空错题列表, Then 显示"暂无错题，继续保持！"提示
```

**US-17: Fire-and-Forget 错题更新**
```
As a 系统,
I want 在练习模块答题后自动更新 WrongQuestion 状态,
so that 练习模块无需修改代码即可对接错题系统。

Acceptance Criteria:
- [ ] Given 用户在练习中提交答案, When 前端收到答题结果, Then 以 fire-and-forget 方式调用 POST /api/wrong-questions
- [ ] Given 答错, When POST 到达, Then errorCount += 1，wrongAnswers FIFO 入队（保留最近5条）
- [ ] Given 答对, When POST 到达, Then errorCount -= 1
- [ ] Given errorCount 降为 0, Then status 自动变为 COMPLETED，记录 completedAt
- [ ] Given COMPLETED 题目再次答错, Then status 恢复为 ACTIVE
- [ ] Given 接口调用失败, Then 不影响练习流程（fire-and-forget 静默失败）
```

**US-18: 错题重做**
```
As a 用户,
I want 从错题列表中点击"重做"进入答题流程,
so that 我能集中练习错题直到掌握。

Acceptance Criteria:
- [ ] Given 错题卡片, When 点击"重做"按钮, Then 调用 GET /api/wrong-questions/practice 获取错题数据
- [ ] Given 重做模式, Then 以逐题答题方式呈现（复用现有练习逻辑或独立组件）
- [ ] Given 重做完成, Then 调用 POST /api/wrong-questions 更新错题状态
- [ ] Given 分类筛选已选中, Then 重做仅包含该分类的错题
```

**US-19: 错题榜 Top 20**
```
As a 用户,
I want 在错题回顾页右侧看到我错得最多的 20 道题,
so that 我能直观了解哪些题目是我最大的薄弱点。

Acceptance Criteria:
- [ ] Given 错题回顾页, Then 右侧固定显示错题榜（取 ACTIVE 状态 errorCount 前 20）
- [ ] Given 错题榜, Then 每项显示：排名、题目前30字符、分类、错误次数
- [ ] Given 用户选择分类筛选, Then 错题榜同步过滤为该分类下的 Top 20
- [ ] Given 错题榜列表, Then 不显示 errorCount=0 的已攻克题目
```

**US-20: 分类筛选联动**
```
As a 用户,
I want 按分类筛选错题列表和错题榜,
so that 我能聚焦特定分类的薄弱环节。

Acceptance Criteria:
- [ ] Given 错题回顾页顶部, Then 显示分类下拉筛选器
- [ ] Given 用户选择分类, Then 左侧列表和右侧错题榜同时按该分类过滤
- [ ] Given 选择"全部分类", Then 显示所有分类的错题
```

**US-21: 系统设置页（ADMIN）**
```
As a 管理员,
I want 在后台管理界面配置系统参数,
so that 我能灵活调整答题记录保留天数等运维参数。

Acceptance Criteria:
- [ ] Given 管理员进入 /dashboard/admin/settings, Then 显示配置项列表（key、label、当前值、控件）
- [ ] Given NUMBER 类型配置, Then 渲染数字输入框
- [ ] Given BOOLEAN 类型配置, Then 渲染开关 toggle
- [ ] Given STRING 类型配置, Then 渲染文本输入框
- [ ] Given 管理员修改配置, When 点击保存, Then 批量更新所有变更项
- [ ] Given 非 ADMIN 用户, When 访问该页面, Then 返回 403
```

**US-22: 自愈机制**
```
As a 系统,
I want 提供 self-heal 端点从 AnswerRecord 重建 WrongQuestion 数据,
so that 在数据不一致或初次上线时可以修复错题数据。

Acceptance Criteria:
- [ ] Given POST /api/wrong-questions/self-heal, Then 遍历当前用户所有 AnswerRecord
- [ ] Given 按 questionId 分组统计, Then 正确计算每题的 errorCount（错误次数）
- [ ] Given wrongAnswers 收集, Then 取最近 5 次错误答案（按时间倒序）
- [ ] Given Upsert 完成, Then 根据 answer_retention_days 清理过期 AnswerRecord
- [ ] Given 自愈完成, Then 返回修复统计：创建数、更新数、清理数
```

#### P0 -- Must Have（师生交互考试 V1.6）

**US-23: 教师班级管理**
```
As a 教师,
I want 创建、编辑、删除班级,
so that 我能将学生分组管理，方便后续布置考试。

Acceptance Criteria:
- [ ] Given 教师进入 /dashboard/teacher/classes, Then 显示班级列表（名称、人数、创建时间）
- [ ] Given 教师点击"创建班级", Then 弹出表单（班级名称、描述）
- [ ] Given 创建完成, Then 自动生成班级邀请码（可复制分享）
- [ ] Given 教师点击班级, Then 显示成员列表（头像/姓名、加入时间）
- [ ] Given 教师点击"编辑", Then 可修改班级名称和描述
- [ ] Given 教师点击"删除", When 班级有未结束的考试, Then 提示不允许删除
```

**US-24: 学生加入班级**
```
As a 学生,
I want 输入班级邀请码加入班级,
so that 我能参加教师发布的考试。

Acceptance Criteria:
- [ ] Given 学生进入加入班级页面, When 输入有效邀请码, Then 加入成功并显示班级名称
- [ ] Given 邀请码无效/已过期/已使用, Then 显示对应错误提示
- [ ] Given 学生已在班级中, Then 提示"你已是该班级成员"
- [ ] Given 加入成功, Then 学生考试列表自动出现该班级的考试
```

**US-25: 教师创建考试**
```
As a 教师,
I want 选择班级、挑选题目、配置考试参数后发布考试,
so that 我能组织一场正式考试。

Acceptance Criteria:
- [ ] Given 教师进入 /dashboard/teacher/exams, When 点击"创建考试", Then 进入考试创建流程
- [ ] Given Step 1, Then 选择目标班级（单选下拉）
- [ ] Given Step 2, Then 从题库中多选题目（支持按分类筛选、搜索、题目预览），确认后进入配置页
- [ ] Given Step 3, Then 配置：考试标题、说明、截止时间、题目顺序（保持手动/随机打乱）、每题时限（秒，可空）、最大切屏次数（默认3）
- [ ] Given 配置完成, When 点击"发布", Then 为全班所有学生创建 TaskSubmission，返回考试详情
- [ ] Given 创建成功, Then 学生端考试列表出现"待考"项
```

**US-26: 教师编辑/删除考试**
```
As a 教师,
I want 编辑或删除未开始的考试,
so that 我能修正考试配置或取消不需要的考试。

Acceptance Criteria:
- [ ] Given 考试状态为 PENDING（无学生提交）, Then 显示编辑和删除按钮
- [ ] Given 教师点击"编辑", Then 可修改标题、说明、截止时间、题目列表、配置参数
- [ ] Given 教师点击"删除", Then 弹出确认对话框，确认后删除 Task 及所有 TaskSubmission
- [ ] Given 已有学生提交, Then 隐藏编辑和删除按钮（不可操作）
```

**US-27: 学生考试列表**
```
As a 学生,
I want 查看我的考试列表（按待考/已考/已逾期分类）,
so that 我能清楚了解哪些考试需要参加、哪些已完成、哪些已错过。

Acceptance Criteria:
- [ ] Given 学生进入 /dashboard/exams, Then 显示三个 Tab：待考/已考/已逾期
- [ ] Given "待考" Tab, Then 显示状态=PENDING 且未逾期的考试（标题、班级、截止时间、题数、倒计时）
- [ ] Given "已考" Tab, Then 显示已提交的考试（标题、班级、得分、提交时间）
- [ ] Given "已逾期" Tab, Then 显示已过截止时间但未提交的考试（标记为"已逾期"）
- [ ] Given 超过截止时间, Then 自动更新状态为 OVERDUE
```

**US-28: 学生参加考试（防作弊作答）**
```
As a 学生,
I want 在全屏防作弊环境下逐题作答,
so that 我能公平地完成考试。

Acceptance Criteria:
- [ ] Given 学生点击"开始考试", When 浏览器支持 Fullscreen API, Then 请求全屏
- [ ] Given 拒绝全屏, Then 不允许开始考试，提示"考试需要全屏模式"
- [ ] Given 进入作答界面, Then 显示题号（N/总数）、题目内容、选项、每题倒计时（若配置）
- [ ] Given 每题独立倒计时, When 切到下一题, Then 暂停当前计时、恢复/启动下一题计时
- [ ] Given 每题时限到, Then 锁定当前题（不可再修改答案），自动跳到下一题
- [ ] Given 切屏（切换标签页/窗口失焦）, Then 记录切屏（+1），显示警告"你已切换屏幕 X/最大N 次"
- [ ] Given 切屏次数 >= maxTabSwitches, Then 自动交卷，提示"已超过切屏限制，考试结束"
- [ ] Given 最后一题时限到 或 超切屏限制, Then 自动交卷
- [ ] Given 截止时间到, Then 自动交卷
- [ ] Given 页面刷新, Then 恢复计时状态和已选答案（localStorage 快照）
```

**US-29: 学生交卷与成绩展示**
```
As a 学生,
I want 交卷后立即看到成绩和正确答案,
so that 我能知道自己的考试表现和错题解析。

Acceptance Criteria:
- [ ] Given 学生点击"交卷", Then 弹出确认弹窗："确定要交卷吗？已答 X/总数 题"
- [ ] Given 确认交卷, Then 提交答案 + 切屏日志 + 每题用时到 API
- [ ] Given 提交成功, Then 清除 localStorage 计时快照，退出全屏
- [ ] Given 跳转结果页, Then 显示：总分（正确数/总题数）、正确率
- [ ] Given 结果页题目列表, Then 逐题显示：题目、你的答案、正确答案、解析、用时
- [ ] Given 答错的题, Then 高亮标记，并 fire-and-forget 写入 WrongQuestion
- [ ] Given 结果页, Then 显示切屏次数（如有切屏）
```

**US-30: 教师查看考试成绩**
```
As a 教师,
I want 查看某场考试的所有学生成绩和统计,
so that 我能了解全班整体情况和每个学生的薄弱环节。

Acceptance Criteria:
- [ ] Given 教师进入 /dashboard/teacher/exams/[id]/results, Then 显示顶部统计卡片
- [ ] Given 统计卡片, Then 显示：应参加人数、实际完成人数、全班平均正确率
- [ ] Given 每题正确率分布, Then 柱状图或列表展示每道题的全班正确率
- [ ] Given 学生列表, Then 按正确率降序排列：姓名、状态、正确数/总数、切屏次数、交卷时间
- [ ] Given 点击学生行展开, Then 显示逐题答题详情（题目、答案、是否正确、用时）
- [ ] Given 展开详情, Then 显示切屏日志时间线（{时间, 失焦时长}）
- [ ] Given 非该考试创建者, Then 返回 403
```

#### P1 -- Should Have（师生交互考试 V1.6）

**US-31: 班级成员管理（手动添加/移除）**
```
As a 教师,
I want 手动添加或移除班级成员,
so that 我能灵活管理班级学生。

Acceptance Criteria:
- [ ] Given 教师进入班级成员列表, Then 显示"添加学生"按钮
- [ ] Given 点击"添加学生", Then 弹出搜索框（按用户名搜索）+ 添加按钮
- [ ] Given 成员列表每行, Then 显示"移除"按钮
- [ ] Given 点击"移除", Then 弹出确认对话框，确认后移除
- [ ] Given 学生被移除班级, Then 该班级的未完成考试 TaskSubmission 仍保留（不自动删除）
```

**US-32: 班级邀请码管理**
```
As a 教师,
I want 管理班级的邀请码（生成新码、查看列表、撤销旧码）,
so that 我能安全地控制学生加入班级。

Acceptance Criteria:
- [ ] Given 教师进入班级详情, Then 显示邀请码列表（码、状态、生成时间、使用者）
- [ ] Given 教师点击"生成新邀请码", Then 创建新的 UNUSED 邀请码（关联 classId）
- [ ] Given 教师点击"撤销", Then 将该邀请码状态改为 REVOKED
- [ ] Given 邀请码已使用, Then 不可撤销
```

**US-33: 教师题目预览与选择优化**
```
As a 教师,
I want 在创建考试时高效地浏览和选择题目,
so that 我能快速从大量题库中选出合适的题目。

Acceptance Criteria:
- [ ] Given 选题界面, Then 支持按分类筛选、关键词搜索、难度筛选
- [ ] Given 题目卡片, Then 显示题目内容（截断）、分类、难度、答案（可隐藏）
- [ ] Given 已选题目列表, Then 显示已选题数和题目摘要
- [ ] Given 支持拖拽排序, When questionOrder="manual", Then 按拖拽顺序保存
- [ ] Given 大量题目（1000+）, Then 分页加载（每页 50 条）
```

**US-34: 考试倒计时与提醒**
```
As a 学生,
I want 在考试列表看到距离截止时间的倒计时,
so that 我不会错过考试截止时间。

Acceptance Criteria:
- [ ] Given "待考" Tab, Then 每个考试卡片显示截止时间倒计时（天/时/分）
- [ ] Given 距离截止 < 1 小时, Then 倒计时高亮（红色/闪烁）
- [ ] Given 距离截止 < 24 小时, Then 倒计时黄色警告
```

#### P0 -- Must Have（用户管理重构 V2.0）

**US-35: 抽屉式用户操控面板**
```
As a 管理员,
I want 点击用户列表中的某一行后在右侧展开抽屉操控面板,
so that 我能在不离开列表页的情况下集中管理该用户的所有属性和资产。

Acceptance Criteria:
- [ ] Given 管理员进入 /dashboard/admin/users, When 点击任意用户行, Then 右侧滑入抽屉面板
- [ ] Given 抽屉面板, Then 显示用户基本信息（用户名、角色、注册时间）
- [ ] Given 抽屉面板, Then 显示密码管理区域
- [ ] Given 抽屉面板, Then 显示积分/经验/等级调整区域（默认增量模式）
- [ ] Given 抽屉面板, Then 显示徽章管理区域（已有徽章 + 发放下拉）
- [ ] Given 抽屉面板, Then 显示称号管理区域（已有称号 + 当前标记 + 操作按钮）
- [ ] Given 抽屉面板, When 点击 X 或点击遮罩层, Then 抽屉关闭
- [ ] Given 抽屉面板打开, When 点击另一个用户行, Then 抽屉内容切换为该用户数据
```

**US-36: 用户名与角色编辑**
```
As a 管理员,
I want 在抽屉面板中直接编辑用户名和切换角色,
so that 我能快速修正用户基本信息。

Acceptance Criteria:
- [ ] Given 抽屉面板, When 修改用户名并点击保存, Then 调用 PATCH /api/admin/users/[id] 更新
- [ ] Given 用户名已被占用, Then 显示错误"用户名已被占用"
- [ ] Given 角色下拉, Then 仅显示 STUDENT 和 TEACHER 两个选项（不包含 ADMIN）
- [ ] Given 管理员修改角色为 TEACHER, Then 用户权限立即生效
- [ ] Given 管理员修改自己的角色, Then 后端拒绝并返回错误
- [ ] Given 角色修改成功, Then Toast 提示"用户信息已更新"
```

**US-37: 管理员覆盖用户密码**
```
As a 管理员,
I want 在抽屉中输入新密码并直接覆盖用户密码,
so that 我能帮助忘记密码的用户重置登录凭证。

Acceptance Criteria:
- [ ] Given 抽屉密码区域, When 输入新密码（>=6位）并点击"覆盖密码", Then 调用 PUT /api/admin/users/[id]/password 更新
- [ ] Given 密码长度 < 6, Then 前端提示"密码至少6位"，不发送请求
- [ ] Given 覆盖成功, Then Toast 提示"密码已覆盖"
- [ ] Given 覆盖成功, Then 密码输入框清空
- [ ] Given 无需验证旧密码, Then 管理员直接覆盖特权生效
```

**US-38: 积分 / 经验 / 等级调整（覆盖 / 增量双模式）**
```
As a 管理员,
I want 通过覆盖或增量模式调整用户的积分、经验值和等级,
so that 我能灵活处理用户数值（如补偿错误扣除、手动奖励、修正异常等级）。

Acceptance Criteria:
- [ ] Given 每个数值区域, Then 默认选中"增量模式"，显示 +/- 输入框
- [ ] Given 切换为"覆盖模式", Then 显示绝对值输入框和当前值对比
- [ ] Given 积分增量模式, When 输入 +50 并确认, Then 调用 PATCH /api/admin/users/[id]/points (mode=add, value=50)
- [ ] Given 积分覆盖模式, When 输入 500 并确认, Then 调用 PATCH /api/admin/users/[id]/points (mode=set, value=500)
- [ ] Given 经验调整, Then 类似积分，调用 PATCH /api/admin/users/[id]/experience
- [ ] Given 经验调整后, Then 等级自动重新计算（experience / 100 + 1）
- [ ] Given 等级覆盖模式, When 输入 10 并确认, Then experience 设为 900（(level-1)*100），调用 PATCH /api/admin/users/[id]/experience (mode=set, value=900)
- [ ] Given 结果 < 0, Then 后端截断为 0（积分/经验）或 1（等级）
- [ ] Given 调整成功, Then PointLog 写入审计记录（reason: admin_manual_adjustment）
- [ ] Given 调整成功, Then Toast 显示调整前后的数值变化
```

**US-39: 徽章发放与删除**
```
As a 管理员,
I want 从抽屉面板中给用户发放新徽章或删除已有徽章,
so that 我能手动管理用户的徽章资产。

Acceptance Criteria:
- [ ] Given 抽屉徽章区域, Then 显示用户已有徽章列表（徽章名称 + 删除按钮）
- [ ] Given 徽章列表为空, Then 显示"该用户暂无徽章"
- [ ] Given 发放下拉框, Then 列出该用户尚未拥有的所有徽章
- [ ] Given 选择徽章并点击"发放", Then 调用 POST /api/admin/users/[id]/badges (badgeId)
- [ ] Given 用户已拥有该徽章, Then 该徽章不出现在下拉框（数据库唯一约束防重）
- [ ] Given 发放成功, Then 已有徽章列表自动更新，Toast 提示"徽章已发放"
- [ ] Given 点击已有徽章的删除按钮, Then 弹出确认"确认删除该徽章？若该徽章正在装备中，将自动取消装备"
- [ ] Given 确认删除, Then 调用 DELETE /api/admin/users/[id]/badges (badgeId)
- [ ] Given 删除成功, Then 徽章列表自动更新，Toast 提示"徽章已移除"
```

**US-40: 称号设置与取消**
```
As a 管理员,
I want 查看用户拥有的称号列表并能设置或取消当前使用称号,
so that 我能管理用户在排行榜和个人主页上展示的称号。

Acceptance Criteria:
- [ ] Given 抽屉称号区域, Then 显示用户拥有的所有称号（名称 + 当前标记 + 操作按钮）
- [ ] Given 用户无称号, Then 显示"该用户暂无称号"
- [ ] Given 当前有 activeTitleId, Then 该称号行显示 ● 标记和"取消使用"按钮
- [ ] Given 点击"设为当前", Then 调用 PUT /api/admin/users/[id]/title (titleId)
- [ ] Given 设置成功, Then 该称号标记为 ● 当前使用，其他称号显示"设为当前"按钮
- [ ] Given 点击"取消使用", Then 调用 DELETE /api/admin/users/[id]/title
- [ ] Given 取消成功, Then 所有称号的 ● 标记消失，均显示"设为当前"按钮
- [ ] Given 称号对应的 ShopItem type 不是 TITLE, Then 后端拒绝
- [ ] Given 用户未拥有该称号, Then 后端拒绝设置
```

**US-41: 单管理员约束保护**
```
As a 系统,
I want 从所有写入路径阻止 ADMIN 角色的创建或分配,
so that 全局永远只有一位管理员。

Acceptance Criteria:
- [ ] Given 任何 API, When 请求体包含 role=ADMIN, Then 返回 400 "不允许分配管理员角色"
- [ ] Given PATCH /api/admin/users/[id], When 目标用户是 admin 且请求修改角色, Then 返回 403 "不允许修改管理员的角色"
- [ ] Given 邀请码注册, When 邀请码 role=ADMIN, Then 注册失败
- [ ] Given 教师创建班级邀请码, When 尝试设置 role=ADMIN, Then 返回错误
- [ ] Given 管理员自身尝试通过 API 改角色, Then 返回 403
- [ ] Given 前端角色下拉, Then 永远不包含 ADMIN 选项
```

**US-42: 旧 PATCH /api/admin/users 端点废弃**
```
As a 系统,
I want 用 7 条新 API 替代现有的角色批量修改端点,
so that 每个用户管理操作都有独立、可审计、幂等的 API 路径。

Acceptance Criteria:
- [ ] Given 现有 PATCH /api/admin/users (批量角色修改), Then 标记为 deprecated
- [ ] Given 7 条新 API 全部上线并验证通过, Then 移除旧 PATCH /api/admin/users 端点
- [ ] Given 迁移期间, Then 旧端点保留但前端不再调用
- [ ] Given 新 API 路径结构 /api/admin/users/[id]/*, Then 所有端点均需 ADMIN 认证
```

#### P0 -- Must Have（数据统计重构 V2.3）

**US-43: 运营仪表盘摘要卡片**
```
As a 管理员,
I want 在统计页顶部看到 8 张摘要卡片覆盖核心运营指标,
so that 我能一屏了解平台整体运营状况。

Acceptance Criteria:
- [ ] Given 管理员进入 /dashboard/admin/stats, Then 顶部显示 2 行 x 4 列卡片网格
- [ ] Given 卡片 1-4, Then 分别显示：活跃用户（activeUsers + "近30天有答题的用户"）、班级总数（totalClasses + "平台班级数量"）、考试总数（totalExams + "已完成X / 待考Y / 逾期Z"）、考试完成率（百分比 + "X/Y次已完成"）
- [ ] Given 卡片 5-8, Then 分别显示：积分发放（totalPointsIssued + "平台累计发放积分"）、商店兑换（shopExchanges + "用户称号兑换总次数"）、抽奖次数（lotteryCount + "用户抽奖总次数"）、人均错题（avgWrongPerUser + "活跃错题人均权重"）
- [ ] Given 数据加载中, Then 卡片显示骨架屏（skeleton）占位
- [ ] Given API 返回错误, Then 显示错误提示并保留上一次成功数据
- [ ] Given 响应式, Then >=1024px 4列、>=768px 2列、<768px 1列
```

**US-44: 双Y轴折线图 — 30天每日趋势**
```
As a 管理员,
I want 在一个图表中同时查看近30天每日答题数（柱状图）和新注册用户数（折线图）,
so that 我能对比答题活跃度和用户增长趋势。

Acceptance Criteria:
- [ ] Given 统计页第二行左侧, Then 渲染双Y轴折线图
- [ ] Given 左Y轴, Then 显示每日答题数（Bar），刻度自动适配
- [ ] Given 右Y轴, Then 显示每日新用户数（Line），刻度自动适配
- [ ] Given X轴, Then 显示 30 天日期（MM-DD 格式），自动间隔避免重叠
- [ ] Given hover 数据点, Then Tooltip 显示日期、答题数、新用户数
- [ ] Given 数据为空, Then 显示"暂无数据"空状态占位
- [ ] Given 移动端, Then 图表 height 250px，单列全宽
```

**US-45: 面积图 — 30天累计趋势**
```
As a 管理员,
I want 查看近30天累计答题数的面积填充趋势图,
so that 我能直观感受平台答题总量的增长态势。

Acceptance Criteria:
- [ ] Given 统计页第二行右侧, Then 渲染面积图（AreaChart）
- [ ] Given 面积图, Then X轴为日期、Y轴为累计答题数、填充渐变色（primary tone）
- [ ] Given hover, Then Tooltip 显示日期和当日累计值
- [ ] Given 数据源 dailyStats, Then 前端计算累计值（cumulative sum）
- [ ] Given 数据为空, Then 显示"暂无数据"
```

**US-46: 三个环形图 — 用户角色 / 考试状态 / 错题状态分布**
```
As a 管理员,
I want 通过三个环形图查看用户角色分布、考试状态分布和错题状态分布,
so that 我能快速感知各维度的占比结构。

Acceptance Criteria:
- [ ] Given 统计页第三行, Then 并排显示 3 个环形图（PieChart donut）
- [ ] Given 环形图 A, Then 显示用户角色分布（STUDENT/TEACHER/ADMIN），颜色分别为 primary/secondary/destructive
- [ ] Given 环形图 B, Then 显示考试状态分布（已完成/待考/已逾期），颜色分别为 green/yellow/red
- [ ] Given 环形图 C, Then 显示错题状态分布（ACTIVE/COMPLETED），颜色分别为 orange/emerald
- [ ] Given 每个环形图, Then 中心显示总数（自定义 label），外部显示图例（Legend）
- [ ] Given hover 扇区, Then Tooltip 显示类别名、数量、百分比
- [ ] Given 某项数据为 0, Then 该扇区不显示或显示 0%
- [ ] Given 移动端, Then 3 个环形图垂直堆叠排列
```

**US-47: 柱状图 — 考试概览**
```
As a 管理员,
I want 通过柱状图对比考试总数、已完成、待考、已逾期的数量,
so that 我能快速了解考试模块的整体状态。

Acceptance Criteria:
- [ ] Given 统计页第四行左侧, Then 渲染柱状图（BarChart）
- [ ] Given X轴, Then 4 个类别：考试总数、已完成、待考、已逾期
- [ ] Given Y轴, Then 数量
- [ ] Given 每个柱子, Then 使用不同颜色区分（primary / green / yellow / red）
- [ ] Given hover, Then Tooltip 显示类别名和数量
- [ ] Given 无考试数据, Then 4 个柱子均为 0
```

**US-48: 水平条形图 — 错题分类 TOP10**
```
As a 管理员,
I want 通过水平条形图查看错题数量最多的前 10 个分类,
so that 我能定位哪些知识领域是学生的薄弱环节，为题库优化提供依据。

Acceptance Criteria:
- [ ] Given 统计页第四行右侧, Then 渲染水平条形图（BarChart layout="vertical"）
- [ ] Given Y轴, Then 显示分类名（前 10，按 errorCount 降序），长名称自动截断 + Tooltip 全称
- [ ] Given X轴, Then errorCount 数量
- [ ] Given 每个条形, Then 使用渐变色（如 blue gradient），最长条最深色
- [ ] Given 不足 10 个分类, Then 显示实际数量
- [ ] Given 无错题数据, Then 显示"暂无错题数据"
```

**US-49: 清理过期答题记录**
```
As a 管理员,
I want 在统计页一键清理超过保留天数的过期答题记录,
so that 我能控制数据库增长，无需手动操作数据库或等待定时任务。

Acceptance Criteria:
- [ ] Given 统计页顶部标题行右侧, Then 显示 [清理过期记录] 按钮（outline + destructive 色调 + Trash2 图标）
- [ ] Given 点击按钮, Then 弹出确认对话框，显示："将删除 N 天前的所有答题记录，此操作不可撤销。当前保留天数为 N 天（可在系统设置中修改）。确定继续？"
- [ ] Given N 值, Then 从 GET /api/admin/settings 读取 answer_retention_days（默认 30）
- [ ] Given 确认清理, Then 调用 POST /api/admin/stats/cleanup
- [ ] Given 清理成功, Then Toast 提示"已清理 X 条超过 N 天的答题记录"，自动刷新页面数据
- [ ] Given 清理失败, Then Toast 提示错误原因
- [ ] Given 清理结果 deletedCount=0, Then Toast 提示"没有需要清理的过期记录"
- [ ] Given 清理操作, Then 不删除对应的 WrongQuestion 记录（WrongQuestion 由 self-heal 管理）
```

**US-50: 30天数据范围扩展**
```
As a 管理员,
I want 统计页的时间范围从 7 天扩展到 30 天,
so that 我能观察更长时间维度的趋势变化。

Acceptance Criteria:
- [ ] Given API GET /api/admin/stats, Then dailyStats 返回 30 天数组（原 7 天）
- [ ] Given 双Y轴折线图, Then X 轴显示 30 个日期点
- [ ] Given 面积图, Then 累计 30 天数据
- [ ] Given 某天无数据, Then answers 和 newUsers 均为 0，图表正常渲染
```

#### P1 -- Should Have（数据统计 V2.3）

**US-51: 图表日期范围筛选器**
```
As a 管理员,
I want 通过日期范围选择器筛选图表的时间区间（7天/14天/30天/自定义）,
so that 我能灵活查看不同时间段的统计数据。

Acceptance Criteria:
- [ ] Given 统计页顶部, Then 显示日期范围下拉选择器：[近7天 ▼] [近14天] [近30天] [自定义]
- [ ] Given 选择"近7天", Then 所有图表数据切换为近 7 天
- [ ] Given 选择"自定义", Then 弹出日期范围选择器（from - to）
- [ ] Given 切换范围, Then API 请求带 dateRange 参数重新获取数据
- [ ] Given 自定义范围 > 90 天, Then 提示"时间范围不能超过 90 天"
```

**US-52: 图表导出为图片**
```
As a 管理员,
I want 将统计页的图表导出为 PNG 图片,
so that 我能将数据截图分享或存档。

Acceptance Criteria:
- [ ] Given 每个图表卡片右上角, Then 显示下载图标按钮
- [ ] Given 点击下载, Then 调用 recharts 的 toDataURL 导出为 PNG 并触发浏览器下载
- [ ] Given 导出, Then 文件名格式："{图表标题}_{日期}.png"
- [ ] Given 导出成功, Then Toast 提示"图表已下载"
```

#### P1 -- Should Have（首页重设计 V2.4）

**US-53: 首页文案重设计**
```
As a 未登录访客,
I want 在首页看到有吸引力的标题和副标题,
so that 我对平台产生兴趣并愿意注册。

Acceptance Criteria:
- [ ] Given 访客访问 /, Then 浏览器标签页标题显示为 "ExamMax"
- [ ] Given 访客访问 /, Then 页面 H1 显示 "ExamMax"
- [ ] Given 访客访问 /, Then 副标题显示 "不刷题的学生不是好卷王"
- [ ] Given 搜索引擎爬虫, Then meta description 为 "不刷题的学生不是好卷王"
- [ ] Given 旧标题 "ExamMax 刷题平台", Then 不再出现在任何位置
```

**US-54: 首页入场动画**
```
As a 未登录访客,
I want 首页元素以流畅的动画方式呈现,
so that 我能感受到平台的品质感和活力。

Acceptance Criteria:
- [ ] Given 访客访问 /, Then 标题、副标题、按钮依次从下往上淡入（stagger 效果）
- [ ] Given 页面加载完成, Then 标题有持续的微弱呼吸式 scale 脉冲动画
- [ ] Given 鼠标悬停按钮, Then 按钮弹性放大（whileHover scale=1.05）
- [ ] Given 点击按钮, Then 按钮回弹缩小（whileTap scale=0.97）
- [ ] Given 动画完成, Then 不阻挡用户交互（动画时长 < 1s）
- [ ] Given 低端设备, Then 动画流畅不卡顿（GPU 加速 transform/opacity）
```

**US-55: 保持极简布局**
```
As a 产品设计者,
I want 首页保持极简风格不添加功能卖点卡片,
so that 首屏信息密度低、访客注意力集中在注册/登录转化上。

Acceptance Criteria:
- [ ] Given 首页, Then 仅包含标题、副标题、登录按钮、注册按钮四个元素
- [ ] Given 首页, Then 不包含功能卖点卡片、截图、图标等附加内容
- [ ] Given 首页, Then 所有元素居中竖向排列
```

### Non-Functional Requirements

| Category | Requirement | Target |
|----------|------------|--------|
| **Performance** | 页面首屏加载 | < 2s |
| **Performance** | API 响应 | < 500ms |
| **Performance** | Fire-and-forget 请求 | 不阻塞 UI，静默失败 |
| **Performance** | 考试计时器精度 | 每秒更新，localStorage 快照间隔 <= 5s |
| **Security** | 密码存储 | bcrypt 哈希 |
| **Security** | 邀请码防爆 | 限流 |
| **Security** | 系统设置页 | ADMIN only |
| **Security** | 防作弊全屏 | 拒绝全屏则不能开始考试 |
| **Security** | 切屏检测 | visibilitychange + blur 双重检测 |
| **Accessibility** | 响应式设计 | 桌面 + 移动端 |
| **Data Integrity** | 自愈机制 | 支持从 AnswerRecord 重建 WrongQuestion |
| **Data Integrity** | 考试计时恢复 | localStorage 快照防刷新丢时 |
| **Decoupling** | 练习模块零改动 | 错题更新完全通过独立 API 调用 |
| **API Design** | 用户管理 API 单一职责 | 每条 API 仅负责一个属性维度 |
| **Authorization** | 单管理员唯一约束 | 所有写入路径拒绝 ADMIN 角色分配 |
| **UX** | 抽屉面板交互 | 展开/关闭动画 < 300ms，数据即时刷新 |
| **Security** | JWT 登出黑名单 | 退出后 token 立即失效（Redis Set TTL = 剩余有效期） |
| **Security** | 单终端登录 | sessionVersion 校验，旧会话被踢 < 30s（心跳周期内） |
| **Security** | 前端 401 拦截 | 全局 API 客户端统一处理，被踢即时跳转（不依赖页面刷新） |
| **Performance** | 统计 API 响应（含 30 天数据 + 10+ 分组聚合） | < 1.5s |
| **Performance** | 图表首屏渲染（6 张 recharts） | < 2s |
| **Accessibility** | 图表颜色无障碍 | 环形图颜色对比度 >= 3:1，除颜色外使用标签区分 |
| **UX** | 清理过期记录确认 | 操作前弹窗确认，展示保留天数，防止误操作 |
| **Data Integrity** | 清理过期记录不影响错题 | DELETE AnswerRecord 时不级联删除 WrongQuestion |

### Dependencies

| Dependency | 备注 |
|------------|------|
| Next.js 14+ | App Router |
| Prisma ORM | 数据库 |
| Tailwind CSS | 样式 |
| shadcn/ui | UI 组件 |
| MySQL 8.0 | 数据库 |
| Redis 7 | 登录限流、JWT 黑名单、sessionVersion 单终端登录（V2.2） |
| Docker | 部署 |
| xlsx | Excel 解析 |
| AnswerRecord 表 | 自愈机制的数据源 |
| 现有练习模块 API | 错题重做复用练习接口 |
| 现有题库 + 分类系统 | 教师创建考试时从题库选题 |
| 现有 User 表（含 TEACHER 角色） | 教师身份已存在于系统 |
| Fullscreen API | 浏览器全屏能力（防作弊依赖） |
| localStorage | 考试计时快照恢复 |
| shadcn/ui Sheet/Drawer 组件 | 用户操控面板的抽屉交互 |
| 现有 GET /api/admin/users | V2.0 列表获取复用，无需改动 |
| 现有 Badge / ShopItem / UserBadge / UserItem 模型 | 徽章和称号管理依赖现有数据模型 |
| 现有 PointLog 模型 | 积分/经验手动调整需写入审计记录 |
| recharts | V2.3 前端图表库，需新增 npm 依赖 |
| 现有 GET /api/admin/settings | 清理过期记录需要读取 answer_retention_days |
| 现有 WrongQuestion 模型 | 错题分类 TOP10 统计 + 环形图 C 数据源 |
| 现有 Class / Task / TaskSubmission 模型 | 考试相关统计指标数据源 |
| framer-motion | V2.4 前端动画库，需新增 npm 依赖 |

### Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Fire-and-forget 请求丢失导致 WrongQuestion 数据不准 | Medium | Low（可通过 self-heal 修复） | 提供 self-heal 端点定期修复；前端重试一次后放弃 |
| WrongQuestion 与 AnswerRecord 数据不一致 | Medium | Medium | self-heal 机制从 AnswerRecord 全量重建 |
| 练习模块后续重构影响错题回顾 | Low | Medium | API 契约隔离：练习模块不感知 WrongQuestion，错题模块仅依赖 AnswerRecord |
| errorCount 权重计算争议（是否应该对-1） | Low | Low | 可后续通过 Setting 表配置权重策略（如 `wrong_question_weight_strategy`） |
| 大量用户同时 self-heal 造成数据库压力 | Low | Medium | 仅允许当前用户操作自己的数据；可加限流 |
| Fullscreen API 在部分浏览器不兼容（如 iOS Safari） | Medium | High | 检测 Fullscreen API 可用性，不可用时降级为"窗口最大化 + 警告提示" |
| 浏览器切屏检测可能被绕过（虚拟机/多显示器） | Medium | Medium | 切屏检测作为辅助手段，结合每题独立计时降低作弊收益 |
| 创建考试时为全班学生批量创建 TaskSubmission 耗时 | Medium | Medium | 异步处理：先创建 Task，后台队列批量创建 Submission；前端显示创建中状态 |
| 教师删除有学生的班级造成数据孤立 | Low | Low | 限制：有未结束考试时不允许删除班级；已结束考试的 Task 数据保留 |
| 旧 admin/users PATCH 端点与新 7 条 API 并存引起数据竞争 | Low | Medium | 旧端点标记 deprecated 后前端立即切换；保留旧端点仅作回滚备选 |
| 管理员误操作覆盖用户密码/积分造成争议 | Medium | Medium | 所有手动调整写入 PointLog 审计；密码重置记录操作日志 |
| 等级直接覆盖与经验值脱节 | Low | Low | 等级设置严格映射为 experience = (level - 1) * 100，保持公式一致 |
| 抽屉面板数据过多导致移动端体验不佳 | Low | Low | 抽屉内容分区折叠（accordion），移动端默认仅展开基本信息区 |
| 账户码过期检测依赖每次查询触发，可能遗漏 | Low | Low | `requireAuth` 每次请求也检查，双路径保证 |
| 账户码被吊销后已绑定用户仍可访问直到下次请求 | Low | Medium | `requireAuth` 每次请求实时检查 AccountCode 状态，最坏情况延迟 = 一次请求周期 |
| Redis 不可用时单终端登录降级 | Low | High | `requireAuth` 中 Redis 查询失败时仅记录日志不阻断请求（保证可用性优先） |
| sessionVersion 长期不清理持续增长 | Low | Low | Redis string 存储整数，4 字节即可；用户量级不大，长期可设 TTL 兜底 |
| 前端 401 拦截与心跳检查竞态 | Low | Low | `kickRedirecting` 标志位防止重复跳转 |
| 30 天 dailyStats 循环 30 次独立 DB 查询慢 | Medium | Medium | 使用 Prisma 批量查询优化（一次查 30 天 range 再内存分组）；或新增 `GROUP BY DATE(createdAt)` 聚合查询 |
| dailyStats 循环查询在每新增一个聚合维度时变慢 | Low | Low | 仅查询 answer 和 newUser 两个维度，查询数固化；后续扩展可改为 materialized view |
| 清理过期记录误删有用数据 | Low | High | 按钮前弹窗确认，默认读取系统设置保留天数，记录操作审计；不级联删除 WrongQuestion |
| recharts 服务端渲染（SSR）报错 | Medium | Medium | 图表组件使用 `dynamic(() => import(...), { ssr: false })` 懒加载，禁用 SSR |
| 环形图 B（考试状态）数据全 0 时渲染异常 | Low | Low | 前端判断总量为 0 时显示"暂无考试数据"空状态，不渲染环形图 |
| 水平条形图分类名过长溢出 | Low | Low | 前端截断 Y 轴 label 为 8 字符 + "..."，Tooltip 显示全名 |
| 清理过期记录与 self-heal 同时调用导致数据竞争 | Low | Low | 前端限制：同一按钮 loading 状态防止重复点击；后端单次同步执行 |

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
- 积分/经验值系统（独立计算：签到+考试，消费：商城+抽奖）
- 连续打卡签到（积分递增，经验固定）
- 徽章/成就系统（7个成就，答题后自动检查授予，装备1个）
- 称号系统（商城购买6个常驻 + 抽奖掉落4个限定）
- 抽奖系统（50积分/次，3层稀有度，30抽保底）
- 排行榜（刷题/考试双维度，个人/班级排行，仅学生，按正确率，展示勋章和称号的唯一位置）
- 个人主页管理（用户名修改、密码修改、勋章/称号展示顺序设置）
- 虚拟商店（称号兑换）
- 称号管理后台（管理员自定义添加）
- 邀请码管理
- 数据统计

### V1.5 范围 — 错题回顾模块
- 错题列表（待攻克 / 已攻克双 Tab）
- 权重机制（错+1、对-1，归零自动移入已攻克）
- Fire-and-forget API（练习模块零改动）
- 错题重做功能
- 错题榜 Top 20（按 errorCount 降序）
- 分类筛选联动（列表 + 榜单）
- 管理后台系统设置页（ADMIN only）
- 自愈机制（从 AnswerRecord 重建 WrongQuestion）
- 替换 /dashboard/history 路由为错题回顾页

### V1.6 范围 — 师生交互考试模块
- **班级管理：** 教师创建/编辑/删除班级，生成班级邀请码
- **班级成员：** 学生输入邀请码加入班级，教师查看成员列表、手动添加/移除学生
- **考试管理：** 教师创建考试（选班级→选题→设置顺序→配置时限/切屏→发布），编辑/删除未开始的考试
- **学生考试列表：** 三状态 Tab（待考/已考/已逾期），截止时间倒计时
- **防作弊作答：** 强制全屏（Fullscreen API），每题独立倒计时（切题暂停/恢复），切屏检测（visibilitychange + blur），超限自动交卷，localStorage 计时快照
- **交卷成绩：** 确认交卷弹窗，提交答案+切屏日志+每题用时，交卷即出分（对错/解析），错题自动写入 WrongQuestion
- **教师成绩查看：** 全班统计卡片（平均正确率/每题正确率分布），学生列表（按正确率排序），展开详情（逐题答案+用时），切屏日志时间线
- **数据模型变更：** 新增 Class/ClassMember，修改 Task/TaskSubmission，修改 InvitationCode（V2.1 中已拆分为 AccountCode + ClassCode）

### V2.0 范围 — 用户管理重构模块
- **抽屉式操控面板：** 点击用户行 → 右侧抽屉展开，集中管理基本信息、密码、积分、经验、等级、徽章、称号
- **单管理员唯一约束：** 全局仅 admin 一个管理员，所有 API 拒绝 ADMIN 角色分配，角色变更仅限 STUDENT↔TEACHER
- **7 条单一职责 API：** PATCH users/[id]（用户名+角色）、PUT users/[id]/password（密码覆盖）、PATCH users/[id]/points（积分覆盖/增量）、PATCH users/[id]/experience（经验覆盖/增量）、POST/DELETE users/[id]/badges（徽章发放/删除）、PUT/DELETE users/[id]/title（称号设置/取消）
- **积分/经验/等级双模式调整：** 覆盖模式（设绝对值）和增量模式（加减），最小阈值保护，PointLog 审计
- **徽章管理：** 已有徽章列表 + 下拉发放未拥有徽章 + 删除（自动取消装备）
- **称号管理：** 已有称号列表 + 当前使用标记 + 设置/取消
- **废弃旧端点：** 迁移完成后移除 PATCH /api/admin/users（批量角色修改）

### V2.1 范围 — 账户码与班级码双模型
- **账户码（AccountCode）：** 管理员生成/延期/吊销/删除账户码，支持过期时间设置，自动过期检测（每次查询时标记 EXPIRED），已吊销/过期账户码阻止对应已绑定用户的后续 API 请求
- **班级码（ClassCode）：** 教师为班级生成邀请码（CLASS- 前缀），支持多个学生复用同一码加入班级，学生端输入班级码加入
- **数据模型：** 删除旧 InvitationCode 表，新增 AccountCode 和 ClassCode 两个独立模型
- **非 ADMIN 强制绑定：** `requireAuth` 对非 ADMIN 用户校验账户码有效性（存在性、状态、过期时间）

### V2.2 范围 — Redis 安全升级与单终端登录
- **JWT 登出黑名单：** 退出登录时 token 加入 Redis Set（TTL = 剩余有效期），`requireAuth` 每次请求校验黑名单，保证退出后旧 token 立即失效
- **单终端登录：** Redis `sessionVersion:{userId}` 自增计数器，登录时写入 JWT `sv` 字段，`requireAuth` 每次请求对比版本号，不匹配 → 401 "账号已在其他设备登录"
- **老 token 兼容：** 无 `sv` 字段的老 token 视为 `sv=0`，一律校验（不允许绕过）
- **前端全局 401 拦截：** 统一 API 客户端 `src/lib/api.ts` 封装 fetch，自动拦截 401 "账号已在其他设备登录" → 清除 localStorage + `location.replace("/login?reason=kicked")`
- **心跳检测：** `layout.tsx` 每 30s 调用 `/api/user/me`，visibilitychange 暂停/恢复，bfcache 检测
- **登录页被踢提示：** 检测 `?reason=kicked` 参数，显示琥珀色横幅
- **页面迁移：** practice / exams / leaderboard / checkin 等关键页面的 fetch 调用迁移到统一 API 客户端

### V2.3 范围 — 数据统计页重构
- **后端指标扩展：** activeUsers（近30天活跃用户）、totalClasses（班级总数）、totalExams / completedExams / pendingExams / overdueExams（考试状态分布）、totalPointsIssued（积分发放总额）、shopExchanges（商店兑换次数）、lotteryCount（抽奖次数）、avgWrongPerUser（人均错题权重）、wrongByCategory TOP10（错题分类排行）
- **时间范围扩展：** dailyStats 从 7 天扩展为 30 天
- **8 张摘要卡片：** 活跃用户、班级总数、考试总数、考试完成率、积分发放、商店兑换、抽奖次数、人均错题（2 行 x 4 列，响应式降级为 2 列 / 1 列）
- **6 张 recharts 图表：**
  1. 双 Y 轴折线图（ComposedChart：左Y答题数 Bar + 右Y新用户 Line，30天）
  2. 面积图（AreaChart：累计答题趋势，30天）
  3. 环形图 A — 用户角色分布（PieChart donut：STUDENT/TEACHER/ADMIN）
  4. 环形图 B — 考试状态分布（PieChart donut：已完成/待考/已逾期）
  5. 环形图 C — 错题状态分布（PieChart donut：ACTIVE/COMPLETED）
  6. 柱状图 + 水平条形图（BarChart：考试概览 + layout="vertical" 错题分类 TOP10）
- **清理过期记录：** 按钮联动 answer_retention_days 系统设置，确认弹窗后调用 POST /api/admin/stats/cleanup 批量删除，不级联 WrongQuestion
- **前端依赖：** 新增 recharts 图表库
- **P1 增强：** 日期范围筛选器（7/14/30天/自定义）、图表导出为 PNG

### V2.4 范围 — 首页重设计
- **文案变更：** 浏览器 title 和 H1 从"ExamMax 刷题平台"改为"ExamMax"，副标题从"通过刷题练习和奖励激励提升学习效果"改为"不刷题的学生不是好卷王"，meta description 同步
- **动画引入：** framer-motion（`npm install framer-motion`）
- **入场动画：** stagger 依次淡入（标题 → 副标题 delay 0.15s → 按钮组 delay 0.3s），spring 缓动
- **持续微动：** 标题呼吸式 scale 脉冲（1 → 1.02 → 1，周期 ~3s，无限循环），按钮 hover/tap 弹性效果
- **布局：** 保持极简居中竖向排列，不加功能卖点卡片
- **涉及文件：** `src/app/layout.tsx`（metadata）、`src/app/page.tsx`（重写为 framer-motion 客户端组件）

### Success Metrics

| Metric | Target |
|--------|--------|
| 题库导入成功率 | 95%+ |
| 刷题完成率 | 80%+ |
| 用户留存率 | 40%+ |
| 考试完成率（V1.6） | 90%+（开始考试后完成交卷） |
| 防作弊有效性（V1.6） | 切屏检测覆盖率 100%（支持 Fullscreen API 的浏览器） |
| 用户管理 API 可用性（V2.0） | 7 条 API 全部通过验收测试，成功率 100% |
| 抽屉面板渲染性能（V2.0） | 打开动画 < 300ms，数据加载 < 1s |
| 单管理员约束（V2.0） | 0 起违规的 ADMIN 角色新建/提升事件 |
| 统计 API 响应时间（V2.3） | < 1.5s（含 30 天 + 10+ 聚合指标） |
| 图表渲染完成（V2.3） | 6 张图表全部渲染 < 2s |
| 清理过期记录成功率（V2.3） | 100%（操作正确执行并返回删除条数） |
| 首页动画流畅度（V2.4） | 入场动画 < 1s，持续动画 60fps，低端设备不掉帧 |
| 首页文案认可度（V2.4） | 用户反馈"不刷题的学生不是好卷王"引发共鸣（定性评估） |

---

## Appendix A: 技术架构

```
Docker Compose
├── app (Next.js) :3000
│   ├── 前端：Tailwind CSS + shadcn/ui + framer-motion (V2.4+)
│   ├── API：Next.js API Routes
│   ├── 认证：JWT（含 sv sessionVersion 字段）
│   └── ORM：Prisma
├── db (MySQL) :3306
└── redis (Redis) :6379 — 登录限流、JWT 黑名单、sessionVersion 单终端登录
```

## Appendix B: 数据模型

```
User (用户)
├── id, username, passwordHash
├── role: STUDENT | TEACHER | ADMIN
├── points, experience, level
├── streakDays, lastCheckIn
├── activeTitleId (当前使用称号)
├── accountCodeId? (绑定账户码，V2.1)
├── showBadgeFirst: Boolean (勋章在称号前)
├── showBadgeText: Boolean (勋章显示文字)
├── pityCounter: Int (抽奖保底计数)
└── createdAt, updatedAt

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

AccountCode (账户码) — V2.1 新增（替代旧 InvitationCode）
├── id, code (unique), status: ACTIVE | EXPIRED | REVOKED
├── role (STUDENT/TEACHER), expiresAt?
├── createdById? (FK User，创建者 ADMIN)
├── boundUser → User? (one-to-one 绑定)
└── createdAt

ClassCode (班级码) — V2.1 新增
├── id, code (unique, CLASS- 前缀)
├── classId (FK Class), createdById? (FK User)
└── createdAt

PointLog (积分记录)
├── id, userId, points, reason
└── createdAt

WrongQuestion (错题追踪) — V1.5 新增
├── id, userId, questionId
├── errorCount: Int (权重计数，错+1对-1)
├── status: ACTIVE | COMPLETED
├── wrongAnswers: Json (最近5次错误答案数组)
├── completedAt: DateTime?
└── @@unique([userId, questionId])

Setting (系统设置) — V1.5 新增
├── id, key (unique), value
├── type: NUMBER | BOOLEAN | STRING
├── label, description
└── updatedAt

Class (班级) — V1.6 新增
├── id, name, description?
├── teacherId (FK User)
├── members → ClassMember[]
├── classCodes → ClassCode[]
├── tasks → Task[]
└── createdAt

ClassMember (班级成员) — V1.6 新增
├── id, classId, userId
├── joinedAt
└── @@unique([classId, userId])

Task (任务/考试) — V1.6 扩展
├── id, teacherId, title, description
├── classId? (V1.6 新增：绑定班级)
├── deadline, questionIds (Json)
├── questionOrder: "manual" | "shuffle" (V1.6 新增)
├── perQuestionTime: Int? (V1.6 新增)
├── maxTabSwitches: Int @default(3) (V1.6 新增)
├── assignedTo → User[] (V1.6 废弃：改用 classId)
└── submissions → TaskSubmission[]

TaskSubmission (任务提交) — V1.6 扩展
├── id, taskId, userId
├── status: PENDING | COMPLETED | OVERDUE
├── completedAt, createdAt
├── tabSwitches: Int @default(0) (V1.6 新增)
├── switchLog: Json @default("[]") (V1.6 新增)
├── perQuestionTime: Json? (V1.6 新增)
└── submittedAt: DateTime? (V1.6 新增)
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

*PRD Version: 8.0 | Last Updated: 2026-05-23* | Changes: V2.4 — Added 首页落地页重设计: new title "ExamMax", subtitle "不刷题的学生不是好卷王", framer-motion stagger entrance animation + breathing continuous micro-motion, minimal centered layout. V2.3 — Added 数据统计页重构: 8 summary cards + 6 recharts charts (dual Y-axis line, area, 3 donut, bar, horizontal bar), 10+ new backend metrics (activeUsers, totalClasses, exam status distribution, totalPointsIssued, shopExchanges, lotteryCount, avgWrongPerUser, wrongByCategory TOP10, 30-day dailyStats), cleanup expired records button linked to answer_retention_days. V2.2 — Added Redis security infrastructure upgrade. V2.1 — Added AccountCode + ClassCode dual-model. V2.0 — Added 用户管理重构模块. Previous: V1.6 师生交互考试模块.*
