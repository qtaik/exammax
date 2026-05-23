"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Search, ChevronLeft, ChevronRight, Users, X, Shield, Coins, Zap, Lock, Award, Crown } from "lucide-react"
import { api } from "@/lib/api"

interface UserItem {
  id: string
  username: string
  role: string
  points: number
  experience: number
  level: number
  streakDays: number
  createdAt: string
}

interface BadgeData {
  id: string
  name: string
  icon: string
}

interface UserBadgeData {
  id: string
  badgeId: string
  badge: BadgeData
  earnedAt: string
}

interface TitleData {
  id: string
  itemId: string
  item: {
    id: string
    name: string
    icon: string
    type: string
  }
}

const roleLabels: Record<string, string> = {
  ADMIN: "管理员",
  TEACHER: "教师",
  STUDENT: "学生",
}

const roleBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ADMIN: "destructive",
  TEACHER: "secondary",
  STUDENT: "default",
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)

  const [editUsername, setEditUsername] = useState("")
  const [editRole, setEditRole] = useState("")
  const [userNameMsg, setUserNameMsg] = useState("")
  const [roleMsg, setRoleMsg] = useState("")

  const [pointsMode, setPointsMode] = useState("set")
  const [pointsAmount, setPointsAmount] = useState("")
  const [pointsMsg, setPointsMsg] = useState("")

  const [expMode, setExpMode] = useState("set")
  const [expAmount, setExpAmount] = useState("")
  const [expMsg, setExpMsg] = useState("")

  const [newPassword, setNewPassword] = useState("")
  const [passwordMsg, setPasswordMsg] = useState("")

  const [userBadges, setUserBadges] = useState<UserBadgeData[]>([])
  const [allBadges, setAllBadges] = useState<BadgeData[]>([])
  const [selectedBadgeId, setSelectedBadgeId] = useState("")
  const [badgeMsg, setBadgeMsg] = useState("")

  const [userTitles, setUserTitles] = useState<TitleData[]>([])
  const [allTitles, setAllTitles] = useState<BadgeData[]>([])
  const [activeTitleId, setActiveTitleId] = useState<string | null>(null)
  const [selectedTitleId, setSelectedTitleId] = useState("")
  const [titleMsg, setTitleMsg] = useState("")

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ users: UserItem[]; total: number; totalPages: number }>("/api/admin/users", {
        params: {
          page: String(page),
          limit: "20",
          search: search || undefined,
          role: roleFilter !== "all" ? roleFilter : undefined,
        },
      })
      setUsers(data.users)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      console.error("获取用户列表失败")
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = () => {
    setPage(1)
    fetchUsers()
  }

  const resetDrawer = () => {
    setEditUsername("")
    setEditRole("")
    setUserNameMsg("")
    setRoleMsg("")
    setPointsMode("set")
    setPointsAmount("")
    setPointsMsg("")
    setExpMode("set")
    setExpAmount("")
    setExpMsg("")
    setNewPassword("")
    setPasswordMsg("")
    setUserBadges([])
    setAllBadges([])
    setSelectedBadgeId("")
    setBadgeMsg("")
    setUserTitles([])
    setAllTitles([])
    setActiveTitleId(null)
    setSelectedTitleId("")
    setTitleMsg("")
  }

  const openDrawer = (u: UserItem) => {
    setSelectedUser(u)
    setEditUsername(u.username)
    setEditRole(u.role)
    setDrawerOpen(true)
    fetchUserBadges(u.id)
    fetchUserTitles(u.id)
  }

  const fetchUserBadges = async (userId: string) => {
    try {
      const data = await api.get<{ userBadges: UserBadgeData[]; allBadges: BadgeData[] }>(`/api/admin/users/${userId}/badges`)
      setUserBadges(data.userBadges)
      setAllBadges(data.allBadges)
    } catch {
      console.error("获取徽章失败")
    }
  }

  const fetchUserTitles = async (userId: string) => {
    try {
      const data = await api.get<{ userTitles: TitleData[]; activeTitleId: string | null; allTitles: BadgeData[] }>(`/api/admin/users/${userId}/title`)
      setUserTitles(data.userTitles)
      setActiveTitleId(data.activeTitleId)
      setAllTitles(data.allTitles || [])
    } catch {
      console.error("获取称号失败")
    }
  }

  const handleUpdateUsername = async () => {
    if (!selectedUser) return
    setUserNameMsg("")
    try {
      await api.patch(`/api/admin/users/${selectedUser.id}`, { username: editUsername })
      setUserNameMsg("已保存")
      fetchUsers()
    } catch (e: any) {
      setUserNameMsg(e.message || "更新失败")
    }
  }

  const handleUpdateRole = async () => {
    if (!selectedUser) return
    setRoleMsg("")
    try {
      await api.patch(`/api/admin/users/${selectedUser.id}`, { role: editRole })
      setRoleMsg("已保存")
      fetchUsers()
    } catch (e: any) {
      setRoleMsg(e.message || "更新失败")
    }
  }

  const handleUpdatePoints = async () => {
    if (!selectedUser) return
    setPointsMsg("")
    const amount = parseInt(pointsAmount)
    if (isNaN(amount)) {
      setPointsMsg("请输入有效数字")
      return
    }
    try {
      const data = await api.patch<{ points: number }>(`/api/admin/users/${selectedUser.id}/points`, { mode: pointsMode, amount })
      setPointsMsg(`已更新 (当前: ${data.points})`)
      setPointsAmount("")
      fetchUsers()
    } catch (e: any) {
      setPointsMsg(e.message || "更新失败")
    }
  }

  const handleUpdateExperience = async () => {
    if (!selectedUser) return
    setExpMsg("")
    const amount = parseInt(expAmount)
    if (isNaN(amount)) {
      setExpMsg("请输入有效数字")
      return
    }
    try {
      const data = await api.patch<{ experience: number; level: number }>(`/api/admin/users/${selectedUser.id}/experience`, { mode: expMode, amount })
      setExpMsg(`已更新 (当前: ${data.experience}, Lv.${data.level})`)
      setExpAmount("")
      fetchUsers()
    } catch (e: any) {
      setExpMsg(e.message || "更新失败")
    }
  }

  const handleResetPassword = async () => {
    if (!selectedUser) return
    setPasswordMsg("")
    if (newPassword.length < 6) {
      setPasswordMsg("密码至少6位")
      return
    }
    try {
      await api.put(`/api/admin/users/${selectedUser.id}/password`, { password: newPassword })
      setPasswordMsg("密码已重置")
      setNewPassword("")
    } catch (e: any) {
      setPasswordMsg(e.message || "重置失败")
    }
  }

  const handleGrantBadge = async () => {
    if (!selectedUser || !selectedBadgeId) return
    setBadgeMsg("")
    try {
      await api.post(`/api/admin/users/${selectedUser.id}/badges`, { badgeId: selectedBadgeId })
      setBadgeMsg("已发放")
      setSelectedBadgeId("")
      fetchUserBadges(selectedUser.id)
    } catch (e: any) {
      setBadgeMsg(e.message || "发放失败")
    }
  }

  const handleRemoveBadge = async (badgeId: string) => {
    if (!selectedUser) return
    try {
      await api.delete(`/api/admin/users/${selectedUser.id}/badges`, {
        params: { badgeId },
      })
      fetchUserBadges(selectedUser.id)
    } catch {
      console.error("移除徽章失败")
    }
  }

  const handleSetTitle = async (titleId: string) => {
    if (!selectedUser) return
    setTitleMsg("")
    try {
      await api.put(`/api/admin/users/${selectedUser.id}/title`, { titleId })
      setTitleMsg("已设置")
      fetchUserTitles(selectedUser.id)
    } catch (e: any) {
      setTitleMsg(e.message || "设置失败")
    }
  }

  const handleUnsetTitle = async () => {
    if (!selectedUser) return
    setTitleMsg("")
    try {
      await api.delete(`/api/admin/users/${selectedUser.id}/title`)
      setTitleMsg("已取消")
      fetchUserTitles(selectedUser.id)
    } catch (e: any) {
      setTitleMsg(e.message || "取消失败")
    }
  }

  const handleGrantTitle = async () => {
    if (!selectedUser || !selectedTitleId) return
    setTitleMsg("")
    try {
      await api.post(`/api/admin/users/${selectedUser.id}/title`, { titleId: selectedTitleId })
      setTitleMsg("已发放")
      setSelectedTitleId("")
      fetchUserTitles(selectedUser.id)
    } catch (e: any) {
      setTitleMsg(e.message || "发放失败")
    }
  }

  const handleRevokeTitle = async (itemId: string) => {
    if (!selectedUser) return
    try {
      await api.delete(`/api/admin/users/${selectedUser.id}/title`, {
        params: { itemId },
      })
      fetchUserTitles(selectedUser.id)
    } catch {
      console.error("收回称号失败")
    }
  }

  const availableBadges = allBadges.filter(
    (b) => !userBadges.some((ub) => ub.badgeId === b.id)
  )

  const availableTitles = allTitles.filter(
    (t) => !userTitles.some((ut) => ut.item.id === t.id)
  )

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> 用户管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">共 {total} 位用户</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2 flex-1">
              <Input
                placeholder="搜索用户名..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="max-w-sm"
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="全部角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                <SelectItem value="STUDENT">学生</SelectItem>
                <SelectItem value="TEACHER">教师</SelectItem>
                <SelectItem value="ADMIN">管理员</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">加载中...</p>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无用户</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">用户名</th>
                    <th className="text-left py-3 px-2 font-medium">角色</th>
                    <th className="text-left py-3 px-2 font-medium">积分</th>
                    <th className="text-left py-3 px-2 font-medium">等级</th>
                    <th className="text-left py-3 px-2 font-medium">注册时间</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => openDrawer(u)}
                    >
                      <td className="py-3 px-2 font-medium">{u.username}</td>
                      <td className="py-3 px-2">
                        <Badge variant={roleBadgeVariant[u.role] || "default"}>
                          {roleLabels[u.role] || u.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">{u.points}</td>
                      <td className="py-3 px-2">Lv.{u.level}</td>
                      <td className="py-3 px-2">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                第 {page} / {totalPages} 页
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={drawerOpen} onOpenChange={(open) => { setDrawerOpen(open); if (!open) resetDrawer() }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {selectedUser?.username}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" /> 基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>用户名</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                    <Button size="sm" onClick={handleUpdateUsername}>保存</Button>
                  </div>
                  {userNameMsg && <p className="text-xs text-muted-foreground mt-1">{userNameMsg}</p>}
                </div>
                <div>
                  <Label>角色</Label>
                  {selectedUser?.role === "ADMIN" ? (
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="destructive">管理员</Badge>
                      <span className="text-xs text-muted-foreground">不可修改</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2 mt-1.5">
                        <Select value={editRole} onValueChange={setEditRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STUDENT">学生</SelectItem>
                            <SelectItem value="TEACHER">教师</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={handleUpdateRole}>保存</Button>
                      </div>
                      {roleMsg && <p className="text-xs text-muted-foreground mt-1">{roleMsg}</p>}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Coins className="h-4 w-4" /> 积分
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">当前: <span className="font-semibold text-foreground">{selectedUser?.points}</span></p>
                <div>
                  <Label>调整积分</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Select value={pointsMode} onValueChange={setPointsMode}>
                      <SelectTrigger className="w-[90px] shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="set">覆盖</SelectItem>
                        <SelectItem value="add">增减</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      className="flex-1"
                      placeholder={pointsMode === "set" ? "目标值" : "+/- 值"}
                      value={pointsAmount}
                      onChange={(e) => setPointsAmount(e.target.value)}
                    />
                    <Button size="sm" onClick={handleUpdatePoints}>确认</Button>
                  </div>
                  {pointsMsg && <p className="text-xs text-muted-foreground mt-1">{pointsMsg}</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" /> 经验
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  当前: <span className="font-semibold text-foreground">{selectedUser?.experience}</span>
                  <span className="mx-1">·</span>
                  Lv.<span className="font-semibold text-foreground">{selectedUser?.level}</span>
                </p>
                <div>
                  <Label>调整经验</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Select value={expMode} onValueChange={setExpMode}>
                      <SelectTrigger className="w-[90px] shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="set">覆盖</SelectItem>
                        <SelectItem value="add">增减</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      className="flex-1"
                      placeholder={expMode === "set" ? "目标值" : "+/- 值"}
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                    />
                    <Button size="sm" onClick={handleUpdateExperience}>确认</Button>
                  </div>
                  {expMsg && <p className="text-xs text-muted-foreground mt-1">{expMsg}</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lock className="h-4 w-4" /> 密码
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>新密码</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      type="password"
                      className="flex-1"
                      placeholder="至少6位"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Button size="sm" variant="destructive" onClick={handleResetPassword}>重置</Button>
                  </div>
                  {passwordMsg && <p className="text-xs text-muted-foreground mt-1">{passwordMsg}</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4" /> 徽章
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {userBadges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {userBadges.map((ub) => (
                      <span
                        key={ub.id}
                        className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs"
                      >
                        {ub.badge.icon} {ub.badge.name}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveBadge(ub.badgeId) }}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {userBadges.length === 0 && (
                  <p className="text-xs text-muted-foreground">暂无徽章</p>
                )}
                {availableBadges.length > 0 && (
                  <div>
                    <Label className="mb-1.5 block">发放徽章</Label>
                    <div className="flex gap-2">
                      <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择徽章..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBadges.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.icon} {b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={handleGrantBadge} disabled={!selectedBadgeId}>发放</Button>
                    </div>
                  </div>
                )}
                {badgeMsg && <p className="text-xs text-muted-foreground mt-1">{badgeMsg}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Crown className="h-4 w-4" /> 称号
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeTitleId && (
                  <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">当前:</span>
                      <span className="font-medium">
                        {userTitles.find((t) => t.item.id === activeTitleId)?.item.icon}{" "}
                        {userTitles.find((t) => t.item.id === activeTitleId)?.item.name}
                      </span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={handleUnsetTitle}>取消</Button>
                  </div>
                )}
                {userTitles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {userTitles.map((ut) => (
                      <span
                        key={ut.id}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${
                          ut.item.id === activeTitleId
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary hover:bg-secondary/80 cursor-pointer"
                        }`}
                        onClick={() => ut.item.id !== activeTitleId && handleSetTitle(ut.item.id)}
                      >
                        {ut.item.icon} {ut.item.name}
                        {ut.item.id !== activeTitleId && (
                          <span className="ml-0.5 text-[10px] opacity-60">设为当前</span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRevokeTitle(ut.item.id) }}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                          title="收回"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {userTitles.length === 0 && !activeTitleId && (
                  <p className="text-xs text-muted-foreground">暂无称号</p>
                )}
                {availableTitles.length > 0 && (
                  <div>
                    <Label className="mb-1.5 block">发放称号</Label>
                    <div className="flex gap-2">
                      <Select value={selectedTitleId} onValueChange={setSelectedTitleId}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择称号..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTitles.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={handleGrantTitle} disabled={!selectedTitleId}>发放</Button>
                    </div>
                  </div>
                )}
                {titleMsg && <p className="text-xs text-muted-foreground mt-1">{titleMsg}</p>}
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
