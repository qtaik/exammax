"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { toast } from "sonner"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Line, ComposedChart, Legend, AreaChart, Area, PieChart, Pie, Cell,
} from "recharts"
import {
  BarChart3, Users, HelpCircle, ClipboardList, TrendingUp,
  School, FileText, RotateCcw, Trash2, UserCheck, Loader2,
} from "lucide-react"

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"]

interface DailyStat {
  date: string
  answers: number
  newUsers: number
  correctRate: number
}

interface StatsData {
  totalUsers: number
  usersByRole: { STUDENT: number; TEACHER: number; ADMIN: number }
  totalQuestions: number
  questionsByType: { CHOICE: number; FILL: number; JUDGE: number }
  totalAnswerRecords: number
  correctRate: number
  activeUsers: number
  totalClasses: number
  totalExams: number
  examsByStatus: { COMPLETED: number; PENDING: number; OVERDUE: number }
  totalPointsIssued: number
  shopExchanges: number
  lotteryCount: number
  totalActiveWrong: number
  avgWrongPerUser: number
  wrongByCategory: { category: string; count: number }[]
  dailyStats: DailyStat[]
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cleaning, setCleaning] = useState(false)

  useEffect(() => {
    api.get<StatsData>("/api/admin/stats")
      .then(setStats)
      .catch(() => toast.error("获取统计数据失败"))
      .finally(() => setLoading(false))
  }, [])

  const handleCleanup = async () => {
    setCleaning(true)
    try {
      const res = await api.post<{
        success: boolean
        retentionDays: number
        cleanedRecords: number
        healedWrongQuestions: number
        usersProcessed: number
      }>("/api/admin/stats/cleanup")
      toast.success(
        `清理完成：删除 ${res.cleanedRecords} 条过期记录，修复 ${res.healedWrongQuestions} 条错题（保留 ${res.retentionDays} 天）`
      )
    } catch {
      toast.error("清理失败")
    } finally {
      setCleaning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">加载统计数据失败</p>
      </div>
    )
  }

  const statCards = [
    { title: "总用户数", value: stats.totalUsers, icon: Users, desc: `学生 ${stats.usersByRole.STUDENT} / 教师 ${stats.usersByRole.TEACHER}` },
    { title: "总题目数", value: stats.totalQuestions, icon: HelpCircle, desc: `选择 ${stats.questionsByType.CHOICE} / 填空 ${stats.questionsByType.FILL} / 判断 ${stats.questionsByType.JUDGE}` },
    { title: "总答题次数", value: stats.totalAnswerRecords, icon: ClipboardList, desc: "累计答题记录" },
    { title: "整体正确率", value: `${stats.correctRate}%`, icon: TrendingUp, desc: "全平台答题正确率" },
    { title: "活跃用户", value: stats.activeUsers, icon: UserCheck, desc: "近30天有答题的用户" },
    { title: "班级总数", value: stats.totalClasses, icon: School, desc: "全平台班级数" },
    { title: "考试总数", value: stats.totalExams, icon: FileText, desc: `完成 ${stats.examsByStatus.COMPLETED} / 待考 ${stats.examsByStatus.PENDING}` },
    { title: "人均错题", value: stats.avgWrongPerUser, icon: RotateCcw, desc: `${stats.totalActiveWrong} 道待攻克` },
  ]

  const roleData = [
    { name: "学生", value: stats.usersByRole.STUDENT },
    { name: "教师", value: stats.usersByRole.TEACHER },
    { name: "管理员", value: stats.usersByRole.ADMIN },
  ].filter(d => d.value > 0)

  const questionTypeData = [
    { name: "选择题", value: stats.questionsByType.CHOICE },
    { name: "填空题", value: stats.questionsByType.FILL },
    { name: "判断题", value: stats.questionsByType.JUDGE },
  ].filter(d => d.value > 0)

  const examStatusData = [
    { name: "已完成", value: stats.examsByStatus.COMPLETED },
    { name: "待考", value: stats.examsByStatus.PENDING },
    { name: "已逾期", value: stats.examsByStatus.OVERDUE },
  ].filter(d => d.value > 0)

  const dailyChartData = stats.dailyStats.map(d => ({
    ...d,
    date: d.date.slice(5), // MM-DD
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> 数据统计
          </h1>
          <p className="text-sm text-muted-foreground mt-1">近 30 天平台数据概览</p>
        </div>
        <Button variant="outline" onClick={handleCleanup} disabled={cleaning}>
          {cleaning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
          清理过期记录
        </Button>
      </div>

      {/* Summary Cards Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.slice(0, 4).map(card => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.slice(4, 8).map(card => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend Chart — Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">答题量 & 新增用户趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" fontSize={12} className="text-muted-foreground" />
              <YAxis yAxisId="left" fontSize={12} className="text-muted-foreground" />
              <YAxis yAxisId="right" orientation="right" fontSize={12} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="answers" name="答题数" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="newUsers" name="新增用户" stroke="hsl(var(--chart-2, 160 60% 50%))" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Row: Correct Rate Area + User Role Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">正确率趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" fontSize={12} className="text-muted-foreground" />
                <YAxis domain={[0, 100]} fontSize={12} className="text-muted-foreground" tickFormatter={v => `${v}%`} />
                <Tooltip
                  formatter={(value: number) => `${value}%`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Area type="monotone" dataKey="correctRate" name="正确率" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">用户角色分布</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {roleData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row: Question Type Pie + Exam Status Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">题目类型分布</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={questionTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {questionTypeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">考试状态分布</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={examStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {examStatusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row: Points Consumption Bar + Wrong by Category Horizontal Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">积分消费概览</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { name: "商店兑换", value: stats.shopExchanges },
                  { name: "抽奖", value: stats.lotteryCount },
                ]}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" fontSize={12} className="text-muted-foreground" />
                <YAxis type="category" dataKey="name" fontSize={12} className="text-muted-foreground" width={60} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground text-center mt-2">
              平台积分总发行：{stats.totalPointsIssued}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">错题分类 TOP 10</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.wrongByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">暂无错题数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[...stats.wrongByCategory].reverse()}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" fontSize={12} className="text-muted-foreground" />
                  <YAxis type="category" dataKey="category" fontSize={12} className="text-muted-foreground" width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Bar dataKey="count" name="错题数" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
