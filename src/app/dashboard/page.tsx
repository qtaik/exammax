"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Trophy, ShoppingBag, ClipboardList, BarChart3, Users, HelpCircle, Settings, CalendarCheck, Award, User } from "lucide-react"

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
    const token = localStorage.getItem("token")
    if (!token) return
    fetch("/api/user/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch(() => {})
  }, [])

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  const featureCards = [
    { href: "/dashboard/practice", label: "开始刷题", desc: "随机出题，开始练习", icon: BookOpen, roles: ["STUDENT", "TEACHER", "ADMIN"] },
    { href: "/dashboard/history", label: "答题历史", desc: "查看历史答题记录", icon: ClipboardList, roles: ["STUDENT", "TEACHER", "ADMIN"] },
    { href: "/dashboard/checkin", label: "签到打卡", desc: "每日签到获取积分奖励", icon: CalendarCheck, roles: ["STUDENT", "TEACHER", "ADMIN"] },
    { href: "/dashboard/leaderboard", label: "排行榜", desc: "查看积分排名", icon: Trophy, roles: ["STUDENT", "TEACHER", "ADMIN"] },
    { href: "/dashboard/achievements", label: "成就勋章", desc: "查看已获得的勋章和成就", icon: Award, roles: ["STUDENT", "TEACHER", "ADMIN"] },
    { href: "/dashboard/shop", label: "积分商店", desc: "用积分兑换勋章和称号", icon: ShoppingBag, roles: ["STUDENT", "TEACHER", "ADMIN"] },
    { href: "/dashboard/profile", label: "个人主页", desc: "查看个人信息和装备", icon: User, roles: ["STUDENT", "TEACHER", "ADMIN"] },
    { href: "/dashboard/admin/questions", label: "题库管理", desc: "管理分类和题目", icon: HelpCircle, roles: ["ADMIN"] },
    { href: "/dashboard/admin/invitations", label: "邀请码管理", desc: "生成和管理邀请码", icon: Settings, roles: ["ADMIN"] },
    { href: "/dashboard/admin/users", label: "用户管理", desc: "管理平台用户", icon: Users, roles: ["ADMIN"] },
    { href: "/dashboard/admin/stats", label: "数据统计", desc: "查看平台运营数据", icon: BarChart3, roles: ["ADMIN"] },
  ].filter((card) => card.roles.includes(user.role))

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
