"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { BookOpen, Trophy, ShoppingBag, RotateCcw, BarChart3, Users, HelpCircle, Settings, LogOut, Home, CalendarCheck, Award, User, FileText, School, Sparkles, Tag } from "lucide-react"

interface User {
  id: string
  username: string
  role: string
}

const navItems = [
  { href: "/dashboard", label: "首页", icon: Home, roles: ["STUDENT", "TEACHER", "ADMIN"] },
  { href: "/dashboard/practice", label: "开始刷题", icon: BookOpen, roles: ["STUDENT", "TEACHER", "ADMIN"] },
  { href: "/dashboard/classes", label: "我的班级", icon: School, roles: ["STUDENT"] },
  { href: "/dashboard/exams", label: "我的考试", icon: FileText, roles: ["STUDENT"] },
  { href: "/dashboard/history", label: "错题回顾", icon: RotateCcw, roles: ["STUDENT", "TEACHER", "ADMIN"] },
  { href: "/dashboard/checkin", label: "签到打卡", icon: CalendarCheck, roles: ["STUDENT", "TEACHER", "ADMIN"] },
  { href: "/dashboard/leaderboard", label: "排行榜", icon: Trophy, roles: ["STUDENT", "TEACHER", "ADMIN"] },
  { href: "/dashboard/achievements", label: "成就勋章", icon: Award, roles: ["STUDENT", "TEACHER", "ADMIN"] },
  { href: "/dashboard/shop", label: "积分商店", icon: ShoppingBag, roles: ["STUDENT", "TEACHER", "ADMIN"] },
  { href: "/dashboard/lottery", label: "积分抽奖", icon: Sparkles, roles: ["STUDENT", "TEACHER", "ADMIN"] },
  { href: "/dashboard/profile", label: "个人主页", icon: User, roles: ["STUDENT", "TEACHER", "ADMIN"] },
]

const adminItems = [
  { href: "/dashboard/teacher/classes", label: "班级管理", icon: School, roles: ["TEACHER", "ADMIN"] },
  { href: "/dashboard/teacher/exams", label: "考试管理", icon: FileText, roles: ["TEACHER", "ADMIN"] },
  { href: "/dashboard/teacher/questions", label: "题库管理", icon: HelpCircle, roles: ["TEACHER", "ADMIN"] },
  { href: "/dashboard/admin/users", label: "用户管理", icon: Users, roles: ["ADMIN"] },
  { href: "/dashboard/admin/questions", label: "题库管理", icon: HelpCircle, roles: ["ADMIN"] },
  { href: "/dashboard/admin/account-codes", label: "账户码管理", icon: Settings, roles: ["ADMIN"] },
  { href: "/dashboard/admin/titles", label: "称号管理", icon: Tag, roles: ["ADMIN"] },
  { href: "/dashboard/admin/stats", label: "数据统计", icon: BarChart3, roles: ["ADMIN"] },
  { href: "/dashboard/admin/settings", label: "系统设置", icon: Settings, roles: ["ADMIN"] },
]

const roleLabels: Record<string, string> = {
  ADMIN: "管理员",
  TEACHER: "教师",
  STUDENT: "学生",
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    api.get<{ user: User }>("/api/user/me")
      .then((data) => setUser(data.user))
      .catch(() => {
        // api client handles session-kicked redirect; for other errors just go to login
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/login")
      })
      .finally(() => setLoading(false))
  }, [router])

  // Heartbeat: check session every 30 seconds
  const heartRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const check = () => {
      const token = localStorage.getItem("token")
      if (!token) {
        window.location.replace("/login")
        return
      }
      api.get("/api/user/me").catch(() => {})
    }

    check()
    heartRef.current = setInterval(check, 30_000)

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        check()
        if (!heartRef.current) {
          heartRef.current = setInterval(check, 30_000)
        }
      } else {
        if (heartRef.current) {
          clearInterval(heartRef.current)
          heartRef.current = null
        }
      }
    }

    // bfcache restoration: re-check auth when browser restores page from cache
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        check()
      }
    }
    window.addEventListener("pageshow", onPageShow)

    document.addEventListener("visibilitychange", onVisible)

    return () => {
      if (heartRef.current) clearInterval(heartRef.current)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("pageshow", onPageShow)
    }
  }, [])

  const handleLogout = async () => {
    api.post("/api/auth/logout").catch(() => {})
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (!user) return null

  const allNavItems = [...navItems, ...adminItems].filter((item) =>
    item.roles.includes(user.role)
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">ExamMax</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {user.username} · {roleLabels[user.role] || user.role}
          </p>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {allNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-2 border-t">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
