import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const authResult = await requireAuth(req)
    if (authResult.error) return authResult.error

    const user = authResult.user!
    let classes

    if (user.role === "TEACHER" || user.role === "ADMIN") {
      const url = new URL(req.url)
      const teacherIdParam = url.searchParams.get("teacherId")
      const where: Record<string, unknown> = {}
      // ADMIN without teacherId filter: see all classes
      if (user.role === "ADMIN" && !teacherIdParam) {
        // no where filter
      } else {
        where.teacherId = teacherIdParam || user.userId
      }
      classes = await prisma.class.findMany({
        where,
        include: {
          _count: { select: { members: true, tasks: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    } else {
      // 学生：查看自己加入的班级
      classes = await prisma.class.findMany({
        where: { members: { some: { userId: user.userId } } },
        include: {
          teacher: { select: { id: true, username: true } },
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    }

    return NextResponse.json({ classes })
  } catch (error) {
    console.error("获取班级列表失败:", error)
    return NextResponse.json({ error: "获取班级列表失败" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth(req)
    if (authResult.error) return authResult.error
    if (!["TEACHER", "ADMIN"].includes(authResult.user!.role)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    const { name, description } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: "请输入班级名称" }, { status: 400 })
    }

    const cls = await prisma.class.create({
      data: {
        name: name.trim(),
        description,
        teacherId: authResult.user!.userId,
      },
    })

    return NextResponse.json({ class: cls }, { status: 201 })
  } catch (error) {
    console.error("创建班级失败:", error)
    return NextResponse.json({ error: "创建班级失败" }, { status: 500 })
  }
}
