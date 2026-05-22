import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(req)
  if (error) return error

  try {
    const task = await prisma.task.findUnique({ where: { id: params.id } })
    if (!task) return NextResponse.json({ error: "考试不存在" }, { status: 404 })

    const submission = await prisma.taskSubmission.findUnique({
      where: { taskId_userId: { taskId: params.id, userId: user!.userId } },
    })
    if (!submission) return NextResponse.json({ error: "你未参加此考试" }, { status: 403 })
    if (submission.status === "COMPLETED") {
      return NextResponse.json({ error: "此考试已完成" }, { status: 400 })
    }

    const body = await req.json()
    const { answers, tabSwitches, switchLog, perQuestionTime } = body

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: "缺少答案数据" }, { status: 400 })
    }

    const questionIds = answers.map((a: { questionId: string }) => a.questionId)
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
    })
    const questionMap = new Map(questions.map((q) => [q.id, q]))

    let correctCount = 0

    await Promise.all(
      answers.map(async (a: { questionId: string; userAnswer: string; timeSpent: number }) => {
        const question = questionMap.get(a.questionId)
        if (!question) return

        let isCorrect = false
        switch (question.type) {
          case "CHOICE": isCorrect = a.userAnswer === question.answer; break
          case "FILL": isCorrect = a.userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase(); break
          case "JUDGE":
            // Normalize: frontend sends T/F, DB may store 1/0, true/false, 对/错
            {
              const trueValues = ["T", "1", "true", "对"]
              const falseValues = ["F", "0", "false", "错"]
              const userTrue = trueValues.includes(a.userAnswer)
              const userFalse = falseValues.includes(a.userAnswer)
              const answerTrue = trueValues.includes(question.answer)
              if (userTrue) isCorrect = answerTrue
              else if (userFalse) isCorrect = !answerTrue
              else isCorrect = a.userAnswer === question.answer
            }
            break
        }
        if (isCorrect) correctCount++

        await prisma.answerRecord.create({
          data: {
            userId: user!.userId,
            questionId: a.questionId,
            userAnswer: a.userAnswer,
            isCorrect,
            timeSpent: a.timeSpent || 0,
          },
        })
      })
    )

    const allCorrect = correctCount === answers.length && answers.length > 0
    const pointsEarned = allCorrect ? correctCount * 5 * 2 : correctCount * 5
    const expEarned = 100 + correctCount * 10

    await Promise.all([
      prisma.taskSubmission.update({
        where: { id: submission.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          submittedAt: new Date(),
          tabSwitches: tabSwitches || 0,
          switchLog: switchLog || [],
          perQuestionTime: perQuestionTime || {},
        },
      }),
      prisma.user.update({
        where: { id: user!.userId },
        data: { points: { increment: pointsEarned }, experience: { increment: expEarned } },
      }),
      prisma.pointLog.create({
        data: { userId: user!.userId, points: pointsEarned, reason: `考试答题 (${correctCount}/${answers.length})` },
      }),
    ])

    // 检查升级 (渐进公式: 升至L+1需100×L经验)
    const dbUser = await prisma.user.findUnique({ where: { id: user!.userId }, select: { experience: true, level: true } })
    const newLevel = Math.floor((1 + Math.sqrt(1 + 8 * dbUser!.experience / 100)) / 2)
    let leveledUp = false
    if (newLevel > dbUser!.level) {
      await prisma.user.update({ where: { id: user!.userId }, data: { level: newLevel } })
      leveledUp = true
    }

    return NextResponse.json({
      success: true,
      results: {
        total: answers.length,
        correct: correctCount,
        pointsEarned,
        expEarned,
        allCorrect,
        leveledUp,
        newLevel: leveledUp ? expectedLevel : undefined,
      },
    })
  } catch (err) {
    console.error("提交考试失败:", err)
    return NextResponse.json({ error: "提交考试失败" }, { status: 500 })
  }
}
