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
        showBadgeFirst: true,
        showBadgeText: true,
        activeTitleId: true,
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

export async function PATCH(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error

  try {
    const body = await req.json()
    const { username, showBadgeFirst, showBadgeText } = body as {
      username?: string
      showBadgeFirst?: boolean
      showBadgeText?: boolean
    }

    const data: Record<string, unknown> = {}

    if (username !== undefined) {
      if (!username || username.length < 2 || username.length > 20) {
        return NextResponse.json({ error: "用户名须在2-20字符之间" }, { status: 400 })
      }
      // Check uniqueness
      const existing = await prisma.user.findUnique({ where: { username } })
      if (existing && existing.id !== user!.userId) {
        return NextResponse.json({ error: "用户名已被占用" }, { status: 400 })
      }
      data.username = username
    }

    if (showBadgeFirst !== undefined) {
      data.showBadgeFirst = showBadgeFirst
    }

    if (showBadgeText !== undefined) {
      data.showBadgeText = showBadgeText
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "无更新内容" }, { status: 400 })
    }

    await prisma.user.update({ where: { id: user!.userId }, data })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 })
  }
}
