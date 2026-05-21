"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Trophy, Medal, Crown } from "lucide-react"
import { cn } from "@/lib/utils"

interface EquippedBadge {
  id: string
  name: string
  icon: string | null
}

interface LeaderboardUser {
  id: string
  username: string
  role: string
  points: number
  experience: number
  level: number
  streakDays: number
  activeTitle?: { name: string } | null
  equippedBadges?: EquippedBadge[]
}

interface CurrentUserInfo {
  id: string
  username: string
  role: string
  points: number
  experience: number
  level: number
  streakDays: number
  rank: number
  activeTitle?: { name: string } | null
  equippedBadges?: EquippedBadge[]
}

const roleLabels: Record<string, string> = {
  ADMIN: "管理员",
  TEACHER: "教师",
  STUDENT: "学生",
}

export default function LeaderboardPage() {
  const [pointsLeaderboard, setPointsLeaderboard] = useState<LeaderboardUser[]>([])
  const [expLeaderboard, setExpLeaderboard] = useState<LeaderboardUser[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserPoints, setCurrentUserPoints] = useState<CurrentUserInfo | null>(null)
  const [currentUserExp, setCurrentUserExp] = useState<CurrentUserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        setCurrentUserId(payload.userId)
      } catch {
        // ignore
      }
    }

    const fetchLeaderboard = async (type: string) => {
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`

      const res = await fetch(`/api/leaderboard?type=${type}&limit=50`, { headers })
      if (res.ok) {
        return res.json()
      }
      return null
    }

    Promise.all([fetchLeaderboard("points"), fetchLeaderboard("experience")])
      .then(([pointsData, expData]) => {
        if (pointsData) {
          setPointsLeaderboard(pointsData.leaderboard || [])
          setCurrentUserPoints(pointsData.currentUser || null)
        }
        if (expData) {
          setExpLeaderboard(expData.leaderboard || [])
          setCurrentUserExp(expData.currentUser || null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />
    return <span className="text-sm text-muted-foreground w-5 text-center">{rank}</span>
  }

  const renderBadges = (badges?: EquippedBadge[]) => {
    if (!badges || badges.length === 0) return null
    return (
      <div className="flex gap-0.5">
        {badges.slice(0, 5).map((b) => (
          <span key={b.id} className="text-xs" title={b.name}>
            {b.icon || "🏅"}
          </span>
        ))}
      </div>
    )
  }

  const renderUserCell = (
    user: { username: string; role: string; activeTitle?: { name: string } | null; equippedBadges?: EquippedBadge[] },
    isMe: boolean
  ) => (
    <div className="flex items-center gap-2 min-w-0">
      <span className={cn("font-medium truncate", isMe && "text-primary font-bold")}>
        {user.username}
      </span>
      {user.activeTitle && (
        <Badge variant="secondary" className="text-xs shrink-0">
          {user.activeTitle.name}
        </Badge>
      )}
      {isMe && (
        <Badge variant="secondary" className="text-xs shrink-0">
          我
        </Badge>
      )}
      <Badge variant="outline" className="text-xs shrink-0">
        {roleLabels[user.role] || user.role}
      </Badge>
      {renderBadges(user.equippedBadges)}
    </div>
  )

  const renderTable = (
    leaderboard: LeaderboardUser[],
    field: "points" | "experience",
    currentUser: CurrentUserInfo | null
  ) => {
    if (leaderboard.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          暂无排行数据
        </div>
      )
    }

    const isInTop = leaderboard.some((u) => u.id === currentUserId)

    return (
      <div className="space-y-0">
        {/* Table header */}
        <div className="grid grid-cols-[60px_1fr_80px_100px_80px] gap-2 px-4 py-3 text-sm font-medium text-muted-foreground border-b">
          <div>排名</div>
          <div>用户</div>
          <div>等级</div>
          <div>{field === "points" ? "积分" : "经验值"}</div>
          <div>连续打卡</div>
        </div>

        {/* Table rows */}
        {leaderboard.map((user, index) => {
          const rank = index + 1
          const isMe = user.id === currentUserId

          return (
            <div
              key={user.id}
              className={cn(
                "grid grid-cols-[60px_1fr_80px_100px_80px] gap-2 px-4 py-3 items-center border-b last:border-b-0 transition-colors",
                isMe && "bg-primary/5 border-l-2 border-l-primary"
              )}
            >
              <div className="flex items-center justify-center">
                {getRankIcon(rank)}
              </div>
              {renderUserCell(user, isMe)}
              <div className="text-sm">Lv.{user.level}</div>
              <div className="text-sm font-medium">
                {field === "points" ? user.points : user.experience}
              </div>
              <div className="text-sm">{user.streakDays} 天</div>
            </div>
          )
        })}

        {/* Current user rank if not in top */}
        {!isInTop && currentUser && (
          <>
            <div className="px-4 py-2 text-center text-muted-foreground text-sm">
              · · ·
            </div>
            <div className="grid grid-cols-[60px_1fr_80px_100px_80px] gap-2 px-4 py-3 items-center bg-primary/5 border-l-2 border-l-primary border-b">
              <div className="flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{currentUser.rank}</span>
              </div>
              {renderUserCell(currentUser, true)}
              <div className="text-sm">Lv.{currentUser.level}</div>
              <div className="text-sm font-medium">
                {field === "points" ? currentUser.points : currentUser.experience}
              </div>
              <div className="text-sm">{currentUser.streakDays} 天</div>
            </div>
          </>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Trophy className="h-6 w-6" />
        排行榜
      </h2>

      <Tabs defaultValue="points">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="points">积分排行</TabsTrigger>
          <TabsTrigger value="experience">经验排行</TabsTrigger>
        </TabsList>

        <TabsContent value="points">
          <Card>
            <CardContent className="p-0">
              {renderTable(pointsLeaderboard, "points", currentUserPoints)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experience">
          <Card>
            <CardContent className="p-0">
              {renderTable(expLeaderboard, "experience", currentUserExp)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
