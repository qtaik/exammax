"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, CheckCircle, XCircle, Users, UserCheck, Clock,
  Percent, Monitor, ChevronDown, ChevronUp, Target,
} from "lucide-react"
import { api } from "@/lib/api"

interface TaskInfo {
  id: string; title: string
  class: { name: string }
  totalQuestions: number; totalStudents: number
  completedCount: number; pendingCount: number; avgScore: number
}

interface AnswerItem {
  questionId: string; content: string; type: string
  userAnswer: string; correctAnswer: string
  isCorrect: boolean; timeSpent: number
}

interface StudentResult {
  userId: string; username: string; status: string
  tabSwitches: number; switchLog: { time: string; duration: number }[]
  perQuestionTime: Record<string, number> | null
  submittedAt: string | null; completedAt: string | null
  total: number; correct: number; score: number | null
  answers: AnswerItem[]
}

export default function ExamResultsPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params?.id as string

  const [task, setTask] = useState<TaskInfo | null>(null)
  const [results, setResults] = useState<StudentResult[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true)
      try {
        const data = await api.get<{ task: TaskInfo; results: StudentResult[] }>(
          `/api/tasks/${examId}/results`
        )
        setTask(data.task)
        setResults(data.results || [])
      } catch (err) { console.error("fetchResults error:", err) } finally {
        setLoading(false)
      }
    }
    if (examId) fetchResults()
  }, [examId])

  const typeLabels: Record<string, string> = {
    CHOICE: "选择题", FILL: "填空题", JUDGE: "判断题",
  }

  const formatDate = (d: string | null) => {
    if (!d) return "-"
    return new Date(d).toLocaleString("zh-CN")
  }

  const formatSeconds = (s: number) => {
    if (s < 60) return `${s}s`
    return `${Math.floor(s / 60)}m${s % 60}s`
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">加载中...</p></div>
  }

  if (!task) {
    return <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-muted-foreground">考试未找到</p>
      <Button onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> 返回</Button>
    </div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <p className="text-muted-foreground text-sm">{task.class.name} · {task.totalQuestions}题</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-500" />
            <div><p className="text-xs text-muted-foreground">总人数</p><p className="text-xl font-bold">{task.totalStudents}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-green-500" />
            <div><p className="text-xs text-muted-foreground">已完成</p><p className="text-xl font-bold">{task.completedCount}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Clock className="h-5 w-5 text-orange-500" />
            <div><p className="text-xs text-muted-foreground">未完成</p><p className="text-xl font-bold">{task.pendingCount}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Target className="h-5 w-5 text-purple-500" />
            <div><p className="text-xs text-muted-foreground">平均分</p><p className="text-xl font-bold">{task.avgScore}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Percent className="h-5 w-5 text-indigo-500" />
            <div><p className="text-xs text-muted-foreground">及格率</p><p className="text-xl font-bold">
              {task.completedCount > 0 ? Math.round(results.filter((r) => (r.score || 0) >= 60).length / task.totalStudents * 100) : 0}%
            </p></div>
          </CardContent>
        </Card>
      </div>

      {/* Student list */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">学生成绩</h2>
        {results.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">暂无数据</p></CardContent></Card>
        ) : (
          results.map((r) => {
            const isExpanded = expandedUserId === r.userId
            return (
              <Card key={r.userId} className="overflow-hidden">
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedUserId(isExpanded ? null : r.userId)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium">{r.username}</span>
                      {r.status === "COMPLETED" ? (
                        <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />已完成</Badge>
                      ) : r.status === "OVERDUE" ? (
                        <Badge variant="destructive">已逾期</Badge>
                      ) : (
                        <Badge variant="secondary">未开始</Badge>
                      )}
                      {r.score !== null && (
                        <Badge variant={r.score >= 60 ? "default" : "destructive"}>{r.score}分</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {r.status === "COMPLETED" && r.correct !== undefined && (
                        <span>答对 {r.correct}/{r.total}</span>
                      )}
                      <span className="flex items-center gap-1"><Monitor className="h-3 w-3" />切屏 {r.tabSwitches}次</span>
                      {r.submittedAt && <span>交卷: {formatDate(r.submittedAt)}</span>}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>

                {isExpanded && r.status === "COMPLETED" && (
                  <CardContent className="border-t bg-muted/30 space-y-4">
                    {/* Anti-cheat log */}
                    {r.switchLog && (r.switchLog as unknown as any[]).length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1 flex items-center gap-1">
                          <Monitor className="h-4 w-4" /> 切屏记录
                        </p>
                        <div className="space-y-1">
                          {(r.switchLog as unknown as { time: string; duration: number }[]).map((log, i) => (
                            <div key={i} className="text-xs text-muted-foreground flex justify-between">
                              <span>切出时间: {new Date(log.time).toLocaleTimeString("zh-CN")}</span>
                              <span>持续: {formatSeconds(log.duration)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Per-question time */}
                    {r.perQuestionTime && Object.keys(r.perQuestionTime).length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">每题用时</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(r.perQuestionTime).map(([qId, sec]) => (
                            <Badge key={qId} variant="outline" className="text-xs">
                              Q{qId.slice(-4)}: {formatSeconds(sec)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Answer details */}
                    <div>
                      <p className="text-sm font-medium mb-2">答题详情</p>
                      <div className="space-y-2">
                        {r.answers.map((ans) => (
                          <div key={ans.questionId} className={`rounded-lg border p-3 ${ans.isCorrect ? "" : "border-destructive/30"}`}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-sm truncate flex-1">{ans.content}</p>
                              {ans.isCorrect
                                ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                            </div>
                            <div className="flex gap-4 text-xs">
                              <span className="text-muted-foreground">
                                回答: <span className={ans.isCorrect ? "text-green-600" : "text-destructive font-medium"}>
                                  {ans.userAnswer || "未作答"}
                                </span>
                              </span>
                              {!ans.isCorrect && (
                                <span className="text-muted-foreground">
                                  正确: <span className="text-green-600 font-medium">{ans.correctAnswer}</span>
                                </span>
                              )}
                              <span className="text-muted-foreground">用时: {formatSeconds(ans.timeSpent)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
