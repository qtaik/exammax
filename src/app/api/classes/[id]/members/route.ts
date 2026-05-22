import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = requireAuth(req)
    if (authResult.error) return authResult.error

    const cls = await prisma.class.findUnique({
      where: { id: params.id },
      include: { teacher: { select: { id: true, username: true } } },
    })
    if (!cls) return NextResponse.json({ error: "班级不存在" }, { status: 404 })

    // 权限：教师本人或班级成员
    if (cls.teacherId !== authResult.user!.userId && authResult.user!.role !== "ADMIN") {
      const isMember = await prisma.classMember.findUnique({
        where: { classId_userId: { classId: params.id, userId: authResult.user!.userId } },
      })
      if (!isMember) return NextResponse.json({ error: "无权访问" }, { status: 403 })
    }

    const members = await prisma.classMember.findMany({
      where: { classId: params.id },
      include: {
        user: { select: { id: true, username: true, role: true, points: true, level: true } },
      },
      orderBy: { joinedAt: "desc" },
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error("获取成员列表失败:", error)
    return NextResponse.json({ error: "获取成员列表失败" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
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

    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: "请提供用户ID" }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 })

    try {
      const member = await prisma.classMember.create({
        data: { classId: params.id, userId },
        include: { user: { select: { id: true, username: true, role: true } } },
      })
      return NextResponse.json({ member }, { status: 201 })
    } catch {
      return NextResponse.json({ error: "该用户已在班级中" }, { status: 400 })
    }
  } catch (error) {
    console.error("添加成员失败:", error)
    return NextResponse.json({ error: "添加成员失败" }, { status: 500 })
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

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    if (!userId) return NextResponse.json({ error: "请提供用户ID" }, { status: 400 })

    await prisma.classMember.deleteMany({
      where: { classId: params.id, userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("移除成员失败:", error)
    return NextResponse.json({ error: "移除成员失败" }, { status: 500 })
  }
}
