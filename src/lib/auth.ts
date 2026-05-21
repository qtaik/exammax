import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { prisma } from "./prisma"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

export interface AuthPayload {
  userId: string
  username: string
  role: string
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload
}

export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  try {
    const token = authHeader.slice(7)
    const payload = verifyToken(token)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, role: true, points: true, experience: true, level: true, streakDays: true, lastCheckIn: true },
    })
    return user
  } catch {
    return null
  }
}

export function requireAuth(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "未登录" }, { status: 401 }), user: null }
  }
  try {
    const token = authHeader.slice(7)
    const payload = verifyToken(token)
    return { error: null, user: payload }
  } catch {
    return { error: NextResponse.json({ error: "认证失败" }, { status: 401 }), user: null }
  }
}

export function requireRole(user: AuthPayload, roles: string[]) {
  if (!roles.includes(user.role)) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 })
  }
  return null
}
