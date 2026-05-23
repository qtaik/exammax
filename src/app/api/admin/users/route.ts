import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

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
