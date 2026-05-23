"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Trophy, ShoppingBag, RotateCcw, BarChart3, Users, HelpCircle, Settings, CalendarCheck, Award, User, Sparkles, School, FileText, Tag } from "lucide-react"
import { api } from "@/lib/api"

interface User {
  id: string
  username: string
  role: string
  points: number
  experience: number
  level: number
  streakDays: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    api.get<{ user: User }>("/api/user/me")
      .then((data) => setUser(data.user))
      .catch((err) => { console.error("Dashboard user fetch error:", err) })
  }, [])

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  const allCards = [
    // === 所有角色 ===
    { href: "/dashboard/practice", label: "开始刷题", desc: "随机出题，开始练习", icon: BookOpen, roles: ["STUDENT", "TEACHER", "ADMIN"] },
    { href: "/dashboard/history", label: "错题回顾", desc: "查看和重做错题，攻克薄弱环节", icon: RotateCcw, roles: ["STUDENT", "TEACHER", "ADMIN"] },
    { href: "/dashboard/checkin", label: "签到打卡", desc: "每日签到获取积分奖励", icon: CalendarCheck, roles: ["STUDENT", "TEACHER", "ADMIN"] },
    { href: "/dashboard/leaderboard", label: "排行榜", desc: "查看刷题与考试排名", icon: Trophy, roles: ["STUDENT", "TEACHER", "ADMIN"] },
    { href: "/dashboard/achievements", label: "成就勋章", desc: "查看已获得的徽章和成就", icon: Award, roles: ["STUDENT", "TEACHER", "ADMIN"] },
    { href: "/dashboard/shop", label: "积分商店", desc: "用积分兑换个性称号", icon: ShoppingBag, roles: ["STUDENT", "TEACHER", "ADMIN"] },
    { href: "/dashboard/lottery", label: "积分抽奖", desc: "用积分抽奖赢取限定称号", icon: Sparkles, roles: ["STUDENT", "TEACHER", "ADMIN"] },
    { href: "/dashboard/profile", label: "个人主页", desc: "查看个人信息和展示装备", icon: User, roles: ["STUDENT", "TEACHER", "ADMIN"] },
    // === 学生专属 ===
    { href: "/dashboard/classes", label: "我的班级", desc: "加入班级，参与班级考试", icon: School, roles: ["STUDENT"] },
    { href: "/dashboard/exams", label: "我的考试", desc: "参加教师发布的正式考试", icon: FileText, roles: ["STUDENT"] },
    // === 教师专属 ===
    { href: "/dashboard/teacher/classes", label: "班级管理", desc: "创建和管理班级", icon: School, roles: ["TEACHER"] },
    { href: "/dashboard/teacher/exams", label: "考试管理", desc: "发布考试、查看成绩", icon: FileText, roles: ["TEACHER"] },
    { href: "/dashboard/teacher/questions", label: "题库管理", desc: "管理分类和题目", icon: HelpCircle, roles: ["TEACHER"] },
    // === 管理员专属 ===
    { href: "/dashboard/admin/questions", label: "题库管理", desc: "管理分类和题目", icon: HelpCircle, roles: ["ADMIN"] },
    { href: "/dashboard/admin/users", label: "用户管理", desc: "管理平台用户", icon: Users, roles: ["ADMIN"] },
    { href: "/dashboard/admin/account-codes", label: "账户码管理", desc: "生成和管理账户码", icon: Settings, roles: ["ADMIN"] },
    { href: "/dashboard/admin/titles", label: "称号管理", desc: "管理商城和抽奖称号", icon: Tag, roles: ["ADMIN"] },
    { href: "/dashboard/admin/stats", label: "数据统计", desc: "查看平台运营数据", icon: BarChart3, roles: ["ADMIN"] },
    { href: "/dashboard/admin/settings", label: "系统设置", desc: "配置平台运行参数", icon: Settings, roles: ["ADMIN"] },
  ]

  const featureCards = allCards.filter((card) => card.roles.includes(user.role))

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">欢迎回来，{user.username}</h2>
        <p className="text-muted-foreground">今天也要继续努力学习哦</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">等级</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">Lv.{user.level}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">积分</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{user.points}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">经验值</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{user.experience}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">连续打卡</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{user.streakDays} 天</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featureCards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.href} href={card.href}>
              <Card className="hover:shadow-md transition cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-primary" />
                    <CardTitle className="text-lg">{card.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{card.desc}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
