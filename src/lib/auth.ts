import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { prisma } from "./prisma"
import redis from "./redis"

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is required in production")
    }
    console.warn("[auth] JWT_SECRET not set — using insecure default (development only)")
    return "dev-insecure-default-do-not-use-in-prod"
  }
  return secret
}

export interface AuthPayload {
  userId: string
  username: string
  role: string
  accountCodeId?: string | null
  sv?: number
  exp?: number
  iat?: number
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, getJwtSecret()) as AuthPayload
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

    // 单终端登录校验：token 中的 sv 必须与 Redis 中的一致
    // 老 token 无 sv 字段视为 0，一旦 Redis 有版本号就被踢
    const currentSv = await redis.get(`sessionVersion:${payload.userId}`)
    const tokenSv = payload.sv ?? 0
    console.log(`[sessionCheck] userId=${payload.userId} tokenSv=${tokenSv} redisSv=${currentSv}`)
    if (currentSv && parseInt(currentSv) !== tokenSv) {
      console.log(`[sessionCheck] MISMATCH — kicking user ${payload.userId}`)
      return { error: NextResponse.json({ error: "账号已在其他设备登录，请重新登录" }, { status: 401 }), user: null }
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
