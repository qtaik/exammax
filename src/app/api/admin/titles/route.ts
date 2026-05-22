import { NextResponse } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const titles = await prisma.shopItem.findMany({
      where: { type: "TITLE" },
      orderBy: [{ limited: "asc" }, { createdAt: "desc" }],
    })

    return NextResponse.json({ titles })
  } catch (err) {
    console.error("获取称号列表失败:", err)
    return NextResponse.json({ error: "获取称号列表失败" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const body = await req.json()
    const { name, icon, price, limited } = body as {
      name: string
      icon?: string
      price?: number
      limited?: boolean
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "称号名称不能为空" }, { status: 400 })
    }

    if (!limited && (!price || price < 0)) {
      return NextResponse.json({ error: "商城称号需要设置价格" }, { status: 400 })
    }

    const title = await prisma.shopItem.create({
      data: {
        name: name.trim(),
        type: "TITLE",
        icon: icon?.trim() || null,
        price: limited ? 0 : (price || 0),
        limited: limited || false,
      },
    })

    return NextResponse.json({ title })
  } catch (err) {
    console.error("创建称号失败:", err)
    return NextResponse.json({ error: "创建称号失败" }, { status: 500 })
  }
}
