"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { User, Trophy, Star, Flame, Shield, Check, X } from "lucide-react"

interface UserInfo {
  id: string
  username: string
  role: string
  points: number
  experience: number
  level: number
  streakDays: number
  activeTitleId: string | null
}

interface Achievement {
  id: string
  name: string
  icon: string | null
  description: string
  earned: boolean
  earnedAt?: string
  equipped?: boolean
}

interface ShopItem {
  id: string
  name: string
  type: string
  price: number
  description: string | null
  icon: string | null
  purchased: boolean
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [shopItems, setShopItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [equipping, setEquipping] = useState<string | null>(null)

  const getToken = () => localStorage.getItem("token")

  const fetchAll = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`

      const [userRes, achRes, shopRes] = await Promise.all([
        fetch("/api/user/me", { headers }),
        fetch("/api/achievements", { headers }),
        fetch("/api/shop", { headers }),
      ])

      if (userRes.ok) {
        const data = await userRes.json()
        setUser(data.user)
      }
      if (achRes.ok) {
        const data = await achRes.json()
        setAchievements(data.achievements || [])
      }
      if (shopRes.ok) {
        const data = await shopRes.json()
        setShopItems(data.items || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleEquipBadge = async (badgeId: string) => {
    if (equipping) return
    setEquipping(badgeId)
    try {
      const token = getToken()
      const res = await fetch("/api/profile/equip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ badgeId }),
      })
      if (res.ok) {
        await fetchAll()
      } else {
        const data = await res.json()
        alert(data.error || "操作失败")
      }
    } catch {
      alert("操作失败")
    } finally {
      setEquipping(null)
    }
  }

  const handleUnequipBadge = async (badgeId: string) => {
    if (equipping) return
    setEquipping(badgeId)
    try {
      const token = getToken()
      const res = await fetch("/api/profile/equip", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ badgeId }),
      })
      if (res.ok) {
        await fetchAll()
      } else {
        const data = await res.json()
        alert(data.error || "操作失败")
      }
    } catch {
      alert("操作失败")
    } finally {
      setEquipping(null)
    }
  }

  const handleSetTitle = async (itemId: string) => {
    try {
      const token = getToken()
      const res = await fetch("/api/profile/title", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId }),
      })
      if (res.ok) {
        await fetchAll()
      } else {
        const data = await res.json()
        alert(data.error || "操作失败")
      }
    } catch {
      alert("操作失败")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">加载失败</p>
      </div>
    )
  }

  const earnedBadges = achievements.filter((a) => a.earned)
  const equippedCount = achievements.filter((a) => a.equipped).length
  const titles = shopItems.filter((item) => item.type === "TITLE" && item.purchased)
  const activeTitle = titles.find((t) => t.id === user.activeTitleId)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <User className="h-6 w-6" />
        个人主页
      </h2>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" /> 等级
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">Lv.{user.level}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4" /> 积分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{user.points}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" /> 经验值
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{user.experience}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4" /> 连续打卡
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{user.streakDays} 天</p>
          </CardContent>
        </Card>
      </div>

      {/* Preview section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">装备预览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">当前称号:</span>
              {activeTitle ? (
                <Badge variant="default">{activeTitle.name}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">未设置</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">装备勋章:</span>
              {equippedCount > 0 ? (
                <div className="flex gap-1">
                  {achievements
                    .filter((a) => a.equipped)
                    .map((a) => (
                      <Badge key={a.id} variant="secondary">
                        {a.icon || a.name}
                      </Badge>
                    ))}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">未装备</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="badges">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="badges">勋章管理</TabsTrigger>
          <TabsTrigger value="titles">称号管理</TabsTrigger>
        </TabsList>

        <TabsContent value="badges" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              已获得 {earnedBadges.length} / {achievements.length} 个勋章
            </p>
            <Badge variant="outline">
              <Shield className="h-3 w-3 mr-1" />
              {equippedCount}/5 已装备
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((badge) => (
              <Card
                key={badge.id}
                className={`transition ${
                  badge.earned
                    ? badge.equipped
                      ? "border-primary shadow-md"
                      : "hover:shadow-md cursor-pointer"
                    : "opacity-50"
                }`}
                onClick={() => {
                  if (!badge.earned) return
                  if (badge.equipped) {
                    handleUnequipBadge(badge.id)
                  } else {
                    handleEquipBadge(badge.id)
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{badge.icon || "🏅"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{badge.name}</h4>
                        {badge.equipped && (
                          <Badge variant="default" className="text-xs">
                            <Check className="h-3 w-3 mr-1" /> 已装备
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {badge.description}
                      </p>
                      {badge.earned && badge.earnedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          获得于 {new Date(badge.earnedAt).toLocaleDateString("zh-CN")}
                        </p>
                      )}
                      {!badge.earned && (
                        <p className="text-xs text-muted-foreground mt-1">未获得</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {achievements.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              暂无勋章
            </div>
          )}
        </TabsContent>

        <TabsContent value="titles" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            已购买 {titles.length} 个称号
          </p>

          {titles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无称号，请前往积分商店购买
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {titles.map((title) => (
                <Card
                  key={title.id}
                  className={`cursor-pointer transition ${
                    title.id === user.activeTitleId
                      ? "border-primary shadow-md"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => handleSetTitle(title.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{title.icon || "🏷️"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{title.name}</h4>
                          {title.id === user.activeTitleId && (
                            <Badge variant="default" className="text-xs">
                              当前使用
                            </Badge>
                          )}
                        </div>
                        {title.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {title.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
