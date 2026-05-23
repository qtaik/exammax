import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user!.userId },
      select: { points: true, pityCounter: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    return NextResponse.json({
      points: dbUser.points,
      pityCounter: dbUser.pityCounter,
    })
  } catch (err) {
    console.error("Lottery GET error:", err)
    return NextResponse.json({ error: "获取抽奖信息失败" }, { status: 500 })
  }
}
