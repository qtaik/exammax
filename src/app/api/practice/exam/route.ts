import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { checkAndAwardBadges } from "@/lib/badge-checker"

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth(req)
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
      select: { id: true, type: true, answer: true, explanation: true },
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

      if (correct) correctCount++

      results.push({
        questionId: question.id,
        userAnswer: ans.userAnswer,
        correct,
        correctAnswer: question.answer,
        explanation: question.explanation || "",
      })
    }

    const allCorrect = correctCount === answers.length && answers.length > 0
    const pointsEarned = allCorrect ? correctCount * 5 * 2 : correctCount * 5
    const expEarned = 100 + correctCount * 10

    await Promise.all([
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
        data: { points: { increment: pointsEarned }, experience: { increment: expEarned } },
      }),
      prisma.pointLog.create({
        data: { userId: authResult.user!.userId, points: pointsEarned, reason: `模拟考试 (${correctCount}/${answers.length})` },
      }),
    ])

    // 检查升级
    const dbUser = await prisma.user.findUnique({ where: { id: authResult.user!.userId }, select: { experience: true, level: true } })
    if (!dbUser) return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    const newLevel = Math.floor((1 + Math.sqrt(1 + 8 * dbUser.experience / 100)) / 2)
    let leveledUp = false
    if (newLevel > dbUser.level) {
      await prisma.user.update({ where: { id: authResult.user!.userId }, data: { level: newLevel } })
      leveledUp = true
    }

    const badgesAwarded = await checkAndAwardBadges(authResult.user!.userId)

    return NextResponse.json({
      total: answers.length,
      correct: correctCount,
      accuracy: Math.round((correctCount / answers.length) * 100),
      pointsEarned,
      expEarned,
      allCorrect,
      leveledUp,
      newLevel: leveledUp ? newLevel : undefined,
      badgesAwarded,
      timeSpent: totalTime,
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
