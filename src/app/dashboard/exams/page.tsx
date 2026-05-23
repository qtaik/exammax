"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Users, FileText, ChevronRight, AlertCircle } from "lucide-react"

interface ExamItem {
  id: string; title: string; description: string | null
  deadline: string; status: string
  questionCount: number; perQuestionTime: number | null
  maxTabSwitches: number
  submittedAt: string | null; completedAt: string | null
  class: { id: string; name: string }
  teacher: { id: string; username: string }
}

export default function StudentExamsPage() {
  const router = useRouter()
  const [exams, setExams] = useState<ExamItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("PENDING")

  const fetchExams = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ tasks: ExamItem[] }>("/api/tasks")
      setExams(data.tasks || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchExams() }, [fetchExams])

  const pendingExams = exams.filter((e) => e.status === "PENDING")
  const completedExams = exams.filter((e) => e.status === "COMPLETED")
  const overdueExams = exams.filter((e) => e.status === "OVERDUE")

  const formatDate = (d: string) => new Date(d).toLocaleString("zh-CN")

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">加载中...</p></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> 我的考试</h1>
        <p className="text-muted-foreground mt-1">查看和参加教师发布的考试</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="PENDING">待考 ({pendingExams.length})</TabsTrigger>
          <TabsTrigger value="COMPLETED">已考 ({completedExams.length})</TabsTrigger>
          <TabsTrigger value="OVERDUE">已逾期 ({overdueExams.length})</TabsTrigger>
        </TabsList>

        {(["PENDING", "COMPLETED", "OVERDUE"] as const).map((status) => {
          const list = status === "PENDING" ? pendingExams
            : status === "COMPLETED" ? completedExams : overdueExams
          return (
            <TabsContent key={status} value={status}>
              {list.length === 0 ? (
                <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">暂无考试</p></CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {list.map((e) => (
                    <Card key={e.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium">{e.title}</h3>
                            {e.description && <p className="text-sm text-muted-foreground mt-0.5 truncate">{e.description}</p>}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant={status === "PENDING" ? "default" : status === "COMPLETED" ? "secondary" : "destructive"}>
                                {status === "PENDING" ? "待考试" : status === "COMPLETED" ? "已完成" : "已逾期"}
                              </Badge>
                              <Badge variant="outline"><Users className="h-3 w-3 mr-1" />{e.class.name}</Badge>
                              <Badge variant="outline">{e.teacher.username}</Badge>
                              <Badge variant="outline">{e.questionCount}题</Badge>
                              {e.perQuestionTime && <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{e.perQuestionTime}s/题</Badge>}
                              <span className="text-xs text-muted-foreground">
                                截止 {formatDate(e.deadline)}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={status === "PENDING" ? "default" : "outline"}
                            onClick={() => router.push(`/dashboard/exams/${e.id}`)}
                            className="ml-4 shrink-0"
                          >
                            {status === "PENDING" ? "开始考试" : "查看详情"}
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
