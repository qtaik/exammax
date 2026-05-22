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
        class: { select: { id: true, name: true } },
        teacher: { select: { id: true, username: true } },
        _count: { select: { submissions: true } },
      },
    })

    if (!task) {
      return NextResponse.json({ error: "考试不存在" }, { status: 404 })
    }

    // 教师查看自己的考试
    if (user!.role === "TEACHER" || user!.role === "ADMIN") {
      if (task.teacherId !== user!.userId && user!.role !== "ADMIN") {
        return NextResponse.json({ error: "无权访问" }, { status: 403 })
      }
      const questionIds = task.questionIds as string[]
      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: {
          id: true, type: true, content: true, options: true,
          answer: true, explanation: true, difficulty: true,
          category: { select: { name: true } },
        },
      })
      const questionMap = new Map(questions.map((q) => [q.id, q]))
      const orderedQuestions = questionIds.map((id) => questionMap.get(id)).filter(Boolean)

      return NextResponse.json({
        task: {
          ...JSON.parse(JSON.stringify(task)),
          questions: orderedQuestions,
        },
      })
    }

    // 学生查看
    const submission = await prisma.taskSubmission.findUnique({
      where: { taskId_userId: { taskId: params.id, userId: user!.userId } },
    })
    if (!submission) {
      return NextResponse.json({ error: "你未参加此考试" }, { status: 403 })
    }

    // 更新逾期状态
    if (submission.status === "PENDING" && task.deadline < new Date()) {
      await prisma.taskSubmission.update({
        where: { id: submission.id },
        data: { status: "OVERDUE" },
      })
      submission.status = "OVERDUE"
    }

    // 已完成返回答案（学生查看成绩）
    if (submission.status === "COMPLETED") {
      const questionIds = task.questionIds as string[]
      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: {
          id: true, type: true, content: true, options: true,
          answer: true, explanation: true, difficulty: true,
          category: { select: { name: true } },
        },
      })
      const records = await prisma.answerRecord.findMany({
        where: { userId: user!.userId, questionId: { in: questionIds } },
        select: { questionId: true, userAnswer: true, isCorrect: true, timeSpent: true },
      })

      return NextResponse.json({
        task: { ...JSON.parse(JSON.stringify(task)), questions },
        submission: {
          status: submission.status,
          tabSwitches: submission.tabSwitches,
          perQuestionTime: submission.perQuestionTime,
          submittedAt: submission.submittedAt,
          completedAt: submission.completedAt,
          answers: records,
        },
      })
    }

    // 进行中：返回题目（不含答案）
    const questionIds = task.questionIds as string[]
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true, type: true, content: true, options: true,
        difficulty: true, imageUrl: true,
        category: { select: { name: true } },
      },
    })
    const questionMap = new Map(questions.map((q) => [q.id, q]))
    const orderedQuestions = questionIds.map((id) => questionMap.get(id)).filter(Boolean)

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        deadline: task.deadline,
        perQuestionTime: task.perQuestionTime,
        maxTabSwitches: task.maxTabSwitches,
        questionOrder: task.questionOrder,
        class: task.class,
        teacher: task.teacher,
        questions: orderedQuestions,
      },
      submission: {
        status: submission.status,
        perQuestionTime: submission.perQuestionTime,
      },
    })
  } catch (err) {
    console.error("获取考试详情失败:", err)
    return NextResponse.json({ error: "获取考试详情失败" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { error, user } = requireAuth(req)
    if (error) return error
    if (!["TEACHER", "ADMIN"].includes(user!.role)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    const task = await prisma.task.findUnique({ where: { id: params.id } })
    if (!task) return NextResponse.json({ error: "考试不存在" }, { status: 404 })
    if (task.teacherId !== user!.userId && user!.role !== "ADMIN") {
      return NextResponse.json({ error: "无权编辑此考试" }, { status: 403 })
    }

    const body = await req.json()
    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title.trim()
    if (body.description !== undefined) updateData.description = body.description
    if (body.deadline !== undefined) updateData.deadline = new Date(body.deadline)
    if (body.questionIds !== undefined) updateData.questionIds = body.questionIds
    if (body.questionOrder !== undefined) updateData.questionOrder = body.questionOrder
    if (body.perQuestionTime !== undefined) updateData.perQuestionTime = body.perQuestionTime
    if (body.maxTabSwitches !== undefined) updateData.maxTabSwitches = body.maxTabSwitches

    const updated = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ task: updated })
  } catch (err) {
    console.error("更新考试失败:", err)
    return NextResponse.json({ error: "更新考试失败" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { error, user } = requireAuth(req)
    if (error) return error
    if (!["TEACHER", "ADMIN"].includes(user!.role)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    const task = await prisma.task.findUnique({ where: { id: params.id } })
    if (!task) return NextResponse.json({ error: "考试不存在" }, { status: 404 })
    if (task.teacherId !== user!.userId && user!.role !== "ADMIN") {
      return NextResponse.json({ error: "无权删除此考试" }, { status: 403 })
    }

    await prisma.$transaction([
      prisma.taskSubmission.deleteMany({ where: { taskId: params.id } }),
      prisma.task.delete({ where: { id: params.id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("删除考试失败:", err)
    return NextResponse.json({ error: "删除考试失败" }, { status: 500 })
  }
}
