"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Search, ChevronLeft, ChevronRight, HelpCircle, Plus, Pencil, Trash2,
  Upload, FolderOpen, CheckSquare, Square,
} from "lucide-react"

interface CategoryItem {
  id: string
  name: string
  description: string | null
  _count?: { questions: number }
}

interface QuestionItem {
  id: string
  type: string
  content: string
  options: string[] | null
  answer: string
  explanation: string | null
  difficulty: number
  imageUrl: string | null
  categoryId: string
  category: { id: string; name: string }
  createdAt: string
}

const typeLabels: Record<string, string> = { CHOICE: "选择题", FILL: "填空题", JUDGE: "判断题" }
const typeBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CHOICE: "default", FILL: "secondary", JUDGE: "outline",
}

export default function AdminQuestionsPage() {
  const [tab, setTab] = useState<"questions" | "categories">("questions")

  // --- Questions state ---
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [selectedQ, setSelectedQ] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // --- Categories state ---
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [selectedC, setSelectedC] = useState<Set<string>>(new Set())
  const [catFormOpen, setCatFormOpen] = useState(false)
  const [catEditId, setCatEditId] = useState<string | null>(null)
  const [catName, setCatName] = useState("")
  const [catDesc, setCatDesc] = useState("")

  // --- Question form state ---
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formType, setFormType] = useState("CHOICE")
  const [formContent, setFormContent] = useState("")
  const [formOptions, setFormOptions] = useState<string[]>(["", "", "", ""])
  const [formAnswer, setFormAnswer] = useState("")
  const [formExplanation, setFormExplanation] = useState("")
  const [formCategoryId, setFormCategoryId] = useState("")
  const [formDifficulty, setFormDifficulty] = useState("1")

  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [batchDeleteDialog, setBatchDeleteDialog] = useState(false)
  const [batchDeleteTarget, setBatchDeleteTarget] = useState<"questions" | "categories">("questions")

  // --- Import state ---
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importCategoryId, setImportCategoryId] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    message: string; total: number; success: number; failed: number; errors: string[]
  } | null>(null)

  const getToken = () => localStorage.getItem("token")

  // ==================== Fetch ====================
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories", {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCategories(data.categories)
    } catch {}
  }, [])

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (search) params.set("search", search)
      if (typeFilter !== "all") params.set("type", typeFilter)
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter)
      const res = await fetch(`/api/admin/questions?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setQuestions(data.questions)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {} finally { setLoading(false) }
  }, [page, search, typeFilter, categoryFilter])

  useEffect(() => { fetchCategories() }, [fetchCategories])
  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  // ==================== Selection ====================
  const toggleSelectQ = (id: string) => {
    setSelectAll(false)
    setSelectedQ((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  const buildFilterParams = () => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (typeFilter !== "all") params.set("type", typeFilter)
    if (categoryFilter !== "all") params.set("categoryId", categoryFilter)
    return params.toString()
  }

  const toggleSelectAllQ = async () => {
    if (selectAll) {
      setSelectAll(false)
      setSelectedQ(new Set())
      return
    }
    // Select all on current page first
    setSelectedQ(new Set(questions.map((q) => q.id)))
    // Then fetch all matching IDs
    try {
      const filterStr = buildFilterParams()
      const url = `/api/admin/questions?mode=ids&${filterStr}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSelectedQ(new Set(data.ids))
      setSelectAll(true)
    } catch {}
  }

  const toggleSelectC = (id: string) => {
    setSelectedC((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }
  const toggleSelectAllC = () => {
    if (selectedC.size === categories.length) setSelectedC(new Set())
    else setSelectedC(new Set(categories.map((c) => c.id)))
  }

  // ==================== Question CRUD ====================
  const resetForm = () => {
    setEditId(null); setFormType("CHOICE"); setFormContent("")
    setFormOptions(["", "", "", ""]); setFormAnswer(""); setFormExplanation("")
    setFormCategoryId(""); setFormDifficulty("1")
  }
  const openCreateForm = () => { resetForm(); setFormOpen(true) }
  const openEditForm = (q: QuestionItem) => {
    setEditId(q.id); setFormType(q.type); setFormContent(q.content)
    setFormOptions(q.options && q.options.length > 0 ? [...q.options, ...Array(4 - q.options.length).fill("")].slice(0, 4) : ["", "", "", ""])
    setFormAnswer(q.answer); setFormExplanation(q.explanation || "")
    setFormCategoryId(q.category.id); setFormDifficulty(String(q.difficulty)); setFormOpen(true)
  }

  const handleSave = async () => {
    if (!formContent.trim()) { alert("请输入题目内容"); return }
    if (!formAnswer.trim()) { alert("请输入答案"); return }
    if (!formCategoryId) { alert("请选择分类"); return }
    if (formType === "CHOICE" && formOptions.filter((o) => o.trim()).length < 2) {
      alert("选择题至少需要2个选项"); return
    }
    const body: any = {
      type: formType, content: formContent, answer: formAnswer,
      explanation: formExplanation || undefined, categoryId: formCategoryId,
      difficulty: parseInt(formDifficulty),
    }
    if (formType === "CHOICE") body.options = formOptions.filter((o) => o.trim())
    if (editId) body.id = editId
    try {
      const res = await fetch("/api/admin/questions", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); alert(d.error || "保存失败"); return }
      setFormOpen(false); fetchQuestions(); fetchCategories()
    } catch { alert("保存失败") }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/admin/questions?id=${deleteId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) { const d = await res.json(); alert(d.error || "删除失败"); return }
      setDeleteDialog(false); setDeleteId(null); fetchQuestions(); fetchCategories()
    } catch { alert("删除失败") }
  }

  const handleBatchDelete = async () => {
    if (batchDeleteTarget === "questions") {
      if (selectedQ.size === 0) return
      try {
        let url: string
        if (selectAll) {
          // Delete all matching the current filters
          const filterStr = buildFilterParams()
          url = `/api/admin/questions?mode=filter&${filterStr}`
        } else {
          const ids = Array.from(selectedQ)
          url = `/api/admin/questions?ids=${ids.join(",")}`
        }
        const res = await fetch(url, {
          method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` },
        })
        if (!res.ok) { const d = await res.json(); alert(d.error || "删除失败"); return }
        setSelectAll(false); setSelectedQ(new Set()); setBatchDeleteDialog(false); fetchQuestions(); fetchCategories()
      } catch { alert("删除失败") }
    } else {
      const ids = Array.from(selectedC)
      if (ids.length === 0) return
      try {
        const res = await fetch(`/api/admin/categories?ids=${ids.join(",")}`, {
          method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` },
        })
        const d = await res.json()
        if (!res.ok) { alert(d.error || "删除失败"); return }
        if (d.deletedQuestions > 0) {
          alert(`已删除 ${d.deleted} 个分类及 ${d.deletedQuestions} 道题目`)
        }
        setSelectedC(new Set()); setBatchDeleteDialog(false); fetchCategories(); fetchQuestions()
      } catch { alert("删除失败") }
    }
  }

  // ==================== Category CRUD ====================
  const openCatCreate = () => { setCatEditId(null); setCatName(""); setCatDesc(""); setCatFormOpen(true) }
  const openCatEdit = (c: CategoryItem) => { setCatEditId(c.id); setCatName(c.name); setCatDesc(c.description || ""); setCatFormOpen(true) }

  const handleCatSave = async () => {
    if (!catName.trim()) { alert("分类名称不能为空"); return }
    try {
      const res = await fetch("/api/admin/categories", {
        method: catEditId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ id: catEditId, name: catName.trim(), description: catDesc.trim() || undefined }),
      })
      if (!res.ok) { const d = await res.json(); alert(d.error || "保存失败"); return }
      setCatFormOpen(false); fetchCategories()
    } catch { alert("保存失败") }
  }

  const handleCatDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` },
      })
      const d = await res.json()
      if (!res.ok) { alert(d.error || "删除失败"); return }
      if (d.deletedQuestions > 0) {
        alert(`分类已删除，同时删除了 ${d.deletedQuestions} 道题目`)
      }
      fetchCategories(); fetchQuestions()
    } catch { alert("删除失败") }
  }

  // ==================== Import ====================
  const handleImport = async () => {
    if (!importFile) { alert("请选择文件"); return }
    setImporting(true); setImportResult(null)
    try {
      const formData = new FormData()
      formData.append("file", importFile)
      if (importCategoryId && importCategoryId !== "none") formData.append("categoryId", importCategoryId)
      const res = await fetch("/api/import/questions", {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: formData,
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || "导入失败"); return }
      setImportResult(data); fetchQuestions(); fetchCategories()
    } catch { alert("导入失败") } finally { setImporting(false) }
  }

  const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + "..." : s

  // ==================== Render ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="h-6 w-6" /> 题库管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">共 {total} 道题目，{categories.length} 个分类</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setImportOpen(true); setImportResult(null); setImportFile(null) }}>
            <Upload className="h-4 w-4 mr-2" /> 导入题目
          </Button>
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4 mr-2" /> 新增题目
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border overflow-hidden">
        <button
          onClick={() => setTab("questions")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            tab === "questions" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
          }`}
        >
          <HelpCircle className="h-4 w-4" /> 题目管理
        </button>
        <button
          onClick={() => setTab("categories")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            tab === "categories" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
          }`}
        >
          <FolderOpen className="h-4 w-4" /> 分类管理
        </button>
      </div>

      {/* ==================== Questions Tab ==================== */}
      {tab === "questions" && (
        <>
          {selectAll && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span>已选择全部 <strong>{total}</strong> 道题目</span>
              <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => { setSelectAll(false); setSelectedQ(new Set()) }}>
                取消选择
              </Button>
            </div>
          )}
          <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
              <div className="flex gap-2 flex-1">
                <Input placeholder="搜索题目内容..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (setPage(1), fetchQuestions())}
                  className="max-w-sm" />
                <Button variant="outline" onClick={() => { setPage(1); fetchQuestions() }}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="全部分类" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分类</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-[130px]"><SelectValue placeholder="全部类型" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="CHOICE">选择题</SelectItem>
                    <SelectItem value="FILL">填空题</SelectItem>
                    <SelectItem value="JUDGE">判断题</SelectItem>
                  </SelectContent>
                </Select>
                {selectedQ.size > 0 && (
                  <Button variant="destructive" size="sm" onClick={() => { setBatchDeleteTarget("questions"); setBatchDeleteDialog(true) }}>
                    <Trash2 className="h-4 w-4 mr-1" /> 删除 {selectAll ? `全部 ${total} 道` : `(${selectedQ.size})`}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">加载中...</p>
            ) : questions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">暂无题目</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 w-8">
                        <button onClick={toggleSelectAllQ} className="text-muted-foreground hover:text-foreground">
                          {selectAll || (selectedQ.size === questions.length && questions.length > 0)
                            ? <CheckSquare className="h-4 w-4" />
                            : <Square className="h-4 w-4" />}
                        </button>
                      </th>
                      <th className="text-left py-3 px-2 font-medium">类型</th>
                      <th className="text-left py-3 px-2 font-medium">内容</th>
                      <th className="text-left py-3 px-2 font-medium">分类</th>
                      <th className="text-left py-3 px-2 font-medium">难度</th>
                      <th className="text-left py-3 px-2 font-medium">创建时间</th>
                      <th className="text-left py-3 px-2 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q) => (
                      <tr key={q.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <button onClick={() => toggleSelectQ(q.id)} className="text-muted-foreground hover:text-foreground">
                            {selectedQ.has(q.id) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={typeBadgeVariant[q.type] || "default"}>{typeLabels[q.type] || q.type}</Badge>
                        </td>
                        <td className="py-3 px-2 max-w-[300px]">{truncate(q.content, 50)}</td>
                        <td className="py-3 px-2">{q.category.name}</td>
                        <td className="py-3 px-2">Lv.{q.difficulty}</td>
                        <td className="py-3 px-2">{new Date(q.createdAt).toLocaleDateString("zh-CN")}</td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditForm(q)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => { setDeleteId(q.id); setDeleteDialog(true) }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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
                <p className="text-sm text-muted-foreground">第 {page} / {totalPages} 页</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </>
      )}

      {/* ==================== Categories Tab ==================== */}
      {tab === "categories" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedC.size > 0 && (
                  <Button variant="destructive" size="sm" onClick={() => { setBatchDeleteTarget("categories"); setBatchDeleteDialog(true) }}>
                    <Trash2 className="h-4 w-4 mr-1" /> 删除 ({selectedC.size})
                  </Button>
                )}
              </div>
              <Button size="sm" onClick={openCatCreate}>
                <Plus className="h-4 w-4 mr-1" /> 添加分类
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">暂无分类</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 w-8">
                        <button onClick={toggleSelectAllC} className="text-muted-foreground hover:text-foreground">
                          {selectedC.size === categories.length && categories.length > 0
                            ? <CheckSquare className="h-4 w-4" />
                            : <Square className="h-4 w-4" />}
                        </button>
                      </th>
                      <th className="text-left py-3 px-2 font-medium">名称</th>
                      <th className="text-left py-3 px-2 font-medium">描述</th>
                      <th className="text-left py-3 px-2 font-medium">题目数</th>
                      <th className="text-left py-3 px-2 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <button onClick={() => toggleSelectC(c.id)} className="text-muted-foreground hover:text-foreground">
                            {selectedC.has(c.id) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="py-3 px-2 font-medium">{c.name}</td>
                        <td className="py-3 px-2 text-muted-foreground">{c.description || "-"}</td>
                        <td className="py-3 px-2">
                          <Badge variant="secondary">{c._count?.questions || 0} 题</Badge>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openCatEdit(c)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleCatDelete(c.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ==================== Dialogs ==================== */}

      {/* Question Create/Edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "编辑题目" : "新增题目"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">题目类型</label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHOICE">选择题</SelectItem>
                    <SelectItem value="FILL">填空题</SelectItem>
                    <SelectItem value="JUDGE">判断题</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">难度</label>
                <Select value={formDifficulty} onValueChange={setFormDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - 入门</SelectItem>
                    <SelectItem value="2">2 - 简单</SelectItem>
                    <SelectItem value="3">3 - 中等</SelectItem>
                    <SelectItem value="4">4 - 困难</SelectItem>
                    <SelectItem value="5">5 - 专家</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">题目内容</label>
              <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="输入题目内容..." value={formContent} onChange={(e) => setFormContent(e.target.value)} />
            </div>
            {formType === "CHOICE" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">选项</label>
                {formOptions.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="text-sm text-muted-foreground w-8">{String.fromCharCode(65 + idx)}.</span>
                    <Input placeholder={`选项 ${String.fromCharCode(65 + idx)}`} value={opt}
                      onChange={(e) => { const n = [...formOptions]; n[idx] = e.target.value; setFormOptions(n) }} />
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">答案</label>
              <Input placeholder={formType === "CHOICE" ? "如: A 或 AB" : formType === "JUDGE" ? "1 / 2" : "输入答案"}
                value={formAnswer} onChange={(e) => setFormAnswer(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">解析 (可选)</label>
              <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="输入答案解析..." value={formExplanation} onChange={(e) => setFormExplanation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">分类</label>
              <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Delete Confirm */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">确定要删除这道题目吗？此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Confirm */}
      <Dialog open={batchDeleteDialog} onOpenChange={setBatchDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认批量删除</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {batchDeleteTarget === "questions"
              ? selectAll
                ? `确定要删除全部 ${total} 道题目吗？此操作不可撤销。`
                : `确定要删除选中的 ${selectedQ.size} 道题目吗？此操作不可撤销。`
              : `确定要删除选中的 ${selectedC.size} 个分类吗？分类内的题目也会一并删除，此操作不可撤销。`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDeleteDialog(false)}>取消</Button>
            <Button variant="destructive" onClick={handleBatchDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Create/Edit */}
      <Dialog open={catFormOpen} onOpenChange={setCatFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{catEditId ? "编辑分类" : "添加分类"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">分类名称</label>
              <Input placeholder="输入分类名称" value={catName} onChange={(e) => setCatName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">描述 (可选)</label>
              <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="输入分类描述..." value={catDesc} onChange={(e) => setCatDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatFormOpen(false)}>取消</Button>
            <Button onClick={handleCatSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>导入题目</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">选择 xlsx 文件</label>
              <Input type="file" accept=".xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
              <p className="text-xs text-muted-foreground">
                表头格式：题目内容、答案、题目类型(single/multi/fill/judge)、题目类目、图片路径、1、2、3、4
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">目标分类（可选）</label>
              <Select value={importCategoryId} onValueChange={setImportCategoryId}>
                <SelectTrigger><SelectValue placeholder="使用表格中的分类" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">使用表格中的分类</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {importResult && (
              <div className="rounded-lg border p-4 space-y-2">
                <p className="font-medium">{importResult.message}</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>总计: {importResult.total} 条</p>
                  <p className="text-green-600">成功: {importResult.success} 条</p>
                  {importResult.failed > 0 && <p className="text-red-600">失败: {importResult.failed} 条</p>}
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      {importResult.errors.slice(0, 10).map((err, i) => <p key={i} className="text-xs text-red-500">{err}</p>)}
                      {importResult.errors.length > 10 && <p className="text-xs text-muted-foreground">...还有 {importResult.errors.length - 10} 条错误</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>关闭</Button>
            <Button onClick={handleImport} disabled={importing || !importFile}>
              {importing ? "导入中..." : "开始导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
