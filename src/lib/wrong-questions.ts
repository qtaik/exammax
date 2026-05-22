import { prisma } from "@/lib/prisma"

export async function upsertWrongQuestion(
  userId: string,
  questionId: string,
  correct: boolean,
  userAnswer: string
) {
  if (correct) {
    // 答对：errorCount -1，归零则标记 completed
    const existing = await prisma.wrongQuestion.findUnique({
      where: { userId_questionId: { userId, questionId } },
    })
    if (!existing) return // 本来就不是错题

    const newCount = existing.errorCount - 1
    if (newCount <= 0) {
      await prisma.wrongQuestion.update({
        where: { userId_questionId: { userId, questionId } },
        data: { errorCount: 0, status: "COMPLETED", completedAt: new Date() },
      })
    } else {
      await prisma.wrongQuestion.update({
        where: { userId_questionId: { userId, questionId } },
        data: { errorCount: newCount },
      })
    }
  } else {
    // 答错：errorCount +1，记录错误答案（保留最近5次）
    const existing = await prisma.wrongQuestion.findUnique({
      where: { userId_questionId: { userId, questionId } },
    })

    const prevAnswers: string[] = existing
      ? ((existing.wrongAnswers as string[]) || [])
      : []
    const newAnswers = [userAnswer, ...prevAnswers].slice(0, 5)

    await prisma.wrongQuestion.upsert({
      where: { userId_questionId: { userId, questionId } },
      create: {
        userId,
        questionId,
        errorCount: 1,
        status: "ACTIVE",
        wrongAnswers: newAnswers,
      },
      update: {
        errorCount: { increment: 1 },
        status: "ACTIVE",
        wrongAnswers: newAnswers,
        completedAt: null,
      },
    })
  }
}

export async function getWrongList(params: {
  userId: string
  status?: "ACTIVE" | "COMPLETED"
  sort?: string
  page?: number
  limit?: number
  categoryId?: string
}) {
  const { userId, status, sort, page = 1, limit = 20, categoryId } = params

  const where: Record<string, unknown> = { userId }
  if (status) where.status = status
  if (categoryId) {
    where.question = { categoryId }
  }

  const orderBy: Record<string, string> =
    sort === "errorCount" ? { errorCount: "desc" } : { lastAnsweredAt: "desc" }

  const [records, total] = await Promise.all([
    prisma.wrongQuestion.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        errorCount: true,
        status: true,
        wrongAnswers: true,
        lastAnsweredAt: true,
        completedAt: true,
        question: {
          select: {
            id: true,
            type: true,
            content: true,
            answer: true,
            explanation: true,
            options: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.wrongQuestion.count({ where }),
  ])

  return {
    records,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getLeaderboard(
  userId: string,
  limit = 20,
  categoryId?: string
) {
  const where: Record<string, unknown> = {
    userId,
    status: "ACTIVE",
  }
  if (categoryId) {
    where.question = { categoryId }
  }

  return prisma.wrongQuestion.findMany({
    where,
    orderBy: { errorCount: "desc" },
    take: limit,
    select: {
      id: true,
      errorCount: true,
      wrongAnswers: true,
      question: {
        select: {
          id: true,
          type: true,
          content: true,
          options: true,
          answer: true,
          explanation: true,
          category: { select: { name: true } },
        },
      },
    },
  })
}

export async function getWrongQuestionsForPractice(questionIds: string[]) {
  return prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: {
      id: true,
      type: true,
      content: true,
      options: true,
      difficulty: true,
      imageUrl: true,
      answer: true,
      explanation: true,
      category: { select: { name: true } },
    },
  })
}

export async function selfHeal(userId: string, retentionDays: number) {
  // 1. 从 AnswerRecord 找到所有错题（去重取最新）
  const wrongRecords = await prisma.answerRecord.findMany({
    where: { userId, isCorrect: false },
    orderBy: { createdAt: "desc" },
    select: { questionId: true, userAnswer: true },
  })

  // 按 questionId 分组
  const grouped: Record<
    string,
    { count: number; answers: string[] }
  > = {}
  for (const r of wrongRecords) {
    if (!grouped[r.questionId]) {
      grouped[r.questionId] = { count: 0, answers: [] }
    }
    grouped[r.questionId].count++
    if (grouped[r.questionId].answers.length < 5) {
      grouped[r.questionId].answers.push(r.userAnswer)
    }
  }

  // Upsert WrongQuestion
  for (const [questionId, data] of Object.entries(grouped)) {
    await prisma.wrongQuestion.upsert({
      where: { userId_questionId: { userId, questionId } },
      create: {
        userId,
        questionId,
        errorCount: data.count,
        status: "ACTIVE",
        wrongAnswers: data.answers,
      },
      update: {
        errorCount: data.count,
        wrongAnswers: data.answers,
      },
    })
  }

  // 2. 清理过期 AnswerRecord
  if (retentionDays > 0) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - retentionDays)
    await prisma.answerRecord.deleteMany({
      where: { createdAt: { lt: cutoff } },
    })
  }

  return { healed: Object.keys(grouped).length }
}

export async function getRetentionDays(): Promise<number> {
  const setting = await prisma.setting.findUnique({
    where: { key: "answer_retention_days" },
  })
  return setting ? parseInt(setting.value, 10) : 30
}
