import { NextResponse } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

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
      activeUsers,
      totalClasses,
      totalExams,
      completedExams,
      pendingExams,
      overdueExams,
      totalPointsResult,
      shopExchanges,
      lotteryCount,
      totalActiveWrong,
      totalUsersWithWrong,
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
      prisma.answerRecord.groupBy({ by: ["userId"], where: { createdAt: { gte: thirtyDaysAgo } } }).then(r => r.length),
      prisma.class.count(),
      prisma.task.count(),
      prisma.taskSubmission.count({ where: { status: "COMPLETED" } }),
      prisma.taskSubmission.count({ where: { status: "PENDING" } }),
      prisma.taskSubmission.count({ where: { status: "OVERDUE" } }),
      prisma.pointLog.aggregate({ _sum: { points: true }, where: { points: { gt: 0 } } }),
      prisma.userItem.count(),
      prisma.pointLog.count({ where: { reason: { startsWith: "抽奖" } } }),
      prisma.wrongQuestion.count({ where: { status: "ACTIVE" } }),
      prisma.wrongQuestion.groupBy({ by: ["userId"], where: { status: "ACTIVE" } }).then(r => r.length),
    ])

    const correctRate = totalAnswerRecords > 0
      ? Math.round((correctCount / totalAnswerRecords) * 10000) / 100
      : 0

    const totalPointsIssued = totalPointsResult._sum.points || 0
    const avgWrongPerUser = totalUsersWithWrong > 0
      ? Math.round((totalActiveWrong / totalUsersWithWrong) * 100) / 100
      : 0

    // Wrong questions by category TOP 10
    const wrongByCategoryRaw = await prisma.wrongQuestion.groupBy({
      by: ["questionId"],
      where: { status: "ACTIVE" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 100,
    })

    // Aggregate by category
    const categoryCounts: Record<string, number> = {}
    if (wrongByCategoryRaw.length > 0) {
      const questionIds = wrongByCategoryRaw.map(w => w.questionId)
      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true, category: { select: { name: true } } },
      })
      const qMap = new Map(questions.map(q => [q.id, q.category.name]))
      for (const w of wrongByCategoryRaw) {
        const cat = qMap.get(w.questionId) || "未分类"
        categoryCounts[cat] = (categoryCounts[cat] || 0) + w._count.id
      }
    }
    const wrongByCategory = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([category, count]) => ({ category, count }))

    // 30-day daily stats
    const dailyStats: { date: string; answers: number; newUsers: number; correctRate: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - i)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dateStr = date.toISOString().split("T")[0]

      const [answers, newUsers, dayCorrect] = await Promise.all([
        prisma.answerRecord.count({
          where: { createdAt: { gte: date, lt: nextDate } },
        }),
        prisma.user.count({
          where: { createdAt: { gte: date, lt: nextDate } },
        }),
        prisma.answerRecord.count({
          where: { createdAt: { gte: date, lt: nextDate }, isCorrect: true },
        }),
      ])

      dailyStats.push({
        date: dateStr,
        answers,
        newUsers,
        correctRate: answers > 0 ? Math.round((dayCorrect / answers) * 10000) / 100 : 0,
      })
    }

    return NextResponse.json({
      totalUsers,
      usersByRole: { STUDENT: studentCount, TEACHER: teacherCount, ADMIN: adminCount },
      totalQuestions,
      questionsByType: { CHOICE: choiceCount, FILL: fillCount, JUDGE: judgeCount },
      totalAnswerRecords,
      correctRate,
      activeUsers,
      totalClasses,
      totalExams,
      examsByStatus: { COMPLETED: completedExams, PENDING: pendingExams, OVERDUE: overdueExams },
      totalPointsIssued,
      shopExchanges,
      lotteryCount,
      totalActiveWrong,
      avgWrongPerUser,
      wrongByCategory,
      dailyStats,
    })
  } catch (err) {
    console.error("Get stats error:", err)
    return NextResponse.json({ error: "获取统计数据失败" }, { status: 500 })
  }
}
