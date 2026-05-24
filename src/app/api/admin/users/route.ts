import { NextResponse } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma, Role } from "@prisma/client"

export async function GET(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  if (!["ADMIN", "TEACHER"].includes(user!.role)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 })
  }

  try {
    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")))
    const search = url.searchParams.get("search") || undefined
    const role = url.searchParams.get("role") as Role | undefined

    const where: Prisma.UserWhereInput = {}
    if (search) {
      where.username = { contains: search }
    }
    if (role && ["STUDENT", "TEACHER", "ADMIN"].includes(role)) {
      where.role = role
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          role: true,
          points: true,
          experience: true,
          level: true,
          streakDays: true,
          createdAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error("Get users error:", err)
    return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const url = new URL(req.url)
    const idsParam = url.searchParams.get("ids")
    const singleId = url.searchParams.get("id")

    let ids: string[]
    if (idsParam) {
      ids = idsParam.split(",").filter(Boolean)
    } else if (singleId) {
      ids = [singleId]
    } else {
      return NextResponse.json({ error: "请选择要删除的用户" }, { status: 400 })
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: "请选择要删除的用户" }, { status: 400 })
    }

    // 不能删除自己
    if (ids.includes(user!.userId)) {
      return NextResponse.json({ error: "不能删除自己的账户" }, { status: 400 })
    }

    // 不能删除管理员
    const adminUsers = await prisma.user.findMany({
      where: { id: { in: ids }, role: "ADMIN" },
      select: { id: true, username: true },
    })
    if (adminUsers.length > 0) {
      const names = adminUsers.map((u) => u.username).join("、")
      return NextResponse.json(
        { error: `以下用户为管理员，不可删除：${names}` },
        { status: 400 }
      )
    }

    // 验证用户存在并区分教师
    const targetUsers = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, role: true },
    })
    if (targetUsers.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const teacherIds = targetUsers
      .filter((u) => u.role === "TEACHER")
      .map((u) => u.id)

    let deletedTasks = 0
    let deletedTaskSubmissions = 0
    let deletedClasses = 0

    await prisma.$transaction(async (tx) => {
      // Layer 1: 直接关联
      await tx.pointLog.deleteMany({ where: { userId: { in: ids } } })
      await tx.userBadge.deleteMany({ where: { userId: { in: ids } } })
      await tx.userItem.deleteMany({ where: { userId: { in: ids } } })
      await tx.wrongQuestion.deleteMany({ where: { userId: { in: ids } } })
      await tx.answerRecord.deleteMany({ where: { userId: { in: ids } } })
      await tx.taskSubmission.deleteMany({ where: { userId: { in: ids } } })
      await tx.classMember.deleteMany({ where: { userId: { in: ids } } })

      // Layer 2: 教师拥有的资源
      if (teacherIds.length > 0) {
        // 2a: 教师创建的 Task
        const taughtTasks = await tx.task.findMany({
          where: { teacherId: { in: teacherIds } },
          select: { id: true },
        })
        const taughtTaskIds = taughtTasks.map((t) => t.id)
        if (taughtTaskIds.length > 0) {
          const r1 = await tx.taskSubmission.deleteMany({
            where: { taskId: { in: taughtTaskIds } },
          })
          deletedTaskSubmissions += r1.count
          const r2 = await tx.task.deleteMany({
            where: { id: { in: taughtTaskIds } },
          })
          deletedTasks += r2.count
        }

        // 2b: 教师创建的 Class
        const taughtClasses = await tx.class.findMany({
          where: { teacherId: { in: teacherIds } },
          select: { id: true },
        })
        const classIds = taughtClasses.map((c) => c.id)
        if (classIds.length > 0) {
          const classTasks = await tx.task.findMany({
            where: { classId: { in: classIds } },
            select: { id: true },
          })
          const classTaskIds = classTasks.map((t) => t.id)
          if (classTaskIds.length > 0) {
            const r3 = await tx.taskSubmission.deleteMany({
              where: { taskId: { in: classTaskIds } },
            })
            deletedTaskSubmissions += r3.count
            const r4 = await tx.task.deleteMany({
              where: { id: { in: classTaskIds } },
            })
            deletedTasks += r4.count
          }

          await tx.classCode.deleteMany({ where: { classId: { in: classIds } } })
          await tx.classMember.deleteMany({ where: { classId: { in: classIds } } })
          const r5 = await tx.class.deleteMany({
            where: { id: { in: classIds } },
          })
          deletedClasses += r5.count
        }
      }

      // Layer 3: FK 置 null
      await tx.accountCode.updateMany({
        where: { createdById: { in: ids } },
        data: { createdById: null },
      })
      await tx.classCode.updateMany({
        where: { createdById: { in: ids } },
        data: { createdById: null },
      })

      // Layer 4: 用户本身
      await tx.user.deleteMany({ where: { id: { in: ids } } })
    })

    return NextResponse.json({
      success: true,
      deleted: targetUsers.length,
      ...(deletedTasks > 0 && { deletedTasks }),
      ...(deletedTaskSubmissions > 0 && { deletedTaskSubmissions }),
      ...(deletedClasses > 0 && { deletedClasses }),
    })
  } catch (err) {
    console.error("Delete user error:", err)
    return NextResponse.json({ error: "删除用户失败" }, { status: 500 })
  }
}
