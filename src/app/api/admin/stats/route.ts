import { NextResponse } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const [
      totalUsers,
      studentCount,
      teacherCount,
      adminCount,
      totalQuestions,
      choiceCount,
      fillCount,
      judgeCount,
      totalAnswerRecords,
      correctCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "TEACHER" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.question.count(),
      prisma.question.count({ where: { type: "CHOICE" } }),
      prisma.question.count({ where: { type: "FILL" } }),
      prisma.question.count({ where: { type: "JUDGE" } }),
      prisma.answerRecord.count(),
      prisma.answerRecord.count({ where: { isCorrect: true } }),
    ])

    const correctRate = totalAnswerRecords > 0
      ? Math.round((correctCount / totalAnswerRecords) * 10000) / 100
      : 0

    // Last 7 days activity
    const recentActivity: { date: string; answers: number; newUsers: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - i)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dateStr = date.toISOString().split("T")[0]

      const [answers, newUsers] = await Promise.all([
        prisma.answerRecord.count({
          where: {
            createdAt: { gte: date, lt: nextDate },
          },
        }),
        prisma.user.count({
          where: {
            createdAt: { gte: date, lt: nextDate },
          },
        }),
      ])

      recentActivity.push({ date: dateStr, answers, newUsers })
    }

    return NextResponse.json({
      totalUsers,
      usersByRole: {
        STUDENT: studentCount,
        TEACHER: teacherCount,
        ADMIN: adminCount,
      },
      totalQuestions,
      questionsByType: {
        CHOICE: choiceCount,
        FILL: fillCount,
        JUDGE: judgeCount,
      },
      totalAnswerRecords,
      correctRate,
      recentActivity,
    })
  } catch (err) {
    console.error("Get stats error:", err)
    return NextResponse.json({ error: "获取统计数据失败" }, { status: 500 })
  }
}
