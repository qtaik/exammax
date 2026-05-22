# PRD: ExamMax 选择题刷题框架系统

**Author:** 独立开发者 | **Status:** Draft | **Date:** 2026-05-22

---

## 1. Summary

ExamMax 是一个轻量级的选择题刷题框架系统，核心目标是通过 xlsx 导入选择题，提供随机抽题、按个答题、考试三种刷题模式，帮助用户加强对题目的熟练度。平台采用分类管理（独立分类，无学科概念），支持完整的用户管理、积分/徽章/排行榜/打卡等奖励机制、错题回顾与管理（权重机制 + 错题榜）、虚拟商店兑换功能。通过邀请码准入机制控制用户注册，管理员可通过后台管理题库、用户、系统设置和数据统计。

V1.6 新增**师生交互考试体系**：教师可创建班级、发布指定题目的限时考试（配置切屏限制、每题时限、题目顺序），学生在全屏防作弊环境下逐题作答（每题独立倒计时、切屏检测自动交卷），教师可查看学生成绩统计与切屏日志。技术栈采用 Next.js 全栈方案（TypeScript + Tailwind CSS + Prisma + MySQL），通过 Docker Compose 打包实现一键部署。

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

### 核心理念
- **核心功能**：选择题刷题框架（xlsx 导入 + 三种刷题模式）
- **附加功能**：用户管理、奖励机制（积分/徽章/排行榜/签到/商店）、错题回顾与管理
- **师生交互（V1.6）**：班级管理、教师发布考试、学生防作弊作答、教师成绩统计

### 约束与假设
- **约束：** 个人开发，需要快速上线
- **约束：** 初期仅支持选择题（单选/多选），后续可扩展
- **约束：** 错题回顾模块与练习模块解耦，练习模块零改动
- **约束（V1.6）：** 防作弊全屏机制依赖浏览器 Fullscreen API，无法防止物理作弊（如使用第二台设备）
- **假设：** 用户通过 xlsx 文件批量导入题目
- **假设（V1.6）：** 教师已有题库基础，可直接从题库选题发布考试

---

## 4. Objective

### 主要目标
1. **实现核心刷题功能**：支持 xlsx 导入选择题，提供随机抽题、按个答题、考试三种模式
2. **建立错题回顾体系**：通过权重机制追踪错题，提供错题重做、错题榜和分类筛选，替代传统答题历史
3. **建立奖励机制**：积分、徽章、排行榜、签到、商店等附加功能
4. **一键部署**：通过 Docker Compose 实现简单部署
5. **建立师生交互考试体系（V1.6）**：班级管理、教师发布指定题目的正式考试、学生全屏防作弊逐题作答、教师查看成绩统计

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
│   └── 个人主页
└── 管理后台
    ├── 题库管理（CRUD + xlsx 导入）
    ├── 分类管理
    ├── 用户管理
    ├── 邀请码管理
    ├── 系统设置（V1.5 新增）
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

**修改 InvitationCode 模型（新增字段）：**
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

**US-15: 管理后台 -- 数据统计**
```
As a 管理员,
I want 查看平台数据统计,
so that 我能了解运营状况。

Acceptance Criteria:
- [ ] Given 管理员进入统计页, Then 显示核心指标（用户数、答题数、正确率）
- [ ] Given 统计页, Then 显示趋势图
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
| AnswerRecord 表 | 自愈机制的数据源 |
| 现有练习模块 API | 错题重做复用练习接口 |
| 现有题库 + 分类系统 | 教师创建考试时从题库选题 |
| 现有 User 表（含 TEACHER 角色） | 教师身份已存在于系统 |
| Fullscreen API | 浏览器全屏能力（防作弊依赖） |
| localStorage | 考试计时快照恢复 |

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
- **数据模型变更：** 新增 Class/ClassMember，修改 Task/TaskSubmission/InvitationCode

### V2.0 规划 — 增强功能
- 班级排行榜（按考试平均分排名）
- 教师批量导入学生到班级
- 考试题目随机化（每人题目顺序不同）
- 考试时段限制（开始时间 + 截止时间，而非仅截止时间）
- 考试通知（站内信/邮件提醒学生有新考试）

### Success Metrics

| Metric | Target |
|--------|--------|
| 题库导入成功率 | 95%+ |
| 刷题完成率 | 80%+ |
| 用户留存率 | 40%+ |
| 考试完成率（V1.6） | 90%+（开始考试后完成交卷） |
| 防作弊有效性（V1.6） | 切屏检测覆盖率 100%（支持 Fullscreen API 的浏览器） |

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
├── classId? (V1.6 新增：班级专属邀请码)
├── createdById? (V1.6 新增：生成者)
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
├── invitations → InvitationCode[]
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

*PRD Version: 4.0 | Last Updated: 2026-05-22* | Changes: Added 师生交互考试模块 (V1.6) — 12 new user stories (US-23~34), Class + ClassMember data models, Task/TaskSubmission/InvitationCode extension, anti-cheating mechanism (fullscreen + per-question timer + tab-switch detection), teacher class management + exam publishing + result review, student exam flow with localStorage timer snapshots, 17 new API endpoints*
