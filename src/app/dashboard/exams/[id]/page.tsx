"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  ArrowLeft, Clock, Monitor, CheckCircle, XCircle, AlertTriangle,
  Maximize, ChevronLeft, ChevronRight, Send, Timer,
} from "lucide-react"

interface Question {
  id: string; type: string; content: string
  options: string[] | null; answer?: string
  difficulty: number; category: { name: string }
}

interface AnswerRecord {
  questionId: string; userAnswer: string; isCorrect: boolean; timeSpent: number
}

interface TaskData {
  task: {
    id: string; title: string; description: string | null
    deadline: string; perQuestionTime: number | null
    maxTabSwitches: number; questionOrder: string
    class: { name: string }; teacher: { username: string }
    questions: Question[]
  }
  submission: {
    status: string; perQuestionTime: Record<string, number> | null
    tabSwitches?: number; submittedAt?: string; completedAt?: string
    answers?: AnswerRecord[]
  }
}

const STORAGE_KEY = "exam_session"

export default function StudentExamPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params?.id as string

  const [data, setData] = useState<TaskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [userAnswer, setUserAnswer] = useState("")
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [perQuestionTime, setPerQuestionTime] = useState<Record<string, number>>({})
  const [tabSwitches, setTabSwitches] = useState(0)
  const [switchLog, setSwitchLog] = useState<{ time: string; duration: number }[]>([])
  const [currentQTime, setCurrentQTime] = useState(0)
  const [deadlineLeft, setDeadlineLeft] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitDialog, setSubmitDialog] = useState(false)
  const [leaveDialog, setLeaveDialog] = useState(false)
  const [leaveUrl, setLeaveUrl] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [switchStartTime, setSwitchStartTime] = useState<string | null>(null)
  const [maxSwitches, setMaxSwitches] = useState(3)

  const qTimerRef = useRef<NodeJS.Timeout | null>(null)
  const deadlineRef = useRef<NodeJS.Timeout | null>(null)
  const qStartRef = useRef<number>(Date.now())
  const tabSwitchesRef = useRef(0)
  const switchLogRef = useRef<{ time: string; duration: number }[]>([])
  const answersRef = useRef<Record<string, string>>({})
  const switchStartRef = useRef<string | null>(null)
  const handleSubmitRef = useRef<() => Promise<void>>(async () => {})
  const perQuestionTimeRef = useRef<Record<string, number>>({})
  const currentIdxRef = useRef(0)

  // Keep refs in sync
  useEffect(() => { tabSwitchesRef.current = tabSwitches }, [tabSwitches])
  useEffect(() => { switchLogRef.current = switchLog }, [switchLog])
  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { switchStartRef.current = switchStartTime }, [switchStartTime])
  useEffect(() => { perQuestionTimeRef.current = perQuestionTime }, [perQuestionTime])
  useEffect(() => { currentIdxRef.current = currentIdx }, [currentIdx])

  // --- Fetch exam ---
  useEffect(() => {
    const fetchExam = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem("token")
        const res = await fetch(`/api/tasks/${examId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const d = await res.json()
        setData(d)

        if (d.submission?.tabSwitches != null) setTabSwitches(d.submission.tabSwitches)
        if (d.task.maxTabSwitches) setMaxSwitches(d.task.maxTabSwitches)

        // Restore session from localStorage
        const saved = loadSession(examId)
        if (saved && d.submission?.status === "PENDING") {
          setAnswers(saved.answers)
          setCurrentIdx(saved.currentIdx)
          setTabSwitches(saved.tabSwitches)
          setSwitchLog(saved.switchLog || [])
          setPerQuestionTime(saved.perQuestionTime || {})
        }
      } catch {} finally { setLoading(false) }
    }
    if (examId) fetchExam()
  }, [examId])

  // --- Save session to localStorage periodically ---
  useEffect(() => {
    if (!data || data.submission.status !== "PENDING") return
    const interval = setInterval(() => {
      saveSession(examId, {
        answers: answersRef.current,
        currentIdx,
        tabSwitches: tabSwitchesRef.current,
        switchLog: switchLogRef.current,
        perQuestionTime,
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [data, currentIdx, perQuestionTime, examId])

  // --- Per-question timer ---
  useEffect(() => {
    if (!data || data.submission.status !== "PENDING") return
    const q = data.task.questions[currentIdx]
    const accumulated = perQuestionTime[q?.id] || 0
    qStartRef.current = Date.now()
    setCurrentQTime(accumulated)
    qTimerRef.current = setInterval(() => {
      setCurrentQTime(accumulated + Math.floor((Date.now() - qStartRef.current) / 1000))
    }, 1000)
    return () => { if (qTimerRef.current) clearInterval(qTimerRef.current) }
  }, [currentIdx, data])

  // --- Deadline countdown ---
  useEffect(() => {
    if (!data || data.submission.status !== "PENDING") return
    const update = () => {
      const left = Math.max(0, Math.floor((new Date(data.task.deadline).getTime() - Date.now()) / 1000))
      setDeadlineLeft(left)
      if (left <= 0) handleSubmitRef.current()
    }
    update()
    deadlineRef.current = setInterval(update, 1000)
    return () => { if (deadlineRef.current) clearInterval(deadlineRef.current) }
  }, [data])

  // --- Anti-cheat: tab switch detection ---
  useEffect(() => {
    if (!data || data.submission.status !== "PENDING") return

    const recordSwitch = () => {
      const start = switchStartRef.current
      if (start) {
        const duration = Math.floor((Date.now() - new Date(start).getTime()) / 1000)
        switchLogRef.current = [...switchLogRef.current, { time: start, duration }]
        setSwitchLog(switchLogRef.current)
        setTabSwitches((prev) => prev + 1)
        switchStartRef.current = null
        setSwitchStartTime(null)
      }
    }

    const handleVisibility = () => {
      if (document.hidden) {
        switchStartRef.current = new Date().toISOString()
        setSwitchStartTime(switchStartRef.current)
      } else {
        recordSwitch()
      }
    }

    const handleBlur = () => {
      if (!switchStartRef.current) {
        switchStartRef.current = new Date().toISOString()
        setSwitchStartTime(switchStartRef.current)
      }
    }

    const handleFocus = () => {
      if (switchStartRef.current && !document.hidden) {
        recordSwitch()
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("blur", handleBlur)
    window.addEventListener("focus", handleFocus)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("blur", handleBlur)
      window.removeEventListener("focus", handleFocus)
    }
  }, [data])

  // --- Warn before leaving ---
  useEffect(() => {
    if (!data || data.submission.status !== "PENDING") return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [data])

  // --- Fullscreen ---
  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } catch {}
  }

  // --- Navigation with time tracking ---
  const navigateTo = (idx: number) => {
    if (!data) return
    const q = data.task.questions[currentIdx]
    const elapsed = Math.floor((Date.now() - qStartRef.current) / 1000)
    setPerQuestionTime((prev) => ({ ...prev, [q.id]: (prev[q.id] || 0) + elapsed }))
    setCurrentIdx(idx)
    setUserAnswer(answers[data.task.questions[idx]?.id] || "")
  }

  const handleNext = () => {
    if (!data || currentIdx >= data.task.questions.length - 1) return
    navigateTo(currentIdx + 1)
  }

  const handlePrev = () => {
    if (currentIdx <= 0) return
    navigateTo(currentIdx - 1)
  }

  const handleAnswerChange = (val: string) => {
    setUserAnswer(val)
    if (!data) return
    const q = data.task.questions[currentIdx]
    setAnswers((prev) => ({ ...prev, [q.id]: val }))
  }

  // --- Submit ---
  const handleSubmit = async () => {
    if (!data || submitting) return
    setSubmitting(true)
    setSubmitDialog(false)

    // Save current question time
    const q = data.task.questions[currentIdx]
    const elapsed = Math.floor((Date.now() - qStartRef.current) / 1000)
    const finalPerTime = { ...perQuestionTime, [q.id]: (perQuestionTime[q.id] || 0) + elapsed }

    // DEBUG: trace timeSpent calculation
    console.log("[Submit] perQuestionTime state:", JSON.stringify(perQuestionTime))
    console.log("[Submit] currentIdx:", currentIdx, "elapsed:", elapsed)
    console.log("[Submit] finalPerTime:", JSON.stringify(finalPerTime))

    try {
      const token = localStorage.getItem("token")
      const answerList = data.task.questions.map((q) => ({
        questionId: q.id,
        userAnswer: answersRef.current[q.id] || "",
        timeSpent: finalPerTime[q.id] || 0,
      }))

      const res = await fetch(`/api/tasks/${examId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          answers: answerList,
          tabSwitches: tabSwitchesRef.current,
          switchLog: switchLogRef.current,
          perQuestionTime: finalPerTime,
        }),
      })
      const result = await res.json()

      if (result.success) {
        clearSession(examId)
        // Exit fullscreen
        try { if (document.fullscreenElement) await document.exitFullscreen() } catch {}
        // Reload to show results
        window.location.reload()
      } else {
        alert(result.error || "提交失败")
      }
    } catch {} finally { setSubmitting(false) }
  }
  useEffect(() => { handleSubmitRef.current = handleSubmit })

  const unansweredCount = data ? data.task.questions.filter((q) => !answers[q.id]).length : 0

  // --- Render ---
  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">加载中...</p></div>
  }
  if (!data) {
    return <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-muted-foreground">考试未找到</p>
      <Button onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />返回</Button>
    </div>
  }

  const { task, submission } = data
  const isPending = submission.status === "PENDING"
  const isCompleted = submission.status === "COMPLETED"
  const isOverdue = submission.status === "OVERDUE"
  const questions = task.questions || []
  const currentQ = questions[currentIdx]
  const perQTime = task.perQuestionTime
  const timeExpired = perQTime != null && currentQTime >= perQTime

  // --- PENDING: Exam taking view ---
  if (isPending) {
    return (
      <div className={isFullscreen ? "fixed inset-0 z-50 bg-background overflow-y-auto" : ""}>
        {!isFullscreen && (
          <div className="flex flex-col items-center justify-center h-[80vh] gap-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">{task.title}</h1>
              <p className="text-muted-foreground">{task.class.name} · {task.teacher.username}</p>
              <div className="flex gap-2 justify-center mt-2">
                <Badge variant="outline">{questions.length}题</Badge>
                {perQTime && <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />每题 {perQTime}s</Badge>}
                <Badge variant="outline"><Monitor className="h-3 w-3 mr-1" />最多切屏 {maxSwitches} 次</Badge>
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">{task.description}</p>
              )}
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span>考试将进入全屏模式，切屏将被记录</span>
              </div>
            </div>
            <Button size="lg" onClick={enterFullscreen} className="gap-2">
              <Maximize className="h-5 w-5" /> 进入全屏开始考试
            </Button>
            <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />返回列表</Button>
          </div>
        )}

        {isFullscreen && (
          <div className="flex flex-col h-screen">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
              <div className="flex items-center gap-3">
                <h1 className="font-bold text-sm truncate max-w-[200px]">{task.title}</h1>
                <Badge variant="outline" className="text-xs">{currentIdx + 1}/{questions.length}</Badge>
              </div>
              <div className="flex items-center gap-3">
                {deadlineLeft > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {Math.floor(deadlineLeft / 60)}:{String(deadlineLeft % 60).padStart(2, "0")}
                  </span>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Monitor className="h-3 w-3" />{tabSwitches}/{maxSwitches}
                </span>
                <Button size="sm" variant="outline" onClick={() => setSubmitDialog(true)} disabled={submitting}>
                  <Send className="h-3 w-3 mr-1" />交卷
                </Button>
              </div>
            </div>

            {/* Per-question timer bar */}
            {perQTime && (
              <div className="px-4 py-1 bg-muted/20 border-b shrink-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>本题用时</span>
                  <span className={currentQTime >= perQTime ? "text-destructive font-bold" : ""}>
                    {currentQTime}s / {perQTime}s
                  </span>
                </div>
                <div className="h-1 bg-muted rounded-full mt-0.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${currentQTime >= perQTime ? "bg-destructive" : "bg-primary"}`}
                    style={{ width: `${Math.min(100, (currentQTime / perQTime) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Question content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto">
                {currentQ && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">
                        {currentQ.type === "CHOICE" ? "选择题" : currentQ.type === "FILL" ? "填空题" : "判断题"}
                      </Badge>
                      <Badge variant="outline">{currentQ.category.name}</Badge>
                    </div>

                    <p className="text-base whitespace-pre-wrap leading-relaxed">{currentQ.content}</p>

                    {currentQ.type === "CHOICE" && currentQ.options && (
                      <div className="space-y-2 mt-4">
                        {currentQ.options.map((opt, i) => {
                          const letter = String.fromCharCode(65 + i)
                          const isSelected = userAnswer === letter
                          return (
                            <button
                              key={i}
                              onClick={() => !timeExpired && handleAnswerChange(letter)}
                              disabled={timeExpired}
                              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                timeExpired ? "opacity-50 cursor-not-allowed" : ""
                              } ${
                                isSelected
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border hover:bg-muted/50"
                              }`}
                            >
                              <span className="font-medium mr-2">{letter}.</span>
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {currentQ.type === "JUDGE" && (
                      <div className="flex gap-4 mt-4">
                        {["T", "F"].map((val) => (
                          <Button
                            key={val}
                            variant={userAnswer === val ? "default" : "outline"}
                            className="flex-1"
                            onClick={() => handleAnswerChange(val)}
                            disabled={timeExpired}
                          >
                            {val === "T" ? "正确 (T)" : "错误 (F)"}
                          </Button>
                        ))}
                      </div>
                    )}

                    {currentQ.type === "FILL" && (
                      <input
                        type="text"
                        value={userAnswer}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        placeholder="输入你的答案..."
                        className="w-full mt-4 p-3 border rounded-lg bg-background text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        autoFocus
                        disabled={timeExpired}
                      />
                    )}

                    {/* Per-question time expired — lock */}
                    {timeExpired && (
                      <div className="flex items-center gap-2 p-3 rounded bg-destructive/10 text-destructive text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        本题时间已到，答案已锁定
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom nav */}
            <div className="border-t bg-muted/30 p-3 shrink-0">
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentIdx === 0}>
                  <ChevronLeft className="h-4 w-4 mr-1" />上一题
                </Button>

                {/* Question index dots */}
                <div className="flex gap-1 flex-wrap justify-center max-w-[300px]">
                  {questions.map((q, idx) => (
                    <button
                      key={q.id}
                      onClick={() => navigateTo(idx)}
                      className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                        idx === currentIdx
                          ? "bg-primary text-primary-foreground"
                          : answers[q.id]
                            ? "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <Button variant="outline" size="sm" onClick={handleNext} disabled={currentIdx === questions.length - 1}>
                  下一题<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Submit confirmation dialog */}
            <Dialog open={submitDialog} onOpenChange={setSubmitDialog}>
              <DialogContent>
                <DialogHeader><DialogTitle>确认交卷</DialogTitle></DialogHeader>
                <div className="space-y-2 text-sm">
                  <p>共 {questions.length} 题，已作答 {questions.length - unansweredCount} 题</p>
                  {unansweredCount > 0 && (
                    <p className="text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />{unansweredCount} 题未作答
                    </p>
                  )}
                  <p className="text-muted-foreground">交卷后将无法修改答案</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSubmitDialog(false)}>继续检查</Button>
                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? "提交中..." : "确认交卷"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    )
  }

  // --- COMPLETED: Results view ---
  if (isCompleted) {
    const answers = submission.answers || []
    const correctCount = answers.filter((a) => a.isCorrect).length
    const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{task.title}</h1>
            <p className="text-muted-foreground text-sm">{task.class.name} · {task.teacher.username}</p>
          </div>
        </div>

        {/* Result summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">得分</p>
              <p className={`text-2xl font-bold ${score >= 60 ? "text-green-600" : "text-destructive"}`}>{score}分</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">正确率</p>
              <p className="text-2xl font-bold">{correctCount}/{questions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">切屏次数</p>
              <p className="text-2xl font-bold">{submission.tabSwitches || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">交卷时间</p>
              <p className="text-sm font-medium">
                {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString("zh-CN") : "-"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Answer details */}
        <div>
          <h2 className="text-lg font-bold mb-3">答题详情</h2>
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const record = answers.find((a) => a.questionId === q.id)
              const isCorrect = record?.isCorrect ?? false
              return (
                <Card key={q.id} className={isCorrect ? "" : "border-destructive/30"}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">第{idx + 1}题</span>
                          <Badge variant="outline" className="text-xs">
                            {q.type === "CHOICE" ? "选择题" : q.type === "FILL" ? "填空题" : "判断题"}
                          </Badge>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{q.content}</p>
                      </div>
                      {isCorrect
                        ? <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                        : <XCircle className="h-5 w-5 text-destructive shrink-0" />}
                    </div>
                    <div className="flex gap-4 text-xs mt-2">
                      <span className="text-muted-foreground">
                        你的答案: <span className={isCorrect ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                          {record?.userAnswer || "未作答"}
                        </span>
                      </span>
                      {!isCorrect && (
                        <span className="text-muted-foreground">
                          正确答案: <span className="text-green-600 font-medium">{q.answer || ""}</span>
                        </span>
                      )}
                      {record?.timeSpent != null && (
                        <span className="text-muted-foreground">用时: {record.timeSpent}s</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // --- OVERDUE ---
  if (isOverdue) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h1 className="text-xl font-bold">{task.title}</h1>
          <p className="text-muted-foreground mt-1">该考试已截止</p>
          <p className="text-xs text-muted-foreground mt-0.5">截止时间: {new Date(task.deadline).toLocaleString("zh-CN")}</p>
        </div>
        <Button onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />返回列表</Button>
      </div>
    )
  }

  return null
}

// --- Session persistence helpers ---
function sessionKey(examId: string) {
  return `${STORAGE_KEY}_${examId}`
}

interface ExamSession {
  answers: Record<string, string>
  currentIdx: number
  tabSwitches: number
  switchLog: { time: string; duration: number }[]
  perQuestionTime: Record<string, number>
}

function loadSession(examId: string): ExamSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(sessionKey(examId))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSession(examId: string, data: ExamSession) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(sessionKey(examId), JSON.stringify(data))
  } catch {}
}

function clearSession(examId: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(sessionKey(examId))
  } catch {}
}
