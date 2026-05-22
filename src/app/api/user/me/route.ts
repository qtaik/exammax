import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user!.userId },
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
    })

    if (!dbUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    return NextResponse.json({ user: dbUser })
  } catch {
    return NextResponse.json({ error: "获取用户信息失败" }, { status: 500 })
  }
}
