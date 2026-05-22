import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = requireAuth(req)
    if (authResult.error) return authResult.error
    if (!["TEACHER", "ADMIN"].includes(authResult.user!.role)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    const cls = await prisma.class.findUnique({ where: { id: params.id } })
    if (!cls) return NextResponse.json({ error: "班级不存在" }, { status: 404 })
    if (cls.teacherId !== authResult.user!.userId && authResult.user!.role !== "ADMIN") {
      return NextResponse.json({ error: "无权操作此班级" }, { status: 403 })
    }

    const { name, description } = await req.json()
    const updated = await prisma.class.update({
      where: { id: params.id },
      data: { name: name?.trim(), description },
    })

    return NextResponse.json({ class: updated })
  } catch (error) {
    console.error("更新班级失败:", error)
    return NextResponse.json({ error: "更新班级失败" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = requireAuth(req)
    if (authResult.error) return authResult.error
    if (!["TEACHER", "ADMIN"].includes(authResult.user!.role)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    const cls = await prisma.class.findUnique({ where: { id: params.id } })
    if (!cls) return NextResponse.json({ error: "班级不存在" }, { status: 404 })
    if (cls.teacherId !== authResult.user!.userId && authResult.user!.role !== "ADMIN") {
      return NextResponse.json({ error: "无权操作此班级" }, { status: 403 })
    }

    // 级联检查：有进行中的考试不能删
    const activeTasks = await prisma.task.count({
      where: { classId: params.id, deadline: { gt: new Date() } },
    })
    if (activeTasks > 0) {
      return NextResponse.json({ error: "班级有进行中的考试，无法删除" }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.classMember.deleteMany({ where: { classId: params.id } }),
      prisma.invitationCode.updateMany({ where: { classId: params.id }, data: { classId: null } }),
      prisma.class.delete({ where: { id: params.id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("删除班级失败:", error)
    return NextResponse.json({ error: "删除班级失败" }, { status: 500 })
  }
}
