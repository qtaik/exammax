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

interface Category {
  id: string; name: string; _count: { questions: number }
}

interface Question {
  id: string; type: string; content: string
  options: string[] | null
  answer: string
  category: { id: string; name: string }
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
  const [questionSearch, setQuestionSearch] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
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
    setQuestionSearch("")
    setSelectedCategoryIds([])
    try {
      const [qRes, catRes] = await Promise.all([
        fetch("/api/practice?mode=all"),
        fetch("/api/categories"),
      ])
      const [qData, catData] = await Promise.all([qRes.json(), catRes.json()])
      setQuestionPool(qData.questions || [])
      setCategories(catData.categories || [])
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
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
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

            {/* Question Selection — two-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: question pool */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium shrink-0">题库</label>
                  <input
                    className="flex-1 rounded-md border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary"
                    placeholder="搜索题目..."
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                  />
                </div>
                {/* Category filter badges */}
                <div className="flex gap-1 flex-wrap mb-2">
                  {categories.map((cat) => {
                    const active = selectedCategoryIds.includes(cat.id)
                    return (
                      <Badge
                        key={cat.id}
                        variant={active ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => {
                          setSelectedCategoryIds((prev) =>
                            active ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                          )
                        }}
                      >
                        {cat.name} ({cat._count.questions})
                      </Badge>
                    )
                  })}
                </div>
                <div className="max-h-[50vh] overflow-y-auto border rounded-lg divide-y">
                  {questionPool
                    .filter((q) => !selectedIds.includes(q.id))
                    .filter((q) => selectedCategoryIds.length === 0 || selectedCategoryIds.includes(q.category.id))
                    .filter((q) => !questionSearch || q.content.includes(questionSearch) || q.category.name.includes(questionSearch))
                    .map((q) => (
                      <div key={q.id} className="flex items-center gap-2 p-2 hover:bg-muted/30 text-sm">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={() => toggleQuestion(q.id)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <span className="flex-1 truncate">{q.content.slice(0, 40)}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{q.category.name}</Badge>
                        <button className="text-xs hover:underline text-muted-foreground shrink-0" onClick={() => setPreviewQ(q)}>预览</button>
                      </div>
                    ))}
                  {questionPool
                    .filter((q) => !selectedIds.includes(q.id))
                    .filter((q) => selectedCategoryIds.length === 0 || selectedCategoryIds.includes(q.category.id))
                    .filter((q) => !questionSearch || q.content.includes(questionSearch)).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">暂无题目</p>
                  )}
                </div>
              </div>

              {/* Right: selected questions */}
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <label className="text-sm font-medium shrink-0">已选 {selectedIds.length} 题</label>
                  <input
                    type="number"
                    className="w-12 rounded-md border px-1.5 py-0.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                    placeholder="N"
                    min="1"
                    max={questionPool.filter((q) => !selectedIds.includes(q.id)).filter((q) => selectedCategoryIds.length === 0 || selectedCategoryIds.includes(q.category.id)).length}
                    value={randomCount}
                    onChange={(e) => setRandomCount(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRandomSelect() }}
                  />
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleRandomSelect} disabled={!randomCount || parseInt(randomCount) < 1}>
                    <Shuffle className="h-3 w-3 mr-1" /> 随机
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleShuffle} disabled={selectedIds.length < 2}>
                    <Shuffle className="h-3 w-3 mr-1" /> 打乱
                  </Button>
                </div>
                <div className="max-h-[50vh] overflow-y-auto border rounded-lg divide-y">
                  {selectedIds.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">左侧点击 + 选题</p>
                  ) : (
                    selectedIds.map((id, idx) => {
                      const q = questionPool.find((x) => x.id === id)
                      return q ? (
                        <div key={id} className="flex items-center gap-1.5 p-2 hover:bg-muted/30 text-sm">
                          <span className="text-muted-foreground w-5 text-center text-xs shrink-0">{idx + 1}</span>
                          <span className="flex-1 truncate">{q.content.slice(0, 40)}</span>
                          <Badge variant="outline" className="text-xs shrink-0">{q.category.name}</Badge>
                          {formOrder === "manual" && (
                            <div className="flex shrink-0">
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => moveQuestion(id, 1)} disabled={idx === selectedIds.length - 1}>↓</Button>
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => moveQuestion(id, -1)} disabled={idx === 0}>↑</Button>
                            </div>
                          )}
                          <Button size="sm" variant="ghost" className="text-destructive h-5 w-5 p-0 shrink-0" onClick={() => toggleQuestion(id)}>✕</Button>
                        </div>
                      ) : null
                    })
                  )}
                </div>
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
