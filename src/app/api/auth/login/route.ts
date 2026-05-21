import { NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { z } from "zod"
import jwt from "jsonwebtoken"
import { prisma } from "@/lib/prisma"
import redis from "@/lib/redis"

const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
})

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"
const MAX_ATTEMPTS = 10
const LOCK_DURATION = 5 * 60 // 5 分钟（秒）

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { username, password } = loginSchema.parse(body)

    // 检查是否被锁定
    const lockKey = `login:lock:${username}`
    const isLocked = await redis.get(lockKey)

    if (isLocked) {
      return NextResponse.json(
        { error: "账户已锁定，请5分钟后再试" },
        { status: 429 }
      )
    }

    // 验证用户
    const user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user) {
      await recordLoginFailure(username)
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      )
    }

    // 验证密码
    const isPasswordValid = await compare(password, user.passwordHash)

    if (!isPasswordValid) {
      await recordLoginFailure(username)
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      )
    }

    // 登录成功，清除失败记录
    const attemptsKey = `login:attempts:${username}`
    await redis.del(attemptsKey)
    await redis.del(lockKey)

    // 生成 JWT
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    )

    return NextResponse.json(
      {
        message: "登录成功",
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Login error:", error)
    return NextResponse.json(
      { error: "登录失败，请稍后重试" },
      { status: 500 }
    )
  }
}

async function recordLoginFailure(username: string) {
  const attemptsKey = `login:attempts:${username}`
  const lockKey = `login:lock:${username}`

  const attempts = await redis.incr(attemptsKey)

  if (attempts === 1) {
    // 设置过期时间（1小时后自动清除）
    await redis.expire(attemptsKey, 3600)
  }

  if (attempts >= MAX_ATTEMPTS) {
    // 锁定账户
    await redis.set(lockKey, "1", "EX", LOCK_DURATION)
  }
}
