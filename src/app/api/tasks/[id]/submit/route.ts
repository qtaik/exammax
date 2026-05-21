import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    // 检查任务是否存在
    const task = await prisma.task.findUnique({
      where: { id: params.id },
    })

    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 })
    }

    // 检查用户是否有此任务的提交记录
    const submission = await prisma.taskSubmission.findUnique({
      where: {
        taskId_userId: {
          taskId: params.id,
          userId: user!.userId,
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "您没有此任务" }, { status: 403 })
    }

    if (submission.status === "COMPLETED") {
      return NextResponse.json({ error: "此任务已完成" }, { status: 400 })
    }

    const body = await req.json()
    const { answers } = body

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: "缺少答案数据" }, { status: 400 })
    }

    // 获取题目信息以验证答案
    const questionIds = answers.map((a: { questionId: string }) => a.questionId)
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
    })

    const questionMap = new Map(questions.map((q) => [q.id, q]))

    let correctCount = 0
    const totalQuestions = answers.length

    // 为每个答案创建答题记录
    await Promise.all(
      answers.map(
        async (answer: { questionId: string; userAnswer: string; timeSpent: number }) => {
          const question = questionMap.get(answer.questionId)
          if (!question) return

          const isCorrect = question.answer === answer.userAnswer
          if (isCorrect) correctCount++

          await prisma.answerRecord.create({
            data: {
              userId: user!.userId,
              questionId: answer.questionId,
              userAnswer: answer.userAnswer,
              isCorrect,
              timeSpent: answer.timeSpent || 0,
            },
          })
        }
      )
    )

    // 计算奖励积分（每题10分，答对额外5分）
    const basePoints = totalQuestions * 10
    const bonusPoints = correctCount * 5
    const pointsEarned = basePoints + bonusPoints

    // 更新用户积分
    await prisma.user.update({
      where: { id: user!.userId },
      data: {
        points: { increment: pointsEarned },
        experience: { increment: pointsEarned },
      },
    })

    // 记录积分日志
    await prisma.pointLog.create({
      data: {
        userId: user!.userId,
        points: pointsEarned,
        reason: `完成任务: ${task.title}`,
      },
    })

    // 更新任务提交状态
    await prisma.taskSubmission.update({
      where: { id: submission.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      results: {
        total: totalQuestions,
        correct: correctCount,
        pointsEarned,
      },
    })
  } catch (err) {
    console.error("提交任务答案失败:", err)
    return NextResponse.json({ error: "提交任务答案失败" }, { status: 500 })
  }
}
