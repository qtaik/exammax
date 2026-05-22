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
  Clock,
  Undo2,
  Trash2,
} from "lucide-react"

interface AccountCodeItem {
  id: string
  code: string
  status: string
  role: string
  expiresAt: string | null
  boundUser: { id: string; username: string } | null
  createdBy: { id: string; username: string } | null
  createdAt: string
}

const statusLabels: Record<string, string> = {
  ACTIVE: "有效",
  EXPIRED: "已过期",
  REVOKED: "已吊销",
}

const statusBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  EXPIRED: "outline",
  REVOKED: "destructive",
}

const roleLabels: Record<string, string> = {
  ADMIN: "管理员",
  TEACHER: "教师",
  STUDENT: "学生",
}

export default function AdminAccountCodesPage() {
  const [codes, setCodes] = useState<AccountCodeItem[]>([])
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

  // Extend dialog
  const [extendOpen, setExtendOpen] = useState<AccountCodeItem | null>(null)
  const [extendExpiry, setExtendExpiry] = useState("")

  const getToken = () => localStorage.getItem("token")

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/api/admin/account-codes?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCodes(data.codes)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      console.error("获取账户码列表失败")
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchCodes()
  }, [fetchCodes])

  const handleGenerate = async () => {
    const count = parseInt(genCount)
    if (!count || count < 1 || count > 100) {
      alert("生成数量须在1-100之间")
      return
    }

    try {
      const res = await fetch("/api/admin/account-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          count,
          role: genRole,
          expiresAt: genExpiry ? new Date(genExpiry).toISOString() : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "生成失败")
        return
      }
      const data = await res.json()
      setGeneratedCodes(data.codes.map((c: AccountCodeItem) => c.code))
      fetchCodes()
    } catch {
      alert("生成失败")
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm("确定要吊销此账户码吗？绑定用户将无法登录")) return
    try {
      const res = await fetch(`/api/admin/account-codes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ action: "revoke" }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "操作失败")
        return
      }
      fetchCodes()
    } catch {
      alert("操作失败")
    }
  }

  const handleReinstate = async (id: string) => {
    if (!confirm("确定要恢复此账户码吗？")) return
    try {
      const res = await fetch(`/api/admin/account-codes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ action: "reinstate" }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "操作失败")
        return
      }
      fetchCodes()
    } catch {
      alert("操作失败")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除此账户码吗？此操作不可撤销")) return
    try {
      const res = await fetch(`/api/admin/account-codes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "删除失败")
        return
      }
      fetchCodes()
    } catch {
      alert("删除失败")
    }
  }

  const handleExtend = async () => {
    if (!extendOpen || !extendExpiry) return
    try {
      const res = await fetch(`/api/admin/account-codes/${extendOpen.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ action: "extend", expiresAt: new Date(extendExpiry).toISOString() }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "延期失败")
        return
      }
      setExtendOpen(null)
      fetchCodes()
    } catch {
      alert("延期失败")
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    alert("已复制到剪贴板")
  }

  const copyAllCodes = () => {
    navigator.clipboard.writeText(generatedCodes.join("\n"))
    alert("已复制全部账户码到剪贴板")
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
            <Settings className="h-6 w-6" /> 账户码管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">共 {total} 个账户码</p>
        </div>
        <Button onClick={() => { setGenerateOpen(true); setGeneratedCodes([]) }}>
          <Plus className="h-4 w-4 mr-2" /> 生成账户码
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
                <SelectItem value="ACTIVE">有效</SelectItem>
                <SelectItem value="EXPIRED">已过期</SelectItem>
                <SelectItem value="REVOKED">已吊销</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">加载中...</p>
          ) : codes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无账户码</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">账户码</th>
                    <th className="text-left py-3 px-2 font-medium">状态</th>
                    <th className="text-left py-3 px-2 font-medium">角色</th>
                    <th className="text-left py-3 px-2 font-medium">绑定用户</th>
                    <th className="text-left py-3 px-2 font-medium">过期时间</th>
                    <th className="text-left py-3 px-2 font-medium">创建时间</th>
                    <th className="text-left py-3 px-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code) => (
                    <tr key={code.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {truncateCode(code.code)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyCode(code.code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={statusBadgeVariant[code.status] || "default"}>
                          {statusLabels[code.status] || code.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">{roleLabels[code.role] || code.role}</td>
                      <td className="py-3 px-2">{code.boundUser?.username || "-"}</td>
                      <td className="py-3 px-2">{formatDate(code.expiresAt)}</td>
                      <td className="py-3 px-2">{formatDate(code.createdAt)}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          {(code.status === "ACTIVE" || code.status === "EXPIRED" || code.status === "REVOKED") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setExtendOpen(code)
                                setExtendExpiry(code.expiresAt ? (() => { const d = new Date(code.expiresAt); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + 'T' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') })() : "")
                              }}
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              延期
                            </Button>
                          )}
                          {code.status === "ACTIVE" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevoke(code.id)}
                            >
                              <Ban className="h-4 w-4 text-destructive mr-1" />
                              吊销
                            </Button>
                          )}
                          {code.status === "REVOKED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReinstate(code.id)}
                            >
                              <Undo2 className="h-4 w-4 mr-1" />
                              恢复
                            </Button>
                          )}
                          {!code.boundUser && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(code.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive mr-1" />
                              删除
                            </Button>
                          )}
                        </div>
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
            <DialogTitle>生成账户码</DialogTitle>
          </DialogHeader>
          {generatedCodes.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                已生成 {generatedCodes.length} 个账户码:
              </p>
              <div className="max-h-[300px] overflow-y-auto space-y-1 bg-muted p-3 rounded-md">
                {generatedCodes.map((code, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <code className="text-xs flex-1 break-all">{code}</code>
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

      {/* Extend Dialog */}
      <Dialog open={!!extendOpen} onOpenChange={() => setExtendOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>延期账户码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              当前绑定用户：{extendOpen?.boundUser?.username || "无"}
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">新过期时间</label>
              <Input
                type="datetime-local"
                value={extendExpiry}
                onChange={(e) => setExtendExpiry(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(null)}>
              取消
            </Button>
            <Button onClick={handleExtend} disabled={!extendExpiry}>
              确认延期
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
