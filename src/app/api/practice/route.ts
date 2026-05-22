import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get("categoryId")
    const categoryIds = searchParams.get("categoryIds")
    const mode = searchParams.get("mode") || "default"
    const limit = Math.min(Number(searchParams.get("limit")) || 10, 50)

    let where: any = {}
    if (categoryId) {
      where.categoryId = categoryId
    } else if (categoryIds) {
      where.categoryId = { in: categoryIds.split(",").filter(Boolean) }
    }

    // 考试模式：返回可用题目总数供前端选择
    if (mode === "exam") {
      const total = await prisma.question.count({ where })
      return NextResponse.json({ total })
    }

    // 逐题闯关模式：返回分类全部题目
    if (mode === "all") {
      const questions = await prisma.question.findMany({
        where,
        select: {
          id: true,
          type: true,
          content: true,
          options: true,
          difficulty: true,
          imageUrl: true,
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      })
      return NextResponse.json({ questions })
    }

    const questions = await prisma.question.findMany({
      where,
      select: {
        id: true,
        type: true,
        content: true,
        options: true,
        difficulty: true,
        imageUrl: true,
        category: {
          select: { name: true },
        },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    })

    // 随机打乱题目顺序
    const shuffled = questions.sort(() => Math.random() - 0.5)

    return NextResponse.json({ questions: shuffled })
  } catch (error) {
    console.error("获取题目失败:", error)
    return NextResponse.json(
      { error: "获取题目失败" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const authResult = requireAuth(req)
    if (authResult.error) {
      return authResult.error
    }

    const body = await req.json()
    const { questionId, userAnswer, timeSpent } = body

    if (!questionId || userAnswer === undefined) {
      return NextResponse.json(
        { error: "请提供题目ID和答案" },
        { status: 400 }
      )
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
    })

    if (!question) {
      return NextResponse.json(
        { error: "题目不存在" },
        { status: 404 }
      )
    }

    // 判断答案是否正确
    let correct = false
    switch (question.type) {
      case "CHOICE":
        correct = userAnswer === question.answer
        break
      case "FILL":
        correct = userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase()
        break
      case "JUDGE":
        correct = userAnswer === question.answer
        break
    }

    // 只记录答题历史，不给积分（积分从签到/成就等渠道获取）
    await prisma.answerRecord.create({
      data: {
        userId: authResult.user!.userId,
        questionId,
        userAnswer: String(userAnswer),
        isCorrect: correct,
        timeSpent: timeSpent || 0,
      },
    })

    return NextResponse.json({
      correct,
      correctAnswer: question.answer,
      explanation: question.explanation || "",
      pointsEarned: 0,
    })
  } catch (error) {
    console.error("提交答案失败:", error)
    return NextResponse.json(
      { error: "提交答案失败" },
      { status: 500 }
    )
  }
}
