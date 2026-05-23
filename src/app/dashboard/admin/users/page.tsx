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
import { Search, ChevronLeft, ChevronRight, Users, X } from "lucide-react"

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

function getToken() {
  return localStorage.getItem("token")
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
  const [activeTitleId, setActiveTitleId] = useState<string | null>(null)
  const [titleMsg, setTitleMsg] = useState("")

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (search) params.set("search", search)
      if (roleFilter && roleFilter !== "all") params.set("role", roleFilter)

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
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
    setActiveTitleId(null)
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
      const res = await fetch(`/api/admin/users/${userId}/badges`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUserBadges(data.userBadges)
        setAllBadges(data.allBadges)
      }
    } catch {
      console.error("获取徽章失败")
    }
  }

  const fetchUserTitles = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/title`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUserTitles(data.userTitles)
        setActiveTitleId(data.activeTitleId)
      }
    } catch {
      console.error("获取称号失败")
    }
  }

  const handleUpdateUsername = async () => {
    if (!selectedUser) return
    setUserNameMsg("")
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ username: editUsername }),
      })
      const data = await res.json()
      if (!res.ok) {
        setUserNameMsg(data.error || "更新失败")
        return
      }
      setUserNameMsg("已保存")
      fetchUsers()
    } catch {
      setUserNameMsg("更新失败")
    }
  }

  const handleUpdateRole = async () => {
    if (!selectedUser) return
    setRoleMsg("")
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ role: editRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRoleMsg(data.error || "更新失败")
        return
      }
      setRoleMsg("已保存")
      fetchUsers()
    } catch {
      setRoleMsg("更新失败")
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
      const res = await fetch(`/api/admin/users/${selectedUser.id}/points`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ mode: pointsMode, amount }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPointsMsg(data.error || "更新失败")
        return
      }
      setPointsMsg(`已更新 (当前: ${data.points})`)
      setPointsAmount("")
      fetchUsers()
    } catch {
      setPointsMsg("更新失败")
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
      const res = await fetch(`/api/admin/users/${selectedUser.id}/experience`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ mode: expMode, amount }),
      })
      const data = await res.json()
      if (!res.ok) {
        setExpMsg(data.error || "更新失败")
        return
      }
      setExpMsg(`已更新 (当前: ${data.experience}, Lv.${data.level})`)
      setExpAmount("")
      fetchUsers()
    } catch {
      setExpMsg("更新失败")
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
      const res = await fetch(`/api/admin/users/${selectedUser.id}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPasswordMsg(data.error || "重置失败")
        return
      }
      setPasswordMsg("密码已重置")
      setNewPassword("")
    } catch {
      setPasswordMsg("重置失败")
    }
  }

  const handleGrantBadge = async () => {
    if (!selectedUser || !selectedBadgeId) return
    setBadgeMsg("")
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/badges`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ badgeId: selectedBadgeId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setBadgeMsg(data.error || "发放失败")
        return
      }
      setBadgeMsg("已发放")
      setSelectedBadgeId("")
      fetchUserBadges(selectedUser.id)
    } catch {
      setBadgeMsg("发放失败")
    }
  }

  const handleRemoveBadge = async (badgeId: string) => {
    if (!selectedUser) return
    try {
      await fetch(`/api/admin/users/${selectedUser.id}/badges?badgeId=${badgeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
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
      const res = await fetch(`/api/admin/users/${selectedUser.id}/title`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ titleId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setTitleMsg(data.error || "设置失败")
        return
      }
      setTitleMsg("已设置")
      fetchUserTitles(selectedUser.id)
    } catch {
      setTitleMsg("设置失败")
    }
  }

  const handleUnsetTitle = async () => {
    if (!selectedUser) return
    setTitleMsg("")
    try {
      await fetch(`/api/admin/users/${selectedUser.id}/title`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      setTitleMsg("已取消")
      fetchUserTitles(selectedUser.id)
    } catch {
      setTitleMsg("取消失败")
    }
  }

  const availableBadges = allBadges.filter(
    (b) => !userBadges.some((ub) => ub.badgeId === b.id)
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
            <SheetTitle>{selectedUser?.username}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-8">
            <section className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">基本信息</h3>
              <div className="space-y-2">
                <Label className="text-xs">用户名</Label>
                <div className="flex gap-2">
                  <Input
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                  />
                  <Button size="sm" onClick={handleUpdateUsername}>保存</Button>
                </div>
                {userNameMsg && <p className="text-xs text-muted-foreground">{userNameMsg}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">角色</Label>
                <div className="flex gap-2">
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">学生</SelectItem>
                      <SelectItem value="TEACHER">教师</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleUpdateRole}>保存</Button>
                </div>
                {roleMsg && <p className="text-xs text-muted-foreground">{roleMsg}</p>}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                积分 <span className="font-normal normal-case text-xs">(当前: {selectedUser?.points})</span>
              </h3>
              <div className="flex gap-2">
                <Select value={pointsMode} onValueChange={setPointsMode}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set">覆盖</SelectItem>
                    <SelectItem value="add">增减</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder={pointsMode === "set" ? "目标值" : "+/- 值"}
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                />
                <Button size="sm" onClick={handleUpdatePoints}>确认</Button>
              </div>
              {pointsMsg && <p className="text-xs text-muted-foreground">{pointsMsg}</p>}
            </section>

            <section className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                经验 <span className="font-normal normal-case text-xs">(当前: {selectedUser?.experience}, Lv.{selectedUser?.level})</span>
              </h3>
              <div className="flex gap-2">
                <Select value={expMode} onValueChange={setExpMode}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set">覆盖</SelectItem>
                    <SelectItem value="add">增减</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder={expMode === "set" ? "目标值" : "+/- 值"}
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                />
                <Button size="sm" onClick={handleUpdateExperience}>确认</Button>
              </div>
              {expMsg && <p className="text-xs text-muted-foreground">{expMsg}</p>}
            </section>

            <section className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">密码</h3>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="新密码 (至少6位)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button size="sm" variant="destructive" onClick={handleResetPassword}>重置</Button>
              </div>
              {passwordMsg && <p className="text-xs text-muted-foreground">{passwordMsg}</p>}
            </section>

            <section className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">徽章</h3>
              {userBadges.length === 0 ? (
                <p className="text-xs text-muted-foreground">暂无徽章</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {userBadges.map((ub) => (
                    <span
                      key={ub.id}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"
                    >
                      {ub.badge.icon} {ub.badge.name}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveBadge(ub.badgeId) }}
                        className="ml-0.5 rounded-full hover:bg-destructive/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {availableBadges.length > 0 && (
                <div className="flex gap-2">
                  <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                    <SelectTrigger className="flex-1">
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
              )}
              {badgeMsg && <p className="text-xs text-muted-foreground">{badgeMsg}</p>}
            </section>

            <section className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">称号</h3>
              {activeTitleId && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">当前:</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                    {userTitles.find((t) => t.item.id === activeTitleId)?.item.icon}{" "}
                    {userTitles.find((t) => t.item.id === activeTitleId)?.item.name}
                  </span>
                  <Button size="sm" variant="ghost" onClick={handleUnsetTitle}>取消</Button>
                </div>
              )}
              {userTitles.length === 0 ? (
                <p className="text-xs text-muted-foreground">暂无称号</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {userTitles.map((ut) => (
                    <span
                      key={ut.id}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                        ut.item.id === activeTitleId
                          ? "bg-primary/10 font-medium"
                          : "bg-secondary"
                      }`}
                    >
                      {ut.item.icon} {ut.item.name}
                      {ut.item.id !== activeTitleId && (
                        <button
                          onClick={() => handleSetTitle(ut.item.id)}
                          className="ml-0.5 text-primary hover:underline text-[10px]"
                        >
                          设
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
              {titleMsg && <p className="text-xs text-muted-foreground">{titleMsg}</p>}
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
