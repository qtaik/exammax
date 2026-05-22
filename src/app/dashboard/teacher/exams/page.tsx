"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus, Trash2, Eye, Clock, Timer, GripVertical,
  Shuffle, FileText, Users, ChevronRight,
} from "lucide-react"

interface Class {
  id: string; name: string
}

interface Question {
  id: string; type: string; content: string
  options: string[] | null
  answer: string
  category: { name: string }
}

interface ExamItem {
  id: string; title: string; description: string | null
  deadline: string; classId: string
  questionIds: string[]; questionOrder: string
  perQuestionTime: number | null; maxTabSwitches: number
  _count: { submissions: number }
}

export default function TeacherExamsPage() {
  const router = useRouter()
  const [exams, setExams] = useState<ExamItem[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState("")
  const [loading, setLoading] = useState(true)
  const [createDialog, setCreateDialog] = useState(false)

  // Create form
  const [formTitle, setFormTitle] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formDeadline, setFormDeadline] = useState("")
  const [formOrder, setFormOrder] = useState("manual")
  const [formPerTime, setFormPerTime] = useState("")
  const [formMaxSwitches, setFormMaxSwitches] = useState("3")
  const [questionPool, setQuestionPool] = useState<Question[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [randomCount, setRandomCount] = useState("")
  const [saving, setSaving] = useState(false)
  const [previewQ, setPreviewQ] = useState<Question | null>(null)

  const fetchExams = useCallback(async () => {
    if (!selectedClass) return
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/tasks?classId=${selectedClass}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setExams((await res.json()).tasks || [])
    } catch {} finally { setLoading(false) }
  }, [selectedClass])

  useEffect(() => {
    const token = localStorage.getItem("token")
    fetch("/api/classes", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => {
        setClasses(d.classes || [])
        if (d.classes?.length > 0) setSelectedClass(d.classes[0].id)
      })
  }, [])

  useEffect(() => { if (selectedClass) fetchExams() }, [fetchExams])

  const openCreate = async () => {
    setCreateDialog(true)
    setFormTitle(""); setFormDesc(""); setFormDeadline("")
    setFormOrder("manual"); setFormPerTime(""); setFormMaxSwitches("3")
    setSelectedIds([])
    setRandomCount("")
    try {
      const res = await fetch("/api/practice?mode=all")
      setQuestionPool((await res.json()).questions || [])
    } catch {}
  }

  const toggleQuestion = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const moveQuestion = (id: string, dir: -1 | 1) => {
    const idx = selectedIds.indexOf(id)
    if (idx < 0) return
    const next = [...selectedIds]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setSelectedIds(next)
  }

  const handleShuffle = () => {
    setSelectedIds([...selectedIds].sort(() => Math.random() - 0.5))
  }

  const handleRandomSelect = () => {
    const count = parseInt(randomCount)
    if (!count || count < 1 || count > questionPool.length) return
    const available = questionPool.filter((q) => !selectedIds.includes(q.id))
    const shuffled = [...available].sort(() => Math.random() - 0.5)
    const picked = shuffled.slice(0, Math.min(count, available.length))
    setSelectedIds((prev) => [...prev, ...picked.map((q) => q.id)])
    setRandomCount("")
  }

  const handleCreate = async () => {
    if (!formTitle.trim() || !formDeadline || selectedIds.length === 0) return
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          classId: selectedClass,
          title: formTitle,
          description: formDesc,
          deadline: formDeadline,
          questionIds: selectedIds,
          questionOrder: formOrder,
          perQuestionTime: formPerTime ? parseInt(formPerTime) : null,
          maxTabSwitches: parseInt(formMaxSwitches) || 3,
        }),
      })
      setCreateDialog(false)
      fetchExams()
    } catch {} finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该考试？")) return
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchExams()
    } catch {}
  }

  const formatDate = (d: string) => new Date(d).toLocaleString("zh-CN")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> 考试管理</h1>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="选择班级" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> 发布考试</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">加载中...</p></div>
      ) : exams.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">该班级暂无考试</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {exams.map((e) => {
            const now = new Date()
            const isActive = new Date(e.deadline) > now
            return (
              <Card key={e.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{e.title}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {isActive ? "进行中" : "已截止"}
                        </Badge>
                        <Badge variant="outline">{(e.questionIds as string[]).length}题</Badge>
                        <Badge variant="outline"><Users className="h-3 w-3 mr-1" />{e._count.submissions}</Badge>
                        {e.perQuestionTime && <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{e.perQuestionTime}s/题</Badge>}
                        <span className="text-xs text-muted-foreground">截止 {formatDate(e.deadline)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/teacher/exams/${e.id}`)}>
                        <Eye className="h-3 w-3 mr-1" /> 成绩
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete(e.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Exam Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader><DialogTitle>发布新考试</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="考试标题" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            <Input placeholder="考试描述（可选）" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">截止时间</label>
                <Input type="datetime-local" value={formDeadline} onChange={(e) => setFormDeadline(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">题目顺序</label>
                <Select value={formOrder} onValueChange={setFormOrder}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">手动排序</SelectItem>
                    <SelectItem value="shuffle">自动打乱</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">每题时限（秒，留空不限）</label>
                <Input type="number" placeholder="如 60" value={formPerTime} onChange={(e) => setFormPerTime(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">最大切屏次数</label>
                <Input type="number" value={formMaxSwitches} onChange={(e) => setFormMaxSwitches(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">选题（已选 {selectedIds.length} 题）</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-14 rounded-md border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary"
                    placeholder="N"
                    min="1"
                    max={questionPool.filter((q) => !selectedIds.includes(q.id)).length}
                    value={randomCount}
                    onChange={(e) => setRandomCount(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRandomSelect() }}
                  />
                  <Button size="sm" variant="outline" onClick={handleRandomSelect} disabled={!randomCount || parseInt(randomCount) < 1}>
                    <Shuffle className="h-3 w-3 mr-1" /> 随机选题
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleShuffle} disabled={selectedIds.length < 2}>
                    <Shuffle className="h-3 w-3 mr-1" /> 打乱顺序
                  </Button>
                </div>
              </div>

              {formOrder === "manual" && selectedIds.length > 0 && (
                <div className="space-y-1 mb-3 border rounded-lg p-2">
                  <p className="text-xs text-muted-foreground mb-1">已选题目顺序（拖拽图标调整，点击预览）</p>
                  {selectedIds.map((id, idx) => {
                    const q = questionPool.find((x) => x.id === id)
                    return q ? (
                      <div key={id} className="flex items-center gap-2 p-1 rounded bg-muted/50 text-sm min-w-0">
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => moveQuestion(id, 1)} disabled={idx === selectedIds.length - 1}>↓</Button>
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => moveQuestion(id, -1)} disabled={idx === 0}>↑</Button>
                        <span className="text-muted-foreground w-6 text-center">{idx + 1}.</span>
                        <button className="flex-1 text-left truncate hover:underline" onClick={() => setPreviewQ(q)}>
                          {q.content.slice(0, 50)}...
                        </button>
                        <Badge variant="outline" className="text-xs shrink-0">{q.category.name}</Badge>
                        <Button size="sm" variant="ghost" className="text-destructive h-5 w-5 p-0" onClick={() => toggleQuestion(id)}>✕</Button>
                      </div>
                    ) : null
                  })}
                </div>
              )}

              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                {questionPool.filter((q) => !selectedIds.includes(q.id)).map((q) => (
                  <div key={q.id} className="flex items-center gap-2 p-2 hover:bg-muted/30 text-sm min-w-0">
                    <Button size="sm" variant="ghost" onClick={() => toggleQuestion(q.id)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <span className="flex-1 truncate">{q.content.slice(0, 60)}</span>
                    <Badge variant="outline" className="text-xs">{q.category.name}</Badge>
                    <button className="text-xs hover:underline text-muted-foreground" onClick={() => setPreviewQ(q)}>预览</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={saving || !formTitle.trim() || !formDeadline || selectedIds.length === 0}>
              {saving ? "发布中..." : "发布考试"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Question Dialog */}
      <Dialog open={!!previewQ} onOpenChange={() => setPreviewQ(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline">{previewQ?.category.name}</Badge>
              <Badge>{previewQ?.type === "CHOICE" ? "选择题" : previewQ?.type === "FILL" ? "填空题" : "判断题"}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm whitespace-pre-wrap">{previewQ?.content}</p>
            {previewQ?.options && (
              <div className="space-y-1 border rounded-lg p-3">
                {(previewQ.options as string[]).map((opt, i) => (
                  <p key={i} className="text-sm text-muted-foreground">{String.fromCharCode(65 + i)}. {opt}</p>
                ))}
              </div>
            )}
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">正确答案: <span className="text-green-600 font-medium">{previewQ?.answer}</span></p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
