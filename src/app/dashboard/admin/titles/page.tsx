"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tag, Plus, Pencil, Trash2, ShoppingBag, Star } from "lucide-react"

interface TitleItem {
  id: string
  name: string
  icon: string | null
  price: number
  limited: boolean
  description: string | null
}

export default function AdminTitlesPage() {
  const [titles, setTitles] = useState<TitleItem[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("")
  const [price, setPrice] = useState("0")
  const [limited, setLimited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchTitles = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/admin/titles", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTitles(data.titles || [])
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTitles() }, [fetchTitles])

  const openCreate = () => {
    setEditingId(null)
    setName("")
    setIcon("")
    setPrice("0")
    setLimited(false)
    setDialogOpen(true)
  }

  const openEdit = (t: TitleItem) => {
    setEditingId(t.id)
    setName(t.name)
    setIcon(t.icon || "")
    setPrice(String(t.price))
    setLimited(t.limited)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) { alert("请输入称号名称"); return }
    if (!limited && Number(price) < 0) { alert("请输入有效价格"); return }

    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const body = {
        name: name.trim(),
        icon: icon.trim() || null,
        price: limited ? 0 : Number(price),
        limited,
      }

      const res = await fetch(
        editingId ? `/api/admin/titles/${editingId}` : "/api/admin/titles",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        }
      )

      if (res.ok) {
        setDialogOpen(false)
        await fetchTitles()
      } else {
        const data = await res.json()
        alert(data.error || "操作失败")
      }
    } catch {
      alert("操作失败")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此称号？已拥有该称号的用户将失去它。")) return
    setDeleting(id)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/admin/titles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        await fetchTitles()
      } else {
        const data = await res.json()
        alert(data.error || "删除失败")
      }
    } catch {
      alert("删除失败")
    } finally {
      setDeleting(null)
    }
  }

  const shopTitles = titles.filter((t) => !t.limited)
  const lotteryTitles = titles.filter((t) => t.limited)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="h-6 w-6" /> 称号管理
          </h1>
          <p className="text-muted-foreground mt-1">管理商城与限定奖池称号</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> 新建称号
        </Button>
      </div>

      {/* 商城称号 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" /> 商城称号
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shopTitles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">暂无商城称号</p>
          ) : (
            <div className="space-y-2">
              {shopTitles.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-md border">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">{t.icon || "🏷️"}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.price} 积分</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting === t.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 限定奖池称号 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" /> 限定奖池称号
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lotteryTitles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">暂无限定称号</p>
          ) : (
            <div className="space-y-2">
              {lotteryTitles.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-md border border-yellow-200 bg-yellow-50/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">{t.icon || "🏷️"}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{t.name}</p>
                      <Badge variant="secondary" className="text-xs">仅抽奖获得</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting === t.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑称号" : "新建称号"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">称号名称</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如: 刷题狂魔" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">图标 (emoji)</label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="例如: 👑" />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">称号类型:</label>
              <Button
                variant={limited ? "outline" : "default"}
                size="sm"
                onClick={() => { setLimited(false); if (editingId) setPrice(String(0)) }}
              >
                <ShoppingBag className="h-3 w-3 mr-1" /> 商城
              </Button>
              <Button
                variant={limited ? "default" : "outline"}
                size="sm"
                onClick={() => { setLimited(true); setPrice("0") }}
              >
                <Star className="h-3 w-3 mr-1" /> 限定
              </Button>
            </div>
            {!limited && (
              <div className="space-y-2">
                <label className="text-sm font-medium">价格 (积分)</label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min={0} />
              </div>
            )}
            {limited && (
              <p className="text-sm text-muted-foreground">限定称号仅可通过抽奖获得，无需设置价格。</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : editingId ? "保存修改" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
