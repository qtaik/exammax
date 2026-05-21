import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    // 获取分配给当前用户的任务
    const submissions = await prisma.taskSubmission.findMany({
      where: { userId: user!.userId },
      include: {
        task: {
          include: {
            teacher: {
              select: { id: true, username: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // 检查并更新逾期状态
    const now = new Date()
    const tasks = await Promise.all(
      submissions.map(async (sub) => {
        let status = sub.status

        // 如果任务已逾期但状态仍为PENDING，更新状态
        if (status === "PENDING" && sub.task.deadline < now) {
          status = "OVERDUE"
          await prisma.taskSubmission.update({
            where: { id: sub.id },
            data: { status: "OVERDUE" },
          })
        }

        const questionIds = sub.task.questionIds as string[]

        return {
          id: sub.task.id,
          title: sub.task.title,
          description: sub.task.description,
          deadline: sub.task.deadline,
          status,
          completedAt: sub.completedAt,
          questionCount: questionIds.length,
          teacher: sub.task.teacher,
        }
      })
    )

    return NextResponse.json({ tasks })
  } catch (err) {
    console.error("获取任务列表失败:", err)
    return NextResponse.json({ error: "获取任务列表失败" }, { status: 500 })
  }
}
