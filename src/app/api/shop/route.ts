import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user!.userId },
      select: { points: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const items = await prisma.shopItem.findMany({
      include: {
        users: {
          where: { userId: user!.userId },
          select: { id: true },
        },
      },
      orderBy: { price: "asc" },
    })

    const formattedItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      price: item.price,
      description: item.description,
      icon: item.icon,
      limited: item.limited,
      purchased: item.users.length > 0,
    }))

    return NextResponse.json({
      items: formattedItems,
      userPoints: dbUser.points,
    })
  } catch (error) {
    console.error("GET /api/shop error:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error

  try {
    const body = await req.json()
    const { itemId } = body

    if (!itemId) {
      return NextResponse.json({ error: "缺少商品ID" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const [dbUser, item, existingPurchase] = await Promise.all([
        tx.user.findUnique({
          where: { id: user!.userId },
          select: { points: true },
        }),
        tx.shopItem.findUnique({ where: { id: itemId } }),
        tx.userItem.findUnique({
          where: { userId_itemId: { userId: user!.userId, itemId } },
        }),
      ])

      if (!dbUser) return { status: 404 as const, error: "用户不存在" }
      if (!item) return { status: 404 as const, error: "商品不存在" }
      if (existingPurchase) return { status: 400 as const, error: "已购买该商品" }
      if (dbUser.points < item.price) return { status: 400 as const, error: "积分不足" }

      const [updatedUser] = await Promise.all([
        tx.user.update({
          where: { id: user!.userId },
          data: { points: { decrement: item.price } },
        }),
        tx.userItem.create({
          data: { userId: user!.userId, itemId },
        }),
        tx.pointLog.create({
          data: {
            userId: user!.userId,
            points: -item.price,
            reason: `兑换商品: ${item.name}`,
          },
        }),
      ])

      return { status: 200 as const, newPoints: updatedUser.points }
    })

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ success: true, newPoints: result.newPoints })
  } catch (error) {
    console.error("POST /api/shop error:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
