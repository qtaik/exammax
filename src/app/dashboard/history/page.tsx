"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  CheckCircle, XCircle, ArrowRight, ArrowLeft, Clock,
  Target, Percent, Trophy, TrendingUp, AlertTriangle,
  RotateCcw, ChevronDown, ChevronUp, BookOpen,
} from "lucide-react"

interface QuestionBrief {
  id: string
  type: string
  content: string
  answer: string
  explanation: string | null
  options: string[] | null
  category: { id: string; name: string }
}

interface WrongRecord {
  id: string
  errorCount: number
  status: "ACTIVE" | "COMPLETED"
  wrongAnswers: string[]
  lastAnsweredAt: string
  completedAt: string | null
  question: QuestionBrief
}

interface LeaderItem {
  id: string
  errorCount: number
  wrongAnswers: string[]
  question: {
    id: string
    type: string
    content: string
    options: string[] | null
    answer: string
    explanation: string | null
    category: { name: string }
  }
}

interface Category {
  id: string
  name: string
}

interface PracticeQuestion {
  id: string
  type: "CHOICE" | "FILL" | "JUDGE"
  content: string
  options: string[] | null
  difficulty: number
  imageUrl: string | null
  answer: string
  explanation: string | null
  category: { name: string }
}

interface SubmitResult {
  correct: boolean
  correctAnswer: string
  explanation: string
}

type Phase = "list" | "practice" | "finished"

export default function WrongQuestionsPage() {
  // --- List state ---
  const [phase, setPhase] = useState<Phase>("list")
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "COMPLETED">("ACTIVE")
  const [records, setRecords] = useState<WrongRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selfHealing, setSelfHealing] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [categories, setCategories] = useState<Category[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderItem[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [leaderDialog, setLeaderDialog] = useState<LeaderItem | null>(null)

  // --- Practice state ---
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([])
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState("")
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [timeSpent, setTimeSpent] = useState(0)
  const [practiceSummary, setPracticeSummary] = useState({ total: 0, correct: 0 })
  const [practiceLoading, setPracticeLoading] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab

  // --- Self-heal on mount ---
  useEffect(() => {
    const run = async () => {
      setSelfHealing(true)
      try {
        const token = localStorage.getItem("token")
        await fetch("/api/wrong-questions/self-heal", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {} finally {
        setSelfHealing(false)
      }
    }
    run()
  }, [])

  // --- Fetch categories ---
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {})
  }, [])

  // --- Fetch list ---
  const fetchList = useCallback(async (tab: string, pg: number, cat: string) => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const params = new URLSearchParams({
        status: tab,
        page: String(pg),
        limit: "20",
      })
      if (cat && cat !== "all") params.set("categoryId", cat)

      const res = await fetch(`/api/wrong-questions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setRecords(data.records || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  // --- Fetch leaderboard ---
  const fetchLeaderboard = useCallback(async (cat: string) => {
    try {
      const token = localStorage.getItem("token")
      const params = new URLSearchParams({
        status: "ACTIVE",
        sort: "errorCount",
        limit: "20",
      })
      if (cat && cat !== "all") params.set("categoryId", cat)

      const res = await fetch(`/api/wrong-questions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setLeaderboard(data.records || [])
    } catch {}
  }, [])

  useEffect(() => {
    fetchList(activeTab, page, categoryFilter)
    fetchLeaderboard(categoryFilter)
  }, [activeTab, page, categoryFilter, fetchList, fetchLeaderboard])

  // --- Practice timer ---
  useEffect(() => {
    if (phase !== "practice") return
    timerRef.current = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  // --- Tab / Filter change ---
  const handleTabChange = (v: string) => {
    setActiveTab(v as "ACTIVE" | "COMPLETED")
    setPage(1)
    setExpandedId(null)
  }

  const handleCategoryChange = (v: string) => {
    setCategoryFilter(v || "all")
    setPage(1)
  }

  // --- Start practice ---
  const startPractice = async (record: WrongRecord) => {
    setPracticeLoading(true)
    setPhase("practice")
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(
        `/api/wrong-questions/practice?ids=${record.question.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      const qs = data.questions || []
      setPracticeQuestions(qs)
      setPracticeIndex(0)
      setPracticeSummary({ total: 0, correct: 0 })
      setResult(null)
      setUserAnswer("")
      setSelectedOption(null)
      startTimeRef.current = Date.now()
      setTimeSpent(0)
    } catch {} finally {
      setPracticeLoading(false)
    }
  }

  // --- Practice submit ---
  const handlePracticeSubmit = async () => {
    if (submitting) return
    const q = practiceQuestions[practiceIndex]
    let answer = ""
    if (q.type === "CHOICE") { if (!selectedOption) return; answer = selectedOption }
    else if (q.type === "FILL") { if (!userAnswer.trim()) return; answer = userAnswer.trim() }
    else if (q.type === "JUDGE") { if (!selectedOption) return; answer = selectedOption }

    setSubmitting(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questionId: q.id, userAnswer: answer, timeSpent }),
      })
      const data = await res.json()
      setResult(data)
      setPracticeSummary((prev) => ({
        total: prev.total + 1,
        correct: prev.correct + (data.correct ? 1 : 0),
      }))

      // Fire-and-forget 更新错题状态
      fetch("/api/wrong-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questionId: q.id, correct: data.correct, userAnswer: answer }),
      }).catch(() => {})
    } catch {} finally { setSubmitting(false) }
  }

  const handlePracticeNext = () => {
    setResult(null); setUserAnswer(""); setSelectedOption(null)
    setPhase("list")
    // 刷新列表和榜单
    fetchList(activeTabRef.current, 1, categoryFilter)
    fetchLeaderboard(categoryFilter)
  }

  // --- Helpers ---
  const typeLabels: Record<string, string> = {
    CHOICE: "选择题", FILL: "填空题", JUDGE: "判断题",
  }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`

  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + "..." : text

  const getOptionLabel = (q: { type: string; options?: string[] | null }, ans: string) => {
    if (!ans) return "未作答"
    if (q.type === "JUDGE") return ans === "1" ? "对" : "错"
    if (q.type === "CHOICE" && q.options) {
      const idx = ans.toUpperCase().charCodeAt(0) - 65
      if (idx >= 0 && idx < q.options.length) return `${ans.toUpperCase()}. ${q.options[idx]}`
    }
    return ans
  }

  // ==================== Phase: Practice ====================
  if (phase === "practice") {
    if (practiceLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">加载题目中...</p>
        </div>
      )
    }

    if (practiceQuestions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-muted-foreground">暂无题目数据</p>
          <Button onClick={() => setPhase("list")}>返回列表</Button>
        </div>
      )
    }

    const q = practiceQuestions[practiceIndex]

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setPhase("list")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> 返回列表
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> {formatTime(timeSpent)}
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge>{typeLabels[q.type]}</Badge>
              <Badge variant="outline">{q.category.name}</Badge>
            </div>
            <CardTitle className="text-lg font-normal leading-relaxed">{q.content}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {q.imageUrl && <img src={q.imageUrl} alt="题目图片" className="max-w-full rounded-lg border" />}

            {!result && (
              <div className="space-y-4">
                {q.type === "CHOICE" && q.options && (
                  <div className="space-y-2">
                    {(q.options as string[]).map((option, index) => {
                      const optionValue = String.fromCharCode(65 + index)
                      return (
                        <button key={index} onClick={() => setSelectedOption(optionValue)}
                          className={`w-full text-left rounded-lg border p-3 transition-colors ${
                            selectedOption === optionValue ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                          }`}>
                          <span className="font-medium mr-2">{optionValue}.</span>{option}
                        </button>
                      )
                    })}
                  </div>
                )}
                {q.type === "FILL" && (
                  <Input placeholder="请输入答案" value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handlePracticeSubmit() }} />
                )}
                {q.type === "JUDGE" && (
                  <div className="flex gap-4">
                    {[{ v: "1", l: "对" }, { v: "2", l: "错" }].map(({ v, l }) => (
                      <button key={v} onClick={() => setSelectedOption(v)}
                        className={`flex-1 rounded-lg border p-4 text-center font-medium transition-colors ${
                          selectedOption === v ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        }`}>{l}</button>
                    ))}
                  </div>
                )}
                <Button className="w-full" onClick={handlePracticeSubmit} disabled={
                  submitting ||
                  (q.type === "CHOICE" && !selectedOption) ||
                  (q.type === "FILL" && !userAnswer.trim()) ||
                  (q.type === "JUDGE" && !selectedOption)
                }>
                  {submitting ? "提交中..." : "提交答案"}
                </Button>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className={`flex items-center gap-3 rounded-lg border p-4 ${
                  result.correct ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                    : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                }`}>
                  {result.correct ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
                  <div className="flex-1">
                    <p className={`font-medium ${result.correct ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                      {result.correct ? "回答正确！" : "回答错误"}
                    </p>
                    {!result.correct && (
                      <p className="text-sm text-muted-foreground mt-1">
                        正确答案: {q.type === "JUDGE" ? (result.correctAnswer === "1" ? "对" : "错") : getOptionLabel(q, result.correctAnswer)}
                      </p>
                    )}
                  </div>
                </div>
                {result.explanation && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium mb-1">解析</p>
                    <p className="text-sm text-muted-foreground">{result.explanation}</p>
                  </div>
                )}
                <Button className="w-full" onClick={handlePracticeNext}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> 返回错题列表
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ==================== Phase: List ====================
  if (selfHealing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <RotateCcw className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">正在检测数据完整性...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">错题回顾</h1>
          <p className="text-muted-foreground mt-1">共 {total} 道错题</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left: 70% */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Category filter */}
          <div className="w-48">
            <Select value={categoryFilter} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="全部分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="ACTIVE">
                <AlertTriangle className="h-4 w-4 mr-1" /> 待攻克
              </TabsTrigger>
              <TabsTrigger value="COMPLETED">
                <CheckCircle className="h-4 w-4 mr-1" /> 已攻克
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ACTIVE" className="mt-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center min-h-[200px]">
                  <p className="text-muted-foreground">加载中...</p>
                </div>
              ) : records.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                    <p className="text-muted-foreground">没有待攻克的错题，继续保持！</p>
                  </CardContent>
                </Card>
              ) : (
                records.map((r) => renderRecordCard(r))
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
                  <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="COMPLETED" className="mt-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center min-h-[200px]">
                  <p className="text-muted-foreground">加载中...</p>
                </div>
              ) : records.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">暂无已攻克的错题</p>
                  </CardContent>
                </Card>
              ) : (
                records.map((r) => renderRecordCard(r))
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
                  <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: 30% Leaderboard */}
        <div className="w-80 shrink-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> 错题排行榜
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>
              ) : (
                <div className="divide-y">
                  {leaderboard.map((item, idx) => (
                    <div key={item.id} className="px-4 py-2.5">
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded -mx-1 px-1 py-0.5"
                        onClick={() => setLeaderDialog(item)}
                      >
                        <span className={`text-xs font-bold w-5 shrink-0 ${
                          idx < 3 ? "text-destructive" : "text-muted-foreground"
                        }`}>
                          #{idx + 1}
                        </span>
                        <span className="text-xs truncate flex-1">
                          {truncate(item.question.content, 20)}
                        </span>
                        <Badge variant="destructive" className="text-xs shrink-0">{item.errorCount}次</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Leaderboard detail dialog */}
      <Dialog open={!!leaderDialog} onOpenChange={() => setLeaderDialog(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          {leaderDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge variant="outline">{leaderDialog.question.category.name}</Badge>
                  <Badge>{typeLabels[leaderDialog.question.type]}</Badge>
                  <Badge variant="destructive">错{leaderDialog.errorCount}次</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">题目内容</p>
                  <p className="text-sm whitespace-pre-wrap">{leaderDialog.question.content}</p>
                </div>

                {leaderDialog.question.options && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium mb-1">选项</p>
                    {(leaderDialog.question.options as string[]).map((opt, i) => (
                      <p key={i} className="text-sm text-muted-foreground">
                        {String.fromCharCode(65 + i)}. {opt}
                      </p>
                    ))}
                  </div>
                )}

                {leaderDialog.wrongAnswers && (leaderDialog.wrongAnswers as string[]).length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">历史错误答案</p>
                    <div className="flex flex-wrap gap-1">
                      {(leaderDialog.wrongAnswers as string[]).map((ans, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {getOptionLabel(leaderDialog.question, ans)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">正确答案</p>
                  <p className="text-sm font-medium text-green-600">
                    {getOptionLabel(leaderDialog.question, leaderDialog.question.answer)}
                  </p>
                </div>

                {leaderDialog.question.explanation && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">解析</p>
                    <p className="text-sm text-muted-foreground">{leaderDialog.question.explanation}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    const record: WrongRecord = {
                      id: leaderDialog.id,
                      errorCount: leaderDialog.errorCount,
                      status: "ACTIVE",
                      wrongAnswers: leaderDialog.wrongAnswers || [],
                      lastAnsweredAt: "",
                      completedAt: null,
                      question: leaderDialog.question as QuestionBrief,
                    }
                    setLeaderDialog(null)
                    startPractice(record)
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" /> 重做这道题
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )

  // --- Helper: render one record card ---
  function renderRecordCard(r: WrongRecord) {
    const isExpanded = expandedId === r.id
    return (
      <Card key={r.id} className="overflow-hidden">
        <div
          className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setExpandedId(isExpanded ? null : r.id)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="text-xs">{r.question.category.name}</Badge>
              <Badge variant="outline" className="text-xs">{typeLabels[r.question.type]}</Badge>
              <Badge variant="destructive" className="text-xs">错{r.errorCount}次</Badge>
            </div>
            <p className="text-sm truncate">{truncate(r.question.content, 80)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {r.status === "ACTIVE" && (
              <Button size="sm" onClick={(e) => { e.stopPropagation(); startPractice(r) }}>
                <RotateCcw className="h-3 w-3 mr-1" /> 重做
              </Button>
            )}
            {r.status === "COMPLETED" && r.completedAt && (
              <span className="text-xs text-muted-foreground">
                已攻克: {new Date(r.completedAt).toLocaleDateString("zh-CN")}
              </span>
            )}
            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {isExpanded && (
          <CardContent className="border-t bg-muted/30 space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">题目内容</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.question.content}</p>
              {r.question.options && (
                <div className="mt-2 space-y-1">
                  {(r.question.options as string[]).map((opt, i) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      {String.fromCharCode(65 + i)}. {opt}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {r.wrongAnswers && (r.wrongAnswers as string[]).length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">历史错误答案</p>
                <div className="flex flex-wrap gap-1">
                  {(r.wrongAnswers as string[]).map((ans, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {getOptionLabel(r.question, ans)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">正确答案</p>
              <p className="text-sm font-medium text-green-600">
                {getOptionLabel(r.question, r.question.answer)}
              </p>
            </div>

            {r.question.explanation && (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">解析</p>
                <p className="text-sm text-muted-foreground">{r.question.explanation}</p>
              </div>
            )}

            {r.status === "ACTIVE" && (
              <Button className="w-full" onClick={() => startPractice(r)}>
                <RotateCcw className="h-4 w-4 mr-2" /> 重做这道题
              </Button>
            )}
          </CardContent>
        )}
      </Card>
    )
  }
}
