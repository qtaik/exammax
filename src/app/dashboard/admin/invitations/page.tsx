"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Settings,
  Plus,
  Ban,
  Copy,
} from "lucide-react"

interface InvitationItem {
  id: string
  code: string
  status: string
  role: string
  expiresAt: string | null
  usedBy: { username: string } | null
  usedAt: string | null
  createdAt: string
}

const statusLabels: Record<string, string> = {
  UNUSED: "未使用",
  USED: "已使用",
  EXPIRED: "已过期",
  REVOKED: "已撤销",
}

const statusBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  UNUSED: "default",
  USED: "secondary",
  EXPIRED: "outline",
  REVOKED: "destructive",
}

const roleLabels: Record<string, string> = {
  ADMIN: "管理员",
  TEACHER: "教师",
  STUDENT: "学生",
}

export default function AdminInvitationsPage() {
  const [invitations, setInvitations] = useState<InvitationItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  // Generate dialog
  const [generateOpen, setGenerateOpen] = useState(false)
  const [genCount, setGenCount] = useState("10")
  const [genRole, setGenRole] = useState("STUDENT")
  const [genExpiry, setGenExpiry] = useState("")
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])

  const getToken = () => localStorage.getItem("token")

  const fetchInvitations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/api/admin/invitations?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setInvitations(data.invitations)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      console.error("获取邀请码列表失败")
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  const handleGenerate = async () => {
    const count = parseInt(genCount)
    if (!count || count < 1 || count > 100) {
      alert("生成数量须在1-100之间")
      return
    }

    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          count,
          role: genRole,
          expiresAt: genExpiry || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "生成失败")
        return
      }
      const data = await res.json()
      setGeneratedCodes(data.codes)
      fetchInvitations()
    } catch {
      alert("生成失败")
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm("确定要撤销此邀请码吗？")) return
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ id, status: "REVOKED" }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "撤销失败")
        return
      }
      fetchInvitations()
    } catch {
      alert("撤销失败")
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    alert("已复制到剪贴板")
  }

  const copyAllCodes = () => {
    navigator.clipboard.writeText(generatedCodes.join("\n"))
    alert("已复制全部邀请码到剪贴板")
  }

  const truncateCode = (code: string) => {
    if (code.length > 20) return code.slice(0, 10) + "..." + code.slice(-6)
    return code
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString("zh-CN")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" /> 邀请码管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">共 {total} 个邀请码</p>
        </div>
        <Button onClick={() => { setGenerateOpen(true); setGeneratedCodes([]) }}>
          <Plus className="h-4 w-4 mr-2" /> 生成邀请码
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="UNUSED">未使用</SelectItem>
                <SelectItem value="USED">已使用</SelectItem>
                <SelectItem value="EXPIRED">已过期</SelectItem>
                <SelectItem value="REVOKED">已撤销</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">加载中...</p>
          ) : invitations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无邀请码</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">邀请码</th>
                    <th className="text-left py-3 px-2 font-medium">状态</th>
                    <th className="text-left py-3 px-2 font-medium">角色</th>
                    <th className="text-left py-3 px-2 font-medium">使用者</th>
                    <th className="text-left py-3 px-2 font-medium">过期时间</th>
                    <th className="text-left py-3 px-2 font-medium">创建时间</th>
                    <th className="text-left py-3 px-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {truncateCode(inv.code)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyCode(inv.code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={statusBadgeVariant[inv.status] || "default"}>
                          {statusLabels[inv.status] || inv.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">{roleLabels[inv.role] || inv.role}</td>
                      <td className="py-3 px-2">{inv.usedBy?.username || "-"}</td>
                      <td className="py-3 px-2">{formatDate(inv.expiresAt)}</td>
                      <td className="py-3 px-2">{formatDate(inv.createdAt)}</td>
                      <td className="py-3 px-2">
                        {inv.status === "UNUSED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(inv.id)}
                          >
                            <Ban className="h-4 w-4 text-destructive mr-1" />
                            撤销
                          </Button>
                        )}
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

      {/* Generate Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>生成邀请码</DialogTitle>
          </DialogHeader>
          {generatedCodes.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                已生成 {generatedCodes.length} 个邀请码:
              </p>
              <div className="max-h-[300px] overflow-y-auto space-y-1 bg-muted p-3 rounded-md">
                {generatedCodes.map((code, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <code className="text-xs flex-1">{code}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyCode(code)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={copyAllCodes} className="flex-1">
                  复制全部
                </Button>
                <Button onClick={() => { setGeneratedCodes([]); setGenerateOpen(false) }} className="flex-1">
                  完成
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">生成数量</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={genCount}
                  onChange={(e) => setGenCount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">角色</label>
                <Select value={genRole} onValueChange={setGenRole}>
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
              <div className="space-y-2">
                <label className="text-sm font-medium">过期时间 (可选)</label>
                <Input
                  type="datetime-local"
                  value={genExpiry}
                  onChange={(e) => setGenExpiry(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGenerateOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleGenerate}>生成</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
