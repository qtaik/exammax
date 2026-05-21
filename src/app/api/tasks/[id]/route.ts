import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        teacher: {
          select: { id: true, username: true },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 })
    }

    // Check if user has access to this task
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

    // Fetch questions for this task
    const questionIds = task.questionIds as string[]
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true,
        type: true,
        content: true,
        options: true,
        answer: true,
        explanation: true,
        difficulty: true,
        imageUrl: true,
        category: {
          select: { name: true },
        },
      },
    })

    // Maintain the order from questionIds
    const questionMap = new Map(questions.map((q) => [q.id, q]))
    const orderedQuestions = questionIds
      .map((id) => questionMap.get(id))
      .filter(Boolean)

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        deadline: task.deadline,
        teacher: task.teacher,
        questions: orderedQuestions,
      },
    })
  } catch (err) {
    console.error("获取任务详情失败:", err)
    return NextResponse.json({ error: "获取任务详情失败" }, { status: 500 })
  }
}
