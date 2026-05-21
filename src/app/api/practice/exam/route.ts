import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const authResult = requireAuth(req)
    if (authResult.error) {
      return authResult.error
    }

    const body = await req.json()
    const { answers, totalTime } = body as {
      answers: { questionId: string; userAnswer: string }[]
      totalTime: number
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: "请提供答题数据" },
        { status: 400 }
      )
    }

    // 批量查询所有题目
    const questionIds = answers.map((a) => a.questionId)
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
    })

    const questionMap = new Map(questions.map((q) => [q.id, q]))

    // 逐题判分
    const results: {
      questionId: string
      userAnswer: string
      correct: boolean
      correctAnswer: string
      explanation: string
    }[] = []

    let totalPoints = 0
    let correctCount = 0

    for (const ans of answers) {
      const question = questionMap.get(ans.questionId)
      if (!question) continue

      let correct = false
      switch (question.type) {
        case "CHOICE":
          correct = ans.userAnswer === question.answer
          break
        case "FILL":
          correct =
            ans.userAnswer.trim().toLowerCase() ===
            question.answer.trim().toLowerCase()
          break
        case "JUDGE":
          correct = ans.userAnswer === question.answer
          break
      }

      const points = correct ? 10 + question.difficulty * 5 : 1
      totalPoints += points
      if (correct) correctCount++

      results.push({
        questionId: question.id,
        userAnswer: ans.userAnswer,
        correct,
        correctAnswer: question.answer,
        explanation: question.explanation || "",
      })
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: authResult.user!.userId },
    })

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const newExperience = user.experience + totalPoints
    const newLevel = Math.min(Math.floor(newExperience / 100) + 1, 99)
    const leveledUp = newLevel > user.level

    // 批量创建答题记录、更新用户、记录积分
    await prisma.$transaction([
      prisma.answerRecord.createMany({
        data: results.map((r) => ({
          userId: authResult.user!.userId,
          questionId: r.questionId,
          userAnswer: r.userAnswer,
          isCorrect: r.correct,
          timeSpent: Math.floor(totalTime / answers.length),
        })),
      }),
      prisma.user.update({
        where: { id: authResult.user!.userId },
        data: {
          points: { increment: totalPoints },
          experience: newExperience,
          level: newLevel,
        },
      }),
      prisma.pointLog.create({
        data: {
          userId: authResult.user!.userId,
          points: totalPoints,
          reason: `考试完成 ${correctCount}/${answers.length} 正确`,
        },
      }),
    ])

    return NextResponse.json({
      total: answers.length,
      correct: correctCount,
      accuracy: Math.round((correctCount / answers.length) * 100),
      pointsEarned: totalPoints,
      timeSpent: totalTime,
      newLevel: leveledUp ? newLevel : undefined,
      results,
    })
  } catch (error) {
    console.error("考试提交失败:", error)
    return NextResponse.json(
      { error: "考试提交失败" },
      { status: 500 }
    )
  }
}
