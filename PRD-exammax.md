# PRD: ExamMax 选择题刷题框架系统

**Author:** 独立开发者 | **Status:** Draft | **Date:** 2026-05-22

---

## 1. Summary

ExamMax 是一个轻量级的选择题刷题框架系统，核心目标是通过 xlsx 导入选择题，提供随机抽题、按个答题、考试三种刷题模式，帮助用户加强对题目的熟练度。平台采用分类管理（独立分类，无学科概念），支持完整的用户管理、积分/徽章/排行榜/打卡等奖励机制、错题回顾与管理（权重机制 + 错题榜）、虚拟商店兑换功能。通过邀请码准入机制控制用户注册，管理员可通过后台管理题库、用户、系统设置和数据统计。技术栈采用 Next.js 全栈方案（TypeScript + Tailwind CSS + Prisma + MySQL），通过 Docker Compose 打包实现一键部署。

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

### 核心理念
- **核心功能**：选择题刷题框架（xlsx 导入 + 三种刷题模式）
- **附加功能**：用户管理、奖励机制（积分/徽章/排行榜/签到/商店）、错题回顾与管理

### 约束与假设
- **约束：** 个人开发，需要快速上线
- **约束：** 初期仅支持选择题（单选/多选），后续可扩展
- **约束：** 错题回顾模块与练习模块解耦，练习模块零改动
- **假设：** 用户通过 xlsx 文件批量导入题目

---

## 4. Objective

### 主要目标
1. **实现核心刷题功能**：支持 xlsx 导入选择题，提供随机抽题、按个答题、考试三种模式
2. **建立错题回顾体系**：通过权重机制追踪错题，提供错题重做、错题榜和分类筛选，替代传统答题历史
3. **建立奖励机制**：积分、徽章、排行榜、签到、商店等附加功能
4. **一键部署**：通过 Docker Compose 实现简单部署

### 明确不做（Non-Goals）
- 不做学科概念（分类独立，不关联学科）
- 不做填空题、判断题（仅支持选择题）
- 不做实时视频/直播教学
- 不做移动端原生 App（仅 Web 端）
- 不做支付/商业化功能
- 不修改练习模块以适配错题记录（fire-and-forget 解耦）

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
| **刷题用户** | 系统化管理错题，针对性攻克薄弱环节 | 消除"不知道哪些题需要重点复习"的焦虑 | 错题权重追踪 + 错题榜排名带来的攻克动力 |
| **刷题用户** | 重做错题直到掌握 | 消除"错题反复错"的挫败感 | 权重机制（对-1/错+1）让进步可视化 |
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
│   └── 考试模式
├── 错题回顾系统（V1.5 新增）
│   ├── 错题列表（待攻克 / 已攻克双 Tab）
│   ├── 错题榜 Top 20（按 errorCount 降序）
│   ├── 分类筛选（同时影响列表和榜单）
│   ├── 权重机制（答错+1，答对-1，归零自动移入已攻克）
│   ├── 错题重做（调用练习接口获取题目数据）
│   ├── Fire-and-Forget 更新（练习模块零改动）
│   └── 自愈机制（从 AnswerRecord 重建 WrongQuestion）
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

### Non-Functional Requirements

| Category | Requirement | Target |
|----------|------------|--------|
| **Performance** | 页面首屏加载 | < 2s |
| **Performance** | API 响应 | < 500ms |
| **Performance** | Fire-and-forget 请求 | 不阻塞 UI，静默失败 |
| **Security** | 密码存储 | bcrypt 哈希 |
| **Security** | 邀请码防爆 | 限流 |
| **Security** | 系统设置页 | ADMIN only |
| **Accessibility** | 响应式设计 | 桌面 + 移动端 |
| **Data Integrity** | 自愈机制 | 支持从 AnswerRecord 重建 WrongQuestion |
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

### Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Fire-and-forget 请求丢失导致 WrongQuestion 数据不准 | Medium | Low（可通过 self-heal 修复） | 提供 self-heal 端点定期修复；前端重试一次后放弃 |
| WrongQuestion 与 AnswerRecord 数据不一致 | Medium | Medium | self-heal 机制从 AnswerRecord 全量重建 |
| 练习模块后续重构影响错题回顾 | Low | Medium | API 契约隔离：练习模块不感知 WrongQuestion，错题模块仅依赖 AnswerRecord |
| errorCount 权重计算争议（是否应该对-1） | Low | Low | 可后续通过 Setting 表配置权重策略（如 `wrong_question_weight_strategy`） |
| 大量用户同时 self-heal 造成数据库压力 | Low | Medium | 仅允许当前用户操作自己的数据；可加限流 |

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

*PRD Version: 3.0 | Last Updated: 2026-05-22* | Changes: Added 错题回顾模块 (V1.5) — 7 new user stories (US-16~22), WrongQuestion + Setting data models, 4 API endpoints, self-heal mechanism, admin settings page, fire-and-forget decoupling*
