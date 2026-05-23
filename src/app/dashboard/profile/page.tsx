"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { User, Trophy, Star, Flame, Shield, Check, Pencil, KeyRound, ArrowUpDown } from "lucide-react"

interface UserInfo {
  id: string
  username: string
  role: string
  points: number
  experience: number
  level: number
  streakDays: number
  activeTitleId: string | null
  showBadgeFirst: boolean
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

  // Edit username
  const [editingUsername, setEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [savingUsername, setSavingUsername] = useState(false)

  // Change password
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  const [badgesDialogOpen, setBadgesDialogOpen] = useState(false)
  const [showBadgeText, setShowBadgeText] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("showBadgeText") === "1"
    }
    return false
  })

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
        setNewUsername(data.user.username)
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

  const handleSaveUsername = async () => {
    if (!newUsername || newUsername.length < 2 || newUsername.length > 20) {
      alert("用户名须在2-20字符之间")
      return
    }
    setSavingUsername(true)
    try {
      const token = getToken()
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: newUsername }),
      })
      if (res.ok) {
        setEditingUsername(false)
        await fetchAll()
      } else {
        const data = await res.json()
        alert(data.error || "修改失败")
      }
    } catch {
      alert("修改失败")
    } finally {
      setSavingUsername(false)
    }
  }

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      alert("请填写旧密码和新密码")
      return
    }
    if (newPassword.length < 6) {
      alert("新密码至少6个字符")
      return
    }
    setSavingPassword(true)
    try {
      const token = getToken()
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, newPassword }),
      })
      if (res.ok) {
        alert("密码修改成功")
        setPasswordOpen(false)
        setOldPassword("")
        setNewPassword("")
      } else {
        const data = await res.json()
        alert(data.error || "修改失败")
      }
    } catch {
      alert("修改失败")
    } finally {
      setSavingPassword(false)
    }
  }

  const handleToggleOrder = async () => {
    try {
      const token = getToken()
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ showBadgeFirst: !user?.showBadgeFirst }),
      })
      if (res.ok) await fetchAll()
    } catch {
      alert("设置失败")
    }
  }

  const handleEquipBadge = async (badgeId: string) => {
    if (equipping) return
    setEquipping(badgeId)
    try {
      const token = getToken()
      const res = await fetch("/api/profile/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  const expToNextLevel = user ? 50 * user.level * (user.level + 1) - user.experience : 0
  const expIntoCurrentLevel = user ? user.experience - 50 * user.level * (user.level - 1) : 0
  const expNeededForNext = 100 * (user?.level || 1)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header: Username + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6" />
            {editingUsername ? (
              <div className="flex items-center gap-2">
                <Input
                  className="w-40"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  maxLength={20}
                />
                <Button size="sm" onClick={handleSaveUsername} disabled={savingUsername}>
                  {savingUsername ? "保存中..." : "保存"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditingUsername(false); setNewUsername(user.username) }}>
                  取消
                </Button>
              </div>
            ) : (
              <>
                {user.username}
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingUsername(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
          <KeyRound className="h-4 w-4 mr-2" />
          修改密码
        </Button>
      </div>

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
            <p className="text-xs text-muted-foreground mt-2">
              距离下一级还需 <span className="font-semibold text-foreground">{expToNextLevel}</span> 经验
            </p>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-secondary">
              <div
                className="h-1.5 rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (expIntoCurrentLevel / expNeededForNext) * 100)}%` }}
              />
            </div>
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

      {/* Equipment Preview + Display Order */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">装备预览</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              const next = !showBadgeText
              setShowBadgeText(next)
              localStorage.setItem("showBadgeText", next ? "1" : "0")
            }}>
              {showBadgeText ? "显示图标" : "显示文字"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleToggleOrder}>
              <ArrowUpDown className="h-4 w-4 mr-1" />
              {user.showBadgeFirst ? "勋章在前" : "称号在前"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            {user.showBadgeFirst ? (
              <>
                <Badge variant="outline" className="text-sm">
                  {showBadgeText ? (
                    achievements.filter((a) => a.equipped)[0]?.name || "未装备勋章"
                  ) : (
                    <>
                      <Shield className="h-3 w-3 mr-1" />
                      {achievements.filter((a) => a.equipped)[0]?.icon}{" "}
                      {achievements.filter((a) => a.equipped)[0]?.name || "未装备勋章"}
                    </>
                  )}
                </Badge>
                <span className="text-muted-foreground text-sm">→</span>
                <Badge variant="outline" className="text-sm">
                  {activeTitle ? `${activeTitle.icon} ${activeTitle.name}` : "未设置称号"}
                </Badge>
              </>
            ) : (
              <>
                <Badge variant="outline" className="text-sm">
                  {activeTitle ? `${activeTitle.icon} ${activeTitle.name}` : "未设置称号"}
                </Badge>
                <span className="text-muted-foreground text-sm">→</span>
                <Badge variant="outline" className="text-sm">
                  {showBadgeText ? (
                    achievements.filter((a) => a.equipped)[0]?.name || "未装备勋章"
                  ) : (
                    <>
                      <Shield className="h-3 w-3 mr-1" />
                      {achievements.filter((a) => a.equipped)[0]?.icon}{" "}
                      {achievements.filter((a) => a.equipped)[0]?.name || "未装备勋章"}
                    </>
                  )}
                </Badge>
              </>
            )}
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
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <Shield className="h-3 w-3 mr-1" />
                {equippedCount}/1 已装备
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setBadgesDialogOpen(true)}>
                查看全部
              </Button>
            </div>
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
                title={badge.name}
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
            <div className="text-center py-12 text-muted-foreground">暂无勋章</div>
          )}
        </TabsContent>

        <TabsContent value="titles" className="space-y-4">
          <p className="text-sm text-muted-foreground">已购买 {titles.length} 个称号</p>

          {titles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无称号，请前往积分商店购买</div>
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
                            <Badge variant="default" className="text-xs">当前使用</Badge>
                          )}
                        </div>
                        {title.description && (
                          <p className="text-xs text-muted-foreground mt-1">{title.description}</p>
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

      {/* Change Password Dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">旧密码</label>
              <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">新密码</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="至少6个字符" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPasswordOpen(false); setOldPassword(""); setNewPassword("") }}>取消</Button>
            <Button onClick={handleChangePassword} disabled={savingPassword}>{savingPassword ? "修改中..." : "确认修改"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Badges Dialog */}
      <Dialog open={badgesDialogOpen} onOpenChange={setBadgesDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>全部勋章 ({earnedBadges.length}/{achievements.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {achievements.map((badge) => (
              <div
                key={badge.id}
                className={`flex items-center gap-4 rounded-lg border p-4 ${
                  badge.earned
                    ? badge.equipped
                      ? "border-primary bg-primary/5"
                      : ""
                    : "opacity-50"
                }`}
              >
                <div className="text-2xl shrink-0">{badge.icon || "🏅"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{badge.name}</h4>
                    {badge.equipped && (
                      <Badge variant="default" className="text-xs">
                        <Check className="h-3 w-3 mr-1" /> 已装备
                      </Badge>
                    )}
                    {!badge.earned && (
                      <Badge variant="outline" className="text-xs">未获得</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{badge.description}</p>
                  {badge.earned && badge.earnedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      获得于 {new Date(badge.earnedAt).toLocaleDateString("zh-CN")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
