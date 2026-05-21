import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { prisma } from "@/lib/prisma"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: string
      username: string
      role: string
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
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

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ error: "认证失败" }, { status: 401 })
  }
}
