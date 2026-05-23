import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error

  try {
    const badges = await prisma.badge.findMany({
      include: {
        users: {
          where: { userId: user!.userId },
          select: { earnedAt: true, equipped: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    const achievements = badges.map((badge) => ({
      id: badge.id,
      name: badge.name,
      icon: badge.icon,
      description: badge.description,
      condition: badge.condition,
      earned: badge.users.length > 0,
      equipped: badge.users.length > 0 ? badge.users[0].equipped : false,
      earnedAt: badge.users.length > 0 ? badge.users[0].earnedAt.toISOString() : undefined,
    }))

    return NextResponse.json({ achievements })
  } catch (error) {
    console.error("GET /api/achievements error:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
