"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, ChevronLeft, ChevronRight, Users } from "lucide-react"

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

  const [editDialog, setEditDialog] = useState(false)
  const [editUser, setEditUser] = useState<UserItem | null>(null)
  const [newRole, setNewRole] = useState("")

  const getToken = () => localStorage.getItem("token")

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

  const openEditDialog = (user: UserItem) => {
    setEditUser(user)
    setNewRole(user.role)
    setEditDialog(true)
  }

  const handleUpdateRole = async () => {
    if (!editUser) return
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ userId: editUser.id, role: newRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "更新失败")
        return
      }
      setEditDialog(false)
      fetchUsers()
    } catch {
      alert("更新失败")
    }
  }

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
                    <th className="text-left py-3 px-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-medium">{u.username}</td>
                      <td className="py-3 px-2">
                        <Badge variant={roleBadgeVariant[u.role] || "default"}>
                          {roleLabels[u.role] || u.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">{u.points}</td>
                      <td className="py-3 px-2">Lv.{u.level}</td>
                      <td className="py-3 px-2">{formatDate(u.createdAt)}</td>
                      <td className="py-3 px-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(u)}
                        >
                          修改角色
                        </Button>
                      </td>
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

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改用户角色</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              用户: <span className="font-medium">{editUser?.username}</span>
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">角色</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">学生</SelectItem>
                  <SelectItem value="TEACHER">教师</SelectItem>
                  <SelectItem value="ADMIN">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateRole}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
