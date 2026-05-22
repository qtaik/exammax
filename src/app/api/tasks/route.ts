import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseDatetimeInTimezone } from "@/lib/date-utils"

export async function GET(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const classId = searchParams.get("classId")

    if (user!.role === "TEACHER" || user!.role === "ADMIN") {
      const where: Record<string, unknown> = {}
      if (classId) {
        where.classId = classId
      } else if (user!.role !== "ADMIN") {
        // TEACHER without classId: no owned classes to show
        return NextResponse.json({ tasks: [] })
      }
      const tasks = await prisma.task.findMany({
        where,
        include: {
          class: { select: { id: true, name: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: "desc" },
      })
      return NextResponse.json({ tasks })
    }

    if (user!.role === "STUDENT") {
      // 学生查看自己的考试列表
      const now = new Date()
      const submissions = await prisma.taskSubmission.findMany({
        where: { userId: user!.userId },
        include: {
          task: {
            include: {
              class: { select: { id: true, name: true } },
              teacher: { select: { id: true, username: true } },
            },
          },
        },
        orderBy: { task: { deadline: "asc" } },
      })

      const tasks = await Promise.all(
        submissions.map(async (sub) => {
          let status = sub.status
          if (status === "PENDING" && sub.task.deadline < now) {
            status = "OVERDUE"
            await prisma.taskSubmission.update({
              where: { id: sub.id },
              data: { status: "OVERDUE" },
            })
            sub.status = "OVERDUE"
          }

          const questionIds = sub.task.questionIds as string[]

          return {
            id: sub.task.id,
            title: sub.task.title,
            description: sub.task.description,
            deadline: sub.task.deadline,
            class: sub.task.class,
            teacher: sub.task.teacher,
            status,
            submittedAt: sub.submittedAt,
            completedAt: sub.completedAt,
            questionCount: questionIds.length,
            perQuestionTime: sub.task.perQuestionTime,
            maxTabSwitches: sub.task.maxTabSwitches,
          }
        })
      )

      return NextResponse.json({ tasks })
    }

    return NextResponse.json({ tasks: [] })
  } catch (err) {
    console.error("获取考试列表失败:", err)
    return NextResponse.json({ error: "获取考试列表失败" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { error, user } = await requireAuth(req)
    if (error) return error
    if (!["TEACHER", "ADMIN"].includes(user!.role)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    const body = await req.json()
    const {
      classId, title, description, deadline,
      questionIds, questionOrder, perQuestionTime, maxTabSwitches,
    } = body

    if (!classId || !title?.trim() || !deadline || !questionIds?.length) {
      return NextResponse.json({ error: "缺少必填参数" }, { status: 400 })
    }

    // 验证教师是该班级的老师
    const cls = await prisma.class.findUnique({ where: { id: classId } })
    if (!cls) return NextResponse.json({ error: "班级不存在" }, { status: 404 })
    if (cls.teacherId !== user!.userId && user!.role !== "ADMIN") {
      return NextResponse.json({ error: "无权在此班级发布考试" }, { status: 403 })
    }

    // 创建考试 + 为全班学生创建 TaskSubmission
    const members = await prisma.classMember.findMany({
      where: { classId },
      select: { userId: true },
    })

    // 读取管理员配置的时区
    const tzSetting = await prisma.setting.findUnique({ where: { key: "timezone" } })
    const timezone = tzSetting?.value || "Asia/Shanghai"

    const task = await prisma.task.create({
      data: {
        teacherId: user!.userId,
        classId,
        title: title.trim(),
        description,
        deadline: parseDatetimeInTimezone(deadline, timezone),
        questionIds,
        questionOrder: questionOrder || "manual",
        perQuestionTime: perQuestionTime || null,
        maxTabSwitches: maxTabSwitches ?? 3,
        submissions: {
          create: members.map((m) => ({
            userId: m.userId,
            status: "PENDING",
          })),
        },
      },
      include: { _count: { select: { submissions: true } } },
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (err) {
    console.error("创建考试失败:", err)
    return NextResponse.json({ error: "创建考试失败" }, { status: 500 })
  }
}
