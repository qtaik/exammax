"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Users,
  HelpCircle,
  ClipboardList,
  TrendingUp,
} from "lucide-react"

interface StatsData {
  totalUsers: number
  usersByRole: { STUDENT: number; TEACHER: number; ADMIN: number }
  totalQuestions: number
  questionsByType: { CHOICE: number; FILL: number; JUDGE: number }
  totalAnswerRecords: number
  correctRate: number
  recentActivity: { date: string; answers: number; newUsers: number }[]
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token")
        const res = await fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        setStats(data)
      } catch {
        console.error("获取统计数据失败")
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">加载中...</p>
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
    {
      title: "总用户数",
      value: stats.totalUsers,
      icon: Users,
      description: `学生 ${stats.usersByRole.STUDENT} / 教师 ${stats.usersByRole.TEACHER} / 管理员 ${stats.usersByRole.ADMIN}`,
    },
    {
      title: "总题目数",
      value: stats.totalQuestions,
      icon: HelpCircle,
      description: `选择 ${stats.questionsByType.CHOICE} / 填空 ${stats.questionsByType.FILL} / 判断 ${stats.questionsByType.JUDGE}`,
    },
    {
      title: "总答题次数",
      value: stats.totalAnswerRecords,
      icon: ClipboardList,
      description: "累计答题记录",
    },
    {
      title: "正确率",
      value: `${stats.correctRate}%`,
      icon: TrendingUp,
      description: "全平台答题正确率",
    },
  ]

  const userRoles = [
    { label: "学生", count: stats.usersByRole.STUDENT, color: "bg-primary" },
    { label: "教师", count: stats.usersByRole.TEACHER, color: "bg-secondary" },
    { label: "管理员", count: stats.usersByRole.ADMIN, color: "bg-destructive" },
  ]

  const questionTypes = [
    { label: "选择题", count: stats.questionsByType.CHOICE, color: "bg-primary" },
    { label: "填空题", count: stats.questionsByType.FILL, color: "bg-secondary" },
    { label: "判断题", count: stats.questionsByType.JUDGE, color: "bg-outline" },
  ]

  const maxUserCount = Math.max(...userRoles.map((r) => r.count), 1)
  const maxQuestionCount = Math.max(...questionTypes.map((t) => t.count), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" /> 数据统计
        </h1>
        <p className="text-sm text-muted-foreground mt-1">平台整体数据概览</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">用户分布</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {userRoles.map((role) => (
              <div key={role.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{role.label}</span>
                  <span className="text-muted-foreground">{role.count} 人</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${role.color} transition-all`}
                    style={{ width: `${(role.count / maxUserCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Question Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">题目分布</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questionTypes.map((type) => (
              <div key={type.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{type.label}</span>
                  <span className="text-muted-foreground">{type.count} 道</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${type.color} transition-all`}
                    style={{ width: `${(type.count / maxQuestionCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">近7日活跃</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">日期</th>
                  <th className="text-left py-3 px-2 font-medium">答题数</th>
                  <th className="text-left py-3 px-2 font-medium">新用户</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentActivity.map((day) => (
                  <tr key={day.date} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">{day.date}</td>
                    <td className="py-3 px-2">
                      <Badge variant="secondary">{day.answers}</Badge>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant="outline">{day.newUsers}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
