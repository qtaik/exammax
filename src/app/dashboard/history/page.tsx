"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  BookOpen,
} from "lucide-react"

interface QuestionDetail {
  id: string
  type: string
  content: string
  answer: string
  explanation: string | null
  category: {
    name: string
  }
}

interface AnswerRecord {
  id: string
  userAnswer: string
  isCorrect: boolean
  timeSpent: number
  createdAt: string
  question: QuestionDetail
}

interface Category {
  id: string
  name: string
}

export default function HistoryPage() {
  const [records, setRecords] = useState<AnswerRecord[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      })
      if (categoryFilter && categoryFilter !== "all") {
        params.set("categoryId", categoryFilter)
      }

      const res = await fetch(`/api/history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setRecords(data.records || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page, categoryFilter])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {})
  }, [])

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}分${secs}秒`
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const typeLabels: Record<string, string> = {
    CHOICE: "选择题",
    FILL: "填空题",
    JUDGE: "判断题",
  }

  const truncate = (text: string, max: number) => {
    return text.length > max ? text.slice(0, max) + "..." : text
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">答题历史</h1>
          <p className="text-muted-foreground mt-1">共 {total} 条记录</p>
        </div>
        <div className="w-48">
          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              setCategoryFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="全部分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">暂无答题记录</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const isExpanded = expandedId === record.id
            return (
              <Card key={record.id} className="overflow-hidden">
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : record.id)
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {record.question.category.name}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {typeLabels[record.question.type]}
                      </Badge>
                    </div>
                    <p className="text-sm truncate">
                      {truncate(record.question.content, 80)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTime(record.timeSpent)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(record.createdAt)}
                    </div>
                    {record.isCorrect ? (
                      <Badge className="bg-green-500 hover:bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        正确
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        错误
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <CardContent className="border-t bg-muted/30 space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">题目内容</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {record.question.content}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          你的答案
                        </p>
                        <p
                          className={`text-sm font-medium ${
                            record.isCorrect
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {record.userAnswer}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          正确答案
                        </p>
                        <p className="text-sm font-medium text-green-600">
                          {record.question.type === "JUDGE"
                            ? record.question.answer === "1"
                              ? "对"
                              : "错"
                            : record.question.answer}
                        </p>
                      </div>
                    </div>

                    {record.question.explanation && (
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          解析
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {record.question.explanation}
                        </p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
