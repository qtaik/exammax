import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { prisma } from "./prisma"
import redis from "./redis"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

export interface AuthPayload {
  userId: string
  username: string
  role: string
  accountCodeId?: string | null
  exp?: number
  iat?: number
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

export async function requireAuth(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "未登录" }, { status: 401 }), user: null }
  }
  try {
    const token = authHeader.slice(7)
    const payload = verifyToken(token)

    // 检查 token 是否在黑名单中（已登出）
    const blacklisted = await redis.get(`blacklist:${token}`)
    if (blacklisted) {
      return { error: NextResponse.json({ error: "令牌已失效，请重新登录" }, { status: 401 }), user: null }
    }

    // 非 Admin 用户必须有有效账户码
    if (payload.role !== "ADMIN") {
      if (!payload.accountCodeId) {
        return { error: NextResponse.json({ error: "账户未绑定有效码，请联系管理员" }, { status: 401 }), user: null }
      }
      const code = await prisma.accountCode.findUnique({
        where: { id: payload.accountCodeId },
        select: { id: true, status: true, expiresAt: true },
      })
      if (!code || code.status === "REVOKED") {
        return { error: NextResponse.json({ error: "账户已失效，请联系管理员" }, { status: 401 }), user: null }
      }
      if (code.expiresAt && code.expiresAt <= new Date()) {
        if (code.status === "ACTIVE") {
          await prisma.accountCode.update({
            where: { id: code.id },
            data: { status: "EXPIRED" },
          })
        }
        return { error: NextResponse.json({ error: "账户已失效，请联系管理员" }, { status: 401 }), user: null }
      }
    }

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
