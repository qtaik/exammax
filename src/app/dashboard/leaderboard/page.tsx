"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Trophy, Medal, Crown, Shield, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface BadgeInfo {
  id: string
  name: string
  icon: string | null
}
interface TitleInfo {
  id: string
  name: string
  icon: string | null
}
interface LeaderboardEntry {
  userId: string
  username: string
  role: string
  level: number
  accuracy: number
  correct: number
  total: number
  equippedBadge: BadgeInfo | null
  activeTitle: TitleInfo | null
  showBadgeFirst: boolean
  showBadgeText: boolean
  className: string | null
}
interface ClassEntry {
  id: string
  name: string
  memberCount: number
  activeCount: number
  avgAccuracy: number
}
interface CurrentUserInfo extends LeaderboardEntry {
  rank: number
}

const roleLabels: Record<string, string> = {
  ADMIN: "管理员",
  TEACHER: "教师",
  STUDENT: "学生",
}

export default function LeaderboardPage() {
  const [type, setType] = useState<"practice" | "exam">("practice")
  const [scope, setScope] = useState<"personal" | "class">("personal")
  const [personalData, setPersonalData] = useState<{ practice: LeaderboardEntry[]; exam: LeaderboardEntry[] }>({ practice: [], exam: [] })
  const [classData, setClassData] = useState<{ practice: ClassEntry[]; exam: ClassEntry[] }>({ practice: [], exam: [] })
  const [currentUser, setCurrentUser] = useState<{ practice: CurrentUserInfo | null; exam: CurrentUserInfo | null }>({ practice: null, exam: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`

    const fetchData = (t: string, s: string) =>
      fetch(`/api/leaderboard?type=${t}&scope=${s}`, { headers }).then((r) => r.json())

    Promise.all([
      fetchData("practice", "personal"),
      fetchData("exam", "personal"),
      fetchData("practice", "class"),
      fetchData("exam", "class"),
    ])
      .then(([pPersonal, ePersonal, pClass, eClass]) => {
        setPersonalData({
          practice: pPersonal.leaderboard || [],
          exam: ePersonal.leaderboard || [],
        })
        setClassData({
          practice: pClass.leaderboard || [],
          exam: eClass.leaderboard || [],
        })
        setCurrentUser({
          practice: pPersonal.currentUser || null,
          exam: ePersonal.currentUser || null,
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />
    return <span className="text-sm text-muted-foreground w-5 text-center">{rank}</span>
  }

  const renderBadgeAndTitle = (entry: LeaderboardEntry) => {
    const badgeEl = entry.equippedBadge ? (
      entry.showBadgeText ? (
        <Badge variant="outline" className="text-xs shrink-0">
          {entry.equippedBadge.name}
        </Badge>
      ) : (
        <span className="text-sm" title={entry.equippedBadge.name}>
          {entry.equippedBadge.icon}
        </span>
      )
    ) : null
    const titleEl = entry.activeTitle ? (
      <Badge variant="secondary" className="text-xs shrink-0">
        {entry.activeTitle.icon} {entry.activeTitle.name}
      </Badge>
    ) : null

    if (entry.showBadgeFirst) {
      return <>{badgeEl}{titleEl}</>
    }
    return <>{titleEl}{badgeEl}</>
  }

  const renderPersonalTable = (entries: LeaderboardEntry[], curUser: CurrentUserInfo | null) => {
    if (entries.length === 0) {
      return <div className="text-center py-12 text-muted-foreground">暂无排行数据</div>
    }

    const inList = curUser && entries.some((e) => e.userId === curUser.userId)

    return (
      <div className="space-y-0">
        <div className="grid grid-cols-[50px_1fr_60px_70px_70px] gap-2 px-4 py-3 text-sm font-medium text-muted-foreground border-b">
          <div>排名</div>
          <div>用户</div>
          <div>班级</div>
          <div>正确率</div>
          <div>正确/总</div>
        </div>
        {entries.map((entry, index) => {
          const rank = index + 1
          const isMe = curUser && entry.userId === curUser.userId
          return (
            <div
              key={entry.userId}
              className={cn(
                "grid grid-cols-[50px_1fr_60px_70px_70px] gap-2 px-4 py-3 items-center border-b last:border-b-0",
                isMe && "bg-primary/5 border-l-2 border-l-primary"
              )}
            >
              <div className="flex justify-center">{getRankIcon(rank)}</div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={cn("font-medium truncate text-sm", isMe && "text-primary font-bold")}>
                  {entry.username}
                </span>
                {isMe && <Badge variant="secondary" className="text-xs shrink-0">我</Badge>}
                {renderBadgeAndTitle(entry)}
              </div>
              <div className="text-xs text-muted-foreground truncate">{entry.className || "-"}</div>
              <div className="text-sm font-medium">{entry.accuracy}%</div>
              <div className="text-xs text-muted-foreground">{entry.correct}/{entry.total}</div>
            </div>
          )
        })}
        {!inList && curUser && (
          <>
            <div className="px-4 py-2 text-center text-muted-foreground text-sm">· · ·</div>
            <div className="grid grid-cols-[50px_1fr_60px_70px_70px] gap-2 px-4 py-3 items-center bg-primary/5 border-l-2 border-l-primary">
              <div className="flex justify-center">
                <span className="text-sm font-bold text-primary">{curUser.rank}</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-medium text-sm text-primary font-bold">{curUser.username}</span>
                <Badge variant="secondary" className="text-xs shrink-0">我</Badge>
                {renderBadgeAndTitle(curUser)}
              </div>
              <div className="text-xs text-muted-foreground truncate">{curUser.className || "-"}</div>
              <div className="text-sm font-medium">{curUser.accuracy}%</div>
              <div className="text-xs text-muted-foreground">{curUser.correct}/{curUser.total}</div>
            </div>
          </>
        )}
      </div>
    )
  }

  const renderClassTable = (entries: ClassEntry[]) => {
    if (entries.length === 0) {
      return <div className="text-center py-12 text-muted-foreground">暂无班级排行数据</div>
    }

    return (
      <div className="space-y-0">
        <div className="grid grid-cols-[50px_1fr_80px_80px_80px] gap-2 px-4 py-3 text-sm font-medium text-muted-foreground border-b">
          <div>排名</div>
          <div>班级</div>
          <div>平均正确率</div>
          <div>活跃人数</div>
          <div>总人数</div>
        </div>
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="grid grid-cols-[50px_1fr_80px_80px_80px] gap-2 px-4 py-3 items-center border-b last:border-b-0"
          >
            <div className="flex justify-center">{getRankIcon(index + 1)}</div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-sm truncate">{entry.name}</span>
            </div>
            <div className="text-sm font-medium">{entry.avgAccuracy}%</div>
            <div className="text-sm">{entry.activeCount}</div>
            <div className="text-sm text-muted-foreground">{entry.memberCount}</div>
          </div>
        ))}
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

  const current = type === "practice" ? currentUser.practice : currentUser.exam
  const personal = type === "practice" ? personalData.practice : personalData.exam
  const classL = type === "practice" ? classData.practice : classData.exam

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Trophy className="h-6 w-6" />
        排行榜
      </h2>

      {/* Main type tabs */}
      <Tabs value={type} onValueChange={(v) => setType(v as "practice" | "exam")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="practice">
            <Shield className="h-4 w-4 mr-1" /> 刷题排行榜
          </TabsTrigger>
          <TabsTrigger value="exam">
            <Trophy className="h-4 w-4 mr-1" /> 考试排行榜
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          {/* Sub tabs: personal / class */}
          <Tabs value={scope} onValueChange={(v) => setScope(v as "personal" | "class")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal">个人排行</TabsTrigger>
              <TabsTrigger value="class">班级排行</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {renderPersonalTable(personal, current)}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="class" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {renderClassTable(classL)}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Tabs>
    </div>
  )
}
