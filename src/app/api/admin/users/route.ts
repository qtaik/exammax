import { NextResponse } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

export async function GET(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")))
    const search = url.searchParams.get("search") || undefined
    const role = url.searchParams.get("role") as Role | undefined

    const where: any = {}
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

export async function PATCH(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const body = await req.json()
    const { userId, role } = body as { userId: string; role: Role }

    if (!userId || !role) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    if (!["STUDENT", "TEACHER", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "无效的角色" }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Update user role error:", err)
    return NextResponse.json({ error: "更新用户角色失败" }, { status: 500 })
  }
}
