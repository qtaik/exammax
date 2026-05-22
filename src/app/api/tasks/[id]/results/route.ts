import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { error, user } = await requireAuth(req)
    if (error) return error
    if (!["TEACHER", "ADMIN"].includes(user!.role)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: { class: { select: { name: true } } },
    })
    if (!task) return NextResponse.json({ error: "考试不存在" }, { status: 404 })
    if (task.teacherId !== user!.userId && user!.role !== "ADMIN") {
      return NextResponse.json({ error: "无权查看此考试" }, { status: 403 })
    }

    const questionIds = task.questionIds as string[]
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, type: true, content: true, answer: true },
    })
    const questionMap = new Map(questions.map((q) => [q.id, q]))

    const submissions = await prisma.taskSubmission.findMany({
      where: { taskId: params.id },
      include: {
        user: { select: { id: true, username: true } },
      },
      orderBy: { completedAt: "asc" },
    })

    const results = await Promise.all(
      submissions.map(async (sub) => {
        if (sub.status !== "COMPLETED") {
          return {
            userId: sub.userId,
            username: sub.user.username,
            status: sub.status,
            tabSwitches: sub.tabSwitches,
            score: null,
            answers: [],
          }
        }

        const records = await prisma.answerRecord.findMany({
          where: {
            userId: sub.userId,
            questionId: { in: questionIds },
            createdAt: { gte: sub.createdAt },
          },
          select: { questionId: true, userAnswer: true, isCorrect: true, timeSpent: true },
          orderBy: { createdAt: "desc" },
        })

        const correctCount = records.filter((r) => r.isCorrect).length
        return {
          userId: sub.userId,
          username: sub.user.username,
          status: sub.status,
          tabSwitches: sub.tabSwitches,
          switchLog: sub.switchLog,
          perQuestionTime: sub.perQuestionTime,
          submittedAt: sub.submittedAt,
          completedAt: sub.completedAt,
          total: questionIds.length,
          correct: correctCount,
          score: questionIds.length > 0
            ? Math.round((correctCount / questionIds.length) * 100)
            : 0,
          answers: records.map((r) => {
            const q = questionMap.get(r.questionId)
            return {
              questionId: r.questionId,
              content: q?.content?.slice(0, 80) || "",
              type: q?.type || "",
              userAnswer: r.userAnswer,
              correctAnswer: q?.answer || "",
              isCorrect: r.isCorrect,
              timeSpent: r.timeSpent,
            }
          }),
        }
      })
    )

    // 统计
    const completed = results.filter((r) => r.status === "COMPLETED")
    const avgScore = completed.length > 0
      ? Math.round(completed.reduce((s, r) => s + (r.score || 0), 0) / completed.length)
      : 0
    const totalStudents = submissions.length
    const completedCount = completed.length
    const pendingCount = totalStudents - completedCount

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        class: task.class,
        totalQuestions: questionIds.length,
        totalStudents,
        completedCount,
        pendingCount,
        avgScore,
      },
      results,
    })
  } catch (err) {
    console.error("获取考试结果失败:", err)
    return NextResponse.json({ error: "获取考试结果失败" }, { status: 500 })
  }
}
