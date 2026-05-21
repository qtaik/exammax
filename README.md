# ExamMax 学科练习平台

通过刷题练习、奖励激励和师生互动提升学习效果。

## 快速开始

### Docker 一键部署（推荐）

```bash
# 1. 克隆项目
git clone <repo-url> && cd exammax

# 2. 启动服务
docker-compose up -d

# 3. 访问 http://localhost:3000
```

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，配置数据库连接

# 3. 启动 MySQL（需要本地安装或使用 Docker）
docker-compose up -d db

# 4. 初始化数据库
npx prisma db push

# 5. 启动开发服务器
npm run dev
```

## 技术栈

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Prisma ORM + MySQL
- NextAuth.js

## 项目结构

```
exammax/
├── src/
│   ├── app/              # Next.js 页面
│   │   ├── api/          # API 路由
│   │   ├── (auth)/       # 登录/注册
│   │   ├── dashboard/    # 学生仪表盘
│   │   ├── admin/        # 管理后台
│   │   └── teacher/      # 老师端
│   ├── components/       # UI 组件
│   └── lib/              # 工具函数
├── prisma/
│   └── schema.prisma     # 数据库 Schema
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## 题库导入

支持 xlsx 格式批量导入题目，详见 [PRD](PRD-exammax.md#appendix-c-题库导入格式)。
