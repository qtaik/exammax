import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

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

    // 模拟考试仅记录答题数据，不给积分/经验/升级/徽章（只有老师发布的正式考试才有）
    await prisma.answerRecord.createMany({
      data: results.map((r) => ({
        userId: authResult.user!.userId,
        questionId: r.questionId,
        userAnswer: r.userAnswer,
        isCorrect: r.correct,
        timeSpent: Math.floor(totalTime / answers.length),
      })),
    })

    return NextResponse.json({
      total: answers.length,
      correct: correctCount,
      accuracy: Math.round((correctCount / answers.length) * 100),
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
