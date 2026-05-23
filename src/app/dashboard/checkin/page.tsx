"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { CalendarCheck, Flame, Gift, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckInStatus {
  checkedIn: boolean
  streakDays: number
  lastCheckIn: string | null
}

interface CheckInResult {
  success: boolean
  pointsEarned: number
  streakDays: number
  newLevel?: number
}

export default function CheckInPage() {
  const [status, setStatus] = useState<CheckInStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [error, setError] = useState("")
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const fetchStatus = async () => {
    try {
      const data = await api.get<CheckInStatus>("/api/checkin")
      setStatus(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleCheckIn = async () => {
    setSubmitting(true)
    setError("")
    setResult(null)

    try {
      const data = await api.post<CheckInResult>("/api/checkin")
      setResult(data)
      await fetchStatus()
    } catch (err: any) {
      setError(err?.message || "签到失败")
    } finally {
      setSubmitting(false)
    }
  }

  const getPointsForDay = (day: number) => {
    const points = 5 + (day - 1) * 5
    return Math.min(points, 50)
  }

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  // Determine which days in the current month are "checked in"
  // We approximate: if the user has a streak and lastCheckIn is recent,
  // we mark the streak days ending at lastCheckIn as checked in.
  const getCheckedDays = (): Set<number> => {
    if (!status?.lastCheckIn) return new Set()

    const lastCheckIn = new Date(status.lastCheckIn)
    const checkedDays = new Set<number>()

    // Only show checks for the month containing lastCheckIn
    if (
      lastCheckIn.getFullYear() !== currentMonth.getFullYear() ||
      lastCheckIn.getMonth() !== currentMonth.getMonth()
    ) {
      return checkedDays
    }

    // Mark streak days backwards from lastCheckIn
    for (let i = 0; i < status.streakDays; i++) {
      const d = new Date(lastCheckIn)
      d.setDate(d.getDate() - i)
      if (
        d.getFullYear() === currentMonth.getFullYear() &&
        d.getMonth() === currentMonth.getMonth()
      ) {
        checkedDays.add(d.getDate())
      }
    }

    return checkedDays
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  const checkedDays = getCheckedDays()
  const daysInMonth = getDaysInMonth(currentMonth)
  const firstDay = getFirstDayOfMonth(currentMonth)
  const today = new Date()
  const isCurrentMonth =
    today.getFullYear() === currentMonth.getFullYear() &&
    today.getMonth() === currentMonth.getMonth()

  const monthNames = [
    "一月", "二月", "三月", "四月", "五月", "六月",
    "七月", "八月", "九月", "十月", "十一月", "十二月",
  ]

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">签到打卡</h2>

      {/* Streak & Check-in Card */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4" />
              连续签到
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{status?.streakDays ?? 0} 天</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Gift className="h-4 w-4" />
              今日奖励
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {getPointsForDay((status?.streakDays ?? 0) + 1)} 积分
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              上次签到
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">
              {status?.lastCheckIn
                ? new Date(status.lastCheckIn).toLocaleDateString("zh-CN")
                : "从未签到"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Check-in Button */}
      <Card>
        <CardContent className="pt-6 flex flex-col items-center gap-4">
          {result && (
            <div className="w-full p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-center">
              <p className="text-lg font-bold">签到成功!</p>
              <p>获得 {result.pointsEarned} 积分</p>
              <p>连续签到 {result.streakDays} 天</p>
              {result.newLevel && (
                <p className="text-amber-600 font-bold mt-1">
                  恭喜升级到 Lv.{result.newLevel}!
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="w-full p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-center">
              {error}
            </div>
          )}

          <Button
            size="lg"
            className="w-full max-w-xs text-lg h-14"
            disabled={status?.checkedIn || submitting}
            onClick={handleCheckIn}
          >
            {submitting
              ? "签到中..."
              : status?.checkedIn
                ? "今日已签到"
                : "立即签到"}
          </Button>

          {/* Streak points table */}
          <div className="w-full mt-2">
            <p className="text-sm text-muted-foreground mb-2 text-center">连续签到奖励</p>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((day) => (
                <div
                  key={day}
                  className={cn(
                    "p-2 rounded",
                    (status?.streakDays ?? 0) + 1 === day
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-muted"
                  )}
                >
                  <div>第{day}天</div>
                  <div className="font-medium">{getPointsForDay(day)}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-lg">
              {currentMonth.getFullYear()}年 {monthNames[currentMonth.getMonth()]}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekDays.map((day) => (
              <div key={day} className="text-xs text-muted-foreground font-medium py-2">
                {day}
              </div>
            ))}
            {/* Empty cells for offset */}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const isChecked = checkedDays.has(day)
              const isTodayCell = isCurrentMonth && today.getDate() === day
              const isFuture = isCurrentMonth && day > today.getDate()

              return (
                <div
                  key={day}
                  className={cn(
                    "aspect-square flex items-center justify-center rounded-full text-sm",
                    isChecked && "bg-green-500 text-white font-bold",
                    isTodayCell && !isChecked && "ring-2 ring-primary font-bold",
                    isFuture && "text-muted-foreground/40",
                    !isChecked && !isTodayCell && !isFuture && "text-foreground"
                  )}
                >
                  {day}
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              已签到
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full ring-2 ring-primary" />
              今天
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
