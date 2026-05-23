import { NextResponse } from "next/server"
import redis from "@/lib/redis"
import { verifyToken } from "@/lib/auth"

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  try {
    const token = authHeader.slice(7)
    const payload = verifyToken(token)

    // 自增 session 版本号，使所有设备的 token 失效
    await redis.incr(`sessionVersion:${payload.userId}`)

    // 同时把当前 token 加入黑名单兜底
    const now = Math.floor(Date.now() / 1000)
    const ttl = Math.max(1, (payload.exp ?? now) - now)
    await redis.set(`blacklist:${token}`, "1", "EX", ttl)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "无效令牌" }, { status: 401 })
  }
}
