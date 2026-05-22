"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  CheckCircle, XCircle, ArrowRight, ArrowLeft, Clock, Trophy,
  Target, Percent, BookOpen, Shuffle, FileText, Timer, Trash2,
} from "lucide-react"

interface Category {
  id: string
  name: string
  description: string | null
  _count: { questions: number }
}

interface Question {
  id: string
  type: "CHOICE" | "FILL" | "JUDGE"
  content: string
  options: string[] | null
  difficulty: number
  imageUrl: string | null
  category: { name: string }
}

interface SubmitResult {
  correct: boolean
  correctAnswer: string
  explanation: string
  pointsEarned: number
  newLevel?: number
}

interface ExamResultItem {
  questionId: string
  userAnswer: string
  correct: boolean
  correctAnswer: string
  explanation: string
}

type PracticeMode = "onebyone" | "random" | "exam"
type Phase = "select" | "practice" | "exam" | "examResult"

const EXAM_COUNTS = [10, 20, 30, 50]
const EXAM_TIMES = [10, 20, 30, 60]

interface PracticeProgress {
  questions: Question[]
  currentIndex: number
  summary: { total: number; correct: number }
  categoryId: string
  categoryName: string
}

function progressKey(categoryId: string) {
  return `practice_progress_${categoryId}`
}

function loadProgress(categoryId: string): PracticeProgress | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(progressKey(categoryId))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveProgress(categoryId: string, data: PracticeProgress) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(progressKey(categoryId), JSON.stringify(data))
  } catch {}
}

function clearProgress(categoryId: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(progressKey(categoryId))
  } catch {}
}

export default function PracticePage() {
  const router = useRouter()

  // --- Common state ---
  const [phase, setPhase] = useState<Phase>("select")
  const [mode, setMode] = useState<PracticeMode>("onebyone")
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [loadingCategories, setLoadingCategories] = useState(true)

  // --- One-by-one / Random state ---
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [userAnswer, setUserAnswer] = useState("")
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [timeSpent, setTimeSpent] = useState(0)
  const [finished, setFinished] = useState(false)
  const [summary, setSummary] = useState({ total: 0, correct: 0 })

  // --- Exam state ---
  const [examCount, setExamCount] = useState(20)
  const [examTimeLimit, setExamTimeLimit] = useState(30)
  const [randomCount, setRandomCount] = useState(10)
  const [examQuestions, setExamQuestions] = useState<Question[]>([])
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({})
  const [examCurrentIdx, setExamCurrentIdx] = useState(0)
  const [examTimeLeft, setExamTimeLeft] = useState(0)
  const [examSubmitting, setExamSubmitting] = useState(false)
  const [examAvailableCount, setExamAvailableCount] = useState(0)
  const [continueDialog, setContinueDialog] = useState<PracticeProgress | null>(null)
  const [categoryProgress, setCategoryProgress] = useState<Record<string, PracticeProgress | null>>({})
  const [progressVersion, setProgressVersion] = useState(0)
  const [examResult, setExamResult] = useState<{
    total: number
    correct: number
    accuracy: number
    pointsEarned: number
    timeSpent: number
    newLevel?: number
    results: ExamResultItem[]
  } | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const progressCatRef = useRef<string>("")
  const modeRef = useRef(mode)
  modeRef.current = mode
  const examSubmitRef = useRef<typeof handleExamSubmit>(undefined)

  // --- Fetch categories ---
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {})
      .finally(() => setLoadingCategories(false))
  }, [])

  // --- Load all category progress for onebyone mode ---
  useEffect(() => {
    if (mode === "onebyone" && categories.length > 0) {
      const prog: Record<string, PracticeProgress | null> = {}
      categories.forEach((cat) => {
        prog[cat.id] = loadProgress(cat.id)
      })
      setCategoryProgress(prog)
    }
  }, [mode, categories, phase, progressVersion])

  // --- One-by-one timer ---
  useEffect(() => {
    if (phase !== "practice" || finished) return
    timerRef.current = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, finished])

  // --- Exam countdown ---
  useEffect(() => {
    if (phase !== "exam") return
    timerRef.current = setInterval(() => {
      setExamTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  // --- Auto-submit when time runs out ---
  useEffect(() => {
    if (phase === "exam" && examTimeLeft === 0) {
      examSubmitRef.current?.()
    }
  }, [phase, examTimeLeft])

  // --- Fetch exam available count ---
  const fetchExamCount = useCallback(async (categoryId?: string) => {
    try {
      const token = localStorage.getItem("token")
      const url = categoryId
        ? `/api/practice?mode=exam&categoryId=${categoryId}`
        : "/api/practice?mode=exam"
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setExamAvailableCount(data.total || 0)
    } catch {
      setExamAvailableCount(0)
    }
  }, [])

  // --- Mode change handler ---
  const handleModeChange = useCallback((newMode: PracticeMode) => {
    setMode(newMode)
    setSelectedCategory(null)
    if (newMode === "exam") {
      fetchExamCount()
    }
  }, [fetchExamCount])

  // --- Category click handler ---
  const handleCategoryClick = useCallback((cat: Category | null) => {
    setSelectedCategory(cat)
    if (mode === "exam") {
      fetchExamCount(cat?.id)
    }
  }, [mode, fetchExamCount])

  // --- Start one-by-one / random ---
  const startPractice = useCallback(async (categoryId?: string) => {
    // 仅逐题闯关检查未完成进度
    if (categoryId && modeRef.current === "onebyone") {
      const saved = loadProgress(categoryId)
      if (saved && saved.questions.length > 0) {
        setContinueDialog(saved)
        return
      }
    }

    const limit = modeRef.current === "random" ? randomCount : undefined
    doStartPractice(categoryId, undefined, limit)
  }, [randomCount])

  const doStartPractice = useCallback(async (categoryId?: string, savedProgress?: PracticeProgress, limit?: number) => {
    setPhase("practice")
    setLoadingQuestions(true)

    if (savedProgress) {
      // 恢复进度
      setQuestions(savedProgress.questions)
      setCurrentIndex(savedProgress.currentIndex)
      setSummary(savedProgress.summary)
    } else {
      setSummary({ total: 0, correct: 0 })
      setCurrentIndex(0)
    }
    setResult(null)
    setUserAnswer("")
    setSelectedOption(null)
    setFinished(false)
    startTimeRef.current = Date.now()
    setTimeSpent(0)

    // 仅逐题闯关记录分类 ID 用于进度存档
    progressCatRef.current = modeRef.current === "onebyone" ? (categoryId || "") : ""

    if (savedProgress) {
      setLoadingQuestions(false)
      return
    }

    try {
      const token = localStorage.getItem("token")
      const params = new URLSearchParams()
      if (categoryId) params.set("categoryId", categoryId)
      // 逐题闯关用 mode=all 拉全部，随机用 limit
      if (modeRef.current === "onebyone" && categoryId) {
        params.set("mode", "all")
      } else if (limit) {
        params.set("limit", String(limit))
      }
      const url = `/api/practice?${params.toString()}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      const qs = data.questions || []
      setQuestions(qs)
      if (qs.length === 0) setFinished(true)
      // 仅逐题闯关初始化进度存档
      if (modeRef.current === "onebyone" && categoryId && qs.length > 0) {
        const catName = qs[0]?.category?.name || ""
        progressCatRef.current = categoryId
        saveProgress(categoryId, {
          questions: qs,
          currentIndex: 0,
          summary: { total: 0, correct: 0 },
          categoryId,
          categoryName: catName,
        })
      }
    } catch {
      setFinished(true)
    } finally {
      setLoadingQuestions(false)
    }
  }, [])

  // --- Start exam ---
  const startExam = useCallback(async () => {
    setPhase("exam")
    setLoadingQuestions(true)
    setExamAnswers({})
    setExamCurrentIdx(0)
    setExamTimeLeft(examTimeLimit * 60)

    try {
      const token = localStorage.getItem("token")
      const params = new URLSearchParams({ limit: String(examCount) })
      if (selectedCategory) params.set("categoryId", selectedCategory.id)
      const res = await fetch(`/api/practice?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setExamQuestions(data.questions || [])
      if (!data.questions || data.questions.length === 0) {
        setPhase("select")
      }
    } catch {
      setPhase("select")
    } finally {
      setLoadingQuestions(false)
    }
  }, [examCount, examTimeLimit, selectedCategory])

  // --- Submit exam ---
  const handleExamSubmit = useCallback(async () => {
    if (examSubmitting) return
    setExamSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)

    const totalTime = examTimeLimit * 60 - examTimeLeft
    const answers = examQuestions.map((q) => ({
      questionId: q.id,
      userAnswer: examAnswers[q.id] || "",
    }))

    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/practice/exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers, totalTime }),
      })
      const data = await res.json()
      setExamResult(data)
      setPhase("examResult")
    } catch {
      // ignore
    } finally {
      setExamSubmitting(false)
    }
  }, [examSubmitting, examTimeLimit, examTimeLeft, examQuestions, examAnswers])
  examSubmitRef.current = handleExamSubmit

  // --- One-by-one submit ---
  const handleSubmit = async () => {
    if (submitting) return
    const question = questions[currentIndex]
    let answer = ""
    if (question.type === "CHOICE") { if (!selectedOption) return; answer = selectedOption }
    else if (question.type === "FILL") { if (!userAnswer.trim()) return; answer = userAnswer.trim() }
    else if (question.type === "JUDGE") { if (!selectedOption) return; answer = selectedOption }

    setSubmitting(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questionId: question.id, userAnswer: answer, timeSpent }),
      })
      const data = await res.json()
      setResult(data)
      setSummary((prev) => ({
        total: prev.total + 1,
        correct: prev.correct + (data.correct ? 1 : 0),
      }))
      // 逐题闯关：答完即存档
      if (mode === "onebyone" && progressCatRef.current) {
        const prevProgress = loadProgress(progressCatRef.current)
        if (prevProgress) {
          saveProgress(progressCatRef.current, {
            ...prevProgress,
            currentIndex: prevProgress.currentIndex + 1,
            summary: {
              total: prevProgress.summary.total + 1,
              correct: prevProgress.summary.correct + (data.correct ? 1 : 0),
            },
          })
        }
      }
    } catch {} finally { setSubmitting(false) }
  }

  const handleNext = () => {
    setResult(null); setUserAnswer(""); setSelectedOption(null)
    const nextIdx = currentIndex + 1
    if (nextIdx >= questions.length) {
      if (mode === "onebyone" && progressCatRef.current) {
        clearProgress(progressCatRef.current)
      }
      setFinished(true)
      if (timerRef.current) clearInterval(timerRef.current)
    } else {
      setCurrentIndex(nextIdx)
      startTimeRef.current = Date.now(); setTimeSpent(0)
    }
  }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`

  const getOptionLabel = (q: Question, ans: string) => {
    if (q.type === "JUDGE") return ans === "1" ? "对" : "错"
    if (q.type === "CHOICE" && q.options) {
      const idx = ans.toUpperCase().charCodeAt(0) - 65
      if (idx >= 0 && idx < q.options.length) return `${ans.toUpperCase()}. ${q.options[idx]}`
    }
    return ans || "未作答"
  }

  // ===================== Phase: Select =====================
  if (phase === "select") {
    if (loadingCategories) {
      return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">加载中...</p></div>
    }

    const maxCount = Math.min(examAvailableCount, 50)

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
            <BookOpen className="h-6 w-6" /> 开始刷题
          </h2>
        </div>

        {/* Mode tabs */}
        <div className="flex rounded-lg border overflow-hidden">
          {[
            { key: "onebyone" as PracticeMode, label: "逐题闯关", icon: BookOpen },
            { key: "random" as PracticeMode, label: "随机抽题", icon: Shuffle },
            { key: "exam" as PracticeMode, label: "模拟考试", icon: FileText },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleModeChange(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                mode === key ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* Mode description */}
        <p className="text-center text-muted-foreground text-sm">
          {mode === "onebyone" && "逐题作答分类全部题目，中途退出可保存进度"}
          {mode === "random" && "从题库中随机抽取题目练习"}
          {mode === "exam" && "限时模拟考试，答完统一显示结果"}
        </p>

        {/* Exam settings */}
        {mode === "exam" && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">题数</label>
                <div className="flex gap-2">
                  {EXAM_COUNTS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setExamCount(n)}
                      disabled={n > maxCount}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        examCount === n
                          ? "border-primary bg-primary/5"
                          : n > maxCount
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      {n} 题
                    </button>
                  ))}
                </div>
                {maxCount < 10 && (
                  <p className="text-xs text-destructive mt-1">
                    当前题库不足 10 题，请先导入题目
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">时间限制</label>
                <div className="flex gap-2">
                  {EXAM_TIMES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setExamTimeLimit(t)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        examTimeLimit === t ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      {t} 分钟
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Random settings */}
        {mode === "random" && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">抽取题数</label>
                <div className="flex gap-2">
                  {[5, 10, 20, 30].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRandomCount(n)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        randomCount === n ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      {n} 题
                    </button>
                  ))}
                </div>
              </div>
              <Button
                size="lg"
                className="w-full h-14 text-lg"
                disabled={!selectedCategory}
                onClick={() => selectedCategory && startPractice(selectedCategory.id)}
              >
                <Shuffle className="h-5 w-5 mr-2" />
                {selectedCategory ? `开始随机抽题 · ${selectedCategory.name}` : "请先选择分类"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Category grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((cat) => {
            const prog = categoryProgress[cat.id]
            const hasProgress = !!(prog && prog.questions.length > 0)
            return (
            <Card
              key={cat.id}
              className={`cursor-pointer hover:shadow-md transition ${
                selectedCategory?.id === cat.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => {
                if (mode === "exam" || mode === "random") {
                  handleCategoryClick(cat)
                } else {
                  setSelectedCategory(cat)
                  startPractice(cat.id)
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{cat.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0">{cat._count.questions} 题</Badge>
                </div>
                {mode === "onebyone" && hasProgress && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>进度: {prog!.summary.total} / {prog!.questions.length} 题</span>
                      <span>正确率: {prog!.summary.total > 0 ? Math.round((prog!.summary.correct / prog!.summary.total) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mb-2">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${prog!.questions.length > 0 ? Math.round((prog!.summary.total / prog!.questions.length) * 100) : 0}%` }}
                      />
                    </div>
                    <button
                      className="flex items-center gap-1 text-xs text-destructive hover:underline mt-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        clearProgress(cat.id)
                        setProgressVersion((v) => v + 1)
                      }}
                    >
                      <Trash2 className="h-3 w-3" /> 清除进度
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )})}
        </div>

        {mode === "exam" && (
          <Button
            size="lg"
            className="w-full h-14 text-lg"
            disabled={maxCount < 10 || examCount > maxCount}
            onClick={startExam}
          >
            <FileText className="h-5 w-5 mr-2" /> 开始考试
          </Button>
        )}

        {categories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">暂无分类，请联系管理员创建</p>
          </div>
        )}

        {/* Continue progress dialog */}
        <Dialog open={!!continueDialog} onOpenChange={() => setContinueDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>检测到未完成的答题进度</DialogTitle>
              <DialogDescription>
                {continueDialog && `已完成 ${continueDialog.summary.total} 题，答对 ${continueDialog.summary.correct} 题，是否继续上次的进度？`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                const catId = continueDialog!.categoryId
                setContinueDialog(null)
                doStartPractice(catId)
              }}>
                重新开始
              </Button>
              <Button onClick={() => {
                const saved = continueDialog!
                setContinueDialog(null)
                doStartPractice(saved.categoryId, saved)
              }}>
                继续答题
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ===================== Phase: Practice (one-by-one / random) =====================
  if (phase === "practice") {
    if (loadingQuestions) {
      return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">加载题目中...</p></div>
    }

    if (finished) {
      const accuracy = summary.total > 0 ? Math.round((summary.correct / summary.total) * 100) : 0
      return (
        <div className="max-w-lg mx-auto space-y-6">
          <Card>
            <CardHeader className="text-center">
              <Trophy className="h-12 w-12 mx-auto text-yellow-500" />
              <CardTitle className="text-2xl">练习完成！</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Target className="h-5 w-5 text-blue-500" />
                  <div><p className="text-sm text-muted-foreground">总题数</p><p className="text-xl font-bold">{summary.total}</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div><p className="text-sm text-muted-foreground">答对</p><p className="text-xl font-bold">{summary.correct}</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Percent className="h-5 w-5 text-purple-500" />
                  <div><p className="text-sm text-muted-foreground">正确率</p><p className="text-xl font-bold">{accuracy}%</p></div>
                </div>
              </div>
              <Button className="w-full" onClick={() => { setPhase("select"); setFinished(false) }}>
                <ArrowLeft className="mr-2 h-4 w-4" /> 继续刷题
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard")}>
                返回首页
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    if (questions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-muted-foreground">暂无题目，请联系管理员导入题库</p>
          <Button onClick={() => setPhase("select")}>返回选择</Button>
        </div>
      )
    }

    const question = questions[currentIndex]
    const typeLabels: Record<string, string> = { CHOICE: "选择题", FILL: "填空题", JUDGE: "判断题" }
    const difficultyStars = Array.from({ length: question.difficulty }, () => "★").join("")

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{question.category.name}</Badge>
            {mode === "onebyone" && (
              <Button variant="ghost" size="sm" onClick={() => {
                alert("答题进度已保存到浏览器本地，下次请使用同一浏览器继续。")
                setPhase("select")
              }}>
                退出答题
              </Button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> {formatTime(timeSpent)}
            </div>
            <span className="text-sm text-muted-foreground">{currentIndex + 1} / {questions.length}</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge>{typeLabels[question.type]}</Badge>
              <span className="text-sm text-muted-foreground">难度: {difficultyStars}</span>
            </div>
            <CardTitle className="text-lg font-normal leading-relaxed">{question.content}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {question.imageUrl && <img src={question.imageUrl} alt="题目图片" className="max-w-full rounded-lg border" />}

            {!result && (
              <div className="space-y-4">
                {question.type === "CHOICE" && question.options && (
                  <div className="space-y-2">
                    {(question.options as string[]).map((option, index) => {
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
                {question.type === "FILL" && (
                  <Input placeholder="请输入答案" value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSubmit() }} />
                )}
                {question.type === "JUDGE" && (
                  <div className="flex gap-4">
                    {[{ v: "1", l: "对" }, { v: "2", l: "错" }].map(({ v, l }) => (
                      <button key={v} onClick={() => setSelectedOption(v)}
                        className={`flex-1 rounded-lg border p-4 text-center font-medium transition-colors ${
                          selectedOption === v ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        }`}>{l}</button>
                    ))}
                  </div>
                )}
                <Button className="w-full" onClick={handleSubmit} disabled={
                  submitting ||
                  (question.type === "CHOICE" && !selectedOption) ||
                  (question.type === "FILL" && !userAnswer.trim()) ||
                  (question.type === "JUDGE" && !selectedOption)
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
                        正确答案: {question.type === "JUDGE" ? (result.correctAnswer === "1" ? "对" : "错") : result.correctAnswer}
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
                <Button className="w-full" onClick={handleNext}>
                  {currentIndex + 1 >= questions.length ? "查看结果" : "下一题"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ===================== Phase: Exam =====================
  if (phase === "exam") {
    if (loadingQuestions) {
      return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">加载题目中...</p></div>
    }

    if (examQuestions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-muted-foreground">暂无题目</p>
          <Button onClick={() => setPhase("select")}>返回选择</Button>
        </div>
      )
    }

    const currentQ = examQuestions[examCurrentIdx]
    const currentAnswer = examAnswers[currentQ.id] || ""
    const answeredCount = Object.keys(examAnswers).length
    const isTimeWarning = examTimeLeft <= 60

    return (
      <div className="max-w-5xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Badge variant="outline">模拟考试</Badge>
            <span className="text-sm text-muted-foreground">
              已答 {answeredCount}/{examQuestions.length}
            </span>
          </div>
          <div className={`flex items-center gap-2 font-mono text-lg font-bold ${
            isTimeWarning ? "text-destructive" : "text-muted-foreground"
          }`}>
            <Timer className="h-5 w-5" />
            {formatTime(examTimeLeft)}
          </div>
        </div>

        <div className="flex gap-4">
          {/* Left sidebar - question numbers */}
          <div className="w-48 shrink-0">
            <Card>
              <CardContent className="p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">题目导航</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {examQuestions.map((q, idx) => {
                    const answered = !!examAnswers[q.id]
                    const isCurrent = idx === examCurrentIdx
                    return (
                      <button
                        key={q.id}
                        onClick={() => setExamCurrentIdx(idx)}
                        className={`h-8 rounded text-xs font-medium transition-colors ${
                          isCurrent
                            ? "bg-primary text-primary-foreground"
                            : answered
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>
                <Button
                  className="w-full mt-3"
                  size="sm"
                  onClick={handleExamSubmit}
                  disabled={examSubmitting}
                >
                  {examSubmitting ? "交卷中..." : "交卷"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right - question content */}
          <div className="flex-1">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{currentQ.type === "CHOICE" ? "选择题" : currentQ.type === "FILL" ? "填空题" : "判断题"}</Badge>
                  <span className="text-sm text-muted-foreground">
                    难度: {Array.from({ length: currentQ.difficulty }, () => "★").join("")}
                  </span>
                </div>
                <CardTitle className="text-lg font-normal leading-relaxed">{currentQ.content}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentQ.imageUrl && <img src={currentQ.imageUrl} alt="题目图片" className="max-w-full rounded-lg border" />}

                {currentQ.type === "CHOICE" && currentQ.options && (
                  <div className="space-y-2">
                    {(currentQ.options as string[]).map((option, index) => {
                      const optionValue = String.fromCharCode(65 + index)
                      return (
                        <button key={index}
                          onClick={() => setExamAnswers((prev) => ({ ...prev, [currentQ.id]: optionValue }))}
                          className={`w-full text-left rounded-lg border p-3 transition-colors ${
                            currentAnswer === optionValue ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                          }`}>
                          <span className="font-medium mr-2">{optionValue}.</span>{option}
                        </button>
                      )
                    })}
                  </div>
                )}

                {currentQ.type === "FILL" && (
                  <Input placeholder="请输入答案" value={currentAnswer}
                    onChange={(e) => setExamAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))} />
                )}

                {currentQ.type === "JUDGE" && (
                  <div className="flex gap-4">
                    {[{ v: "1", l: "对" }, { v: "2", l: "错" }].map(({ v, l }) => (
                      <button key={v}
                        onClick={() => setExamAnswers((prev) => ({ ...prev, [currentQ.id]: v }))}
                        className={`flex-1 rounded-lg border p-4 text-center font-medium transition-colors ${
                          currentAnswer === v ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        }`}>{l}</button>
                    ))}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1"
                    disabled={examCurrentIdx === 0}
                    onClick={() => setExamCurrentIdx((prev) => prev - 1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> 上一题
                  </Button>
                  <Button variant="outline" className="flex-1"
                    disabled={examCurrentIdx >= examQuestions.length - 1}
                    onClick={() => setExamCurrentIdx((prev) => prev + 1)}>
                    下一题 <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // ===================== Phase: Exam Result =====================
  if (phase === "examResult" && examResult) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Summary card */}
        <Card>
          <CardHeader className="text-center">
            <Trophy className="h-12 w-12 mx-auto text-yellow-500" />
            <CardTitle className="text-2xl">考试结束！</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <Target className="h-5 w-5 text-blue-500" />
                <div><p className="text-sm text-muted-foreground">总题数</p><p className="text-xl font-bold">{examResult.total}</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div><p className="text-sm text-muted-foreground">答对</p><p className="text-xl font-bold">{examResult.correct}</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <Percent className="h-5 w-5 text-purple-500" />
                <div><p className="text-sm text-muted-foreground">正确率</p><p className="text-xl font-bold">{examResult.accuracy}%</p></div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => { setPhase("select"); setExamResult(null) }}>
                <ArrowLeft className="mr-2 h-4 w-4" /> 继续刷题
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => router.push("/dashboard")}>
                返回首页
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Question review */}
        <h3 className="text-lg font-bold">题目回顾</h3>
        <div className="space-y-3">
          {examResult.results.map((r, idx) => {
            const q = examQuestions.find((eq) => eq.id === r.questionId)
            if (!q) return null
            return (
              <Card key={r.questionId} className={r.correct ? "" : "border-destructive/30"}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-muted-foreground">#{idx + 1}</span>
                      {r.correct
                        ? <CheckCircle className="h-4 w-4 text-green-500" />
                        : <XCircle className="h-4 w-4 text-destructive" />}
                    </div>
                    <Badge variant={r.correct ? "default" : "destructive"}>
                      {r.correct ? "正确" : "错误"}
                    </Badge>
                  </div>
                  <p className="text-sm">{q.content}</p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-muted-foreground">
                      你的答案: <span className={r.correct ? "text-green-600" : "text-destructive font-medium"}>
                        {getOptionLabel(q, r.userAnswer)}
                      </span>
                    </span>
                    {!r.correct && (
                      <span className="text-muted-foreground">
                        正确答案: <span className="text-green-600 font-medium">
                          {getOptionLabel(q, r.correctAnswer)}
                        </span>
                      </span>
                    )}
                  </div>
                  {r.explanation && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">{r.explanation}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  return null
}
