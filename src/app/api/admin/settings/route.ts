import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const authResult = await requireAuth(req)
    if (authResult.error) return authResult.error
    if (authResult.user!.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    const settings = await prisma.setting.findMany()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error("获取设置失败:", error)
    return NextResponse.json({ error: "获取设置失败" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const authResult = await requireAuth(req)
    if (authResult.error) return authResult.error
    if (authResult.user!.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    const { key, value } = await req.json()
    if (!key) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 })
    }

    const setting = await prisma.setting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    })

    return NextResponse.json({ setting })
  } catch (error) {
    console.error("更新设置失败:", error)
    return NextResponse.json({ error: "更新设置失败" }, { status: 500 })
  }
}
