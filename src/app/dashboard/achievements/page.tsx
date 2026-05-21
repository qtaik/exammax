"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

interface Achievement {
  id: string
  name: string
  icon: string | null
  description: string
  condition: unknown
  earned: boolean
  earnedAt?: string
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return

    fetch("/api/achievements", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setAchievements(data.achievements || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const earnedCount = achievements.filter((a) => a.earned).length
  const totalCount = achievements.length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6" />
          成就勋章
        </h2>
        <Badge variant="secondary" className="text-sm">
          {earnedCount} / {totalCount} 已获得
        </Badge>
      </div>

      {totalCount === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无可用的成就勋章</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement) => (
            <Card
              key={achievement.id}
              className={cn(
                "transition-all hover:shadow-md",
                !achievement.earned && "opacity-60 grayscale"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {achievement.icon ? (
                      <span className="text-3xl">{achievement.icon}</span>
                    ) : (
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          achievement.earned
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Award className="h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{achievement.name}</CardTitle>
                    </div>
                  </div>
                  {!achievement.earned && (
                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  {achievement.description}
                </p>
                {achievement.earned && achievement.earnedAt && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                    已获得 · {new Date(achievement.earnedAt).toLocaleDateString("zh-CN")}
                  </Badge>
                )}
                {!achievement.earned && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    未达成
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
