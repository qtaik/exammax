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
  } catch {
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

    const dbUser = await prisma.user.findUnique({
      where: { id: user!.userId },
      select: { points: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const item = await prisma.shopItem.findUnique({
      where: { id: itemId },
    })

    if (!item) {
      return NextResponse.json({ error: "商品不存在" }, { status: 404 })
    }

    // Check if already purchased
    const existingPurchase = await prisma.userItem.findUnique({
      where: {
        userId_itemId: {
          userId: user!.userId,
          itemId,
        },
      },
    })

    if (existingPurchase) {
      return NextResponse.json({ error: "已购买该商品" }, { status: 400 })
    }

    // Check if enough points
    if (dbUser.points < item.price) {
      return NextResponse.json({ error: "积分不足" }, { status: 400 })
    }

    // Deduct points, create UserItem, create PointLog
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user!.userId },
        data: {
          points: { decrement: item.price },
        },
      }),
      prisma.userItem.create({
        data: {
          userId: user!.userId,
          itemId,
        },
      }),
      prisma.pointLog.create({
        data: {
          userId: user!.userId,
          points: -item.price,
          reason: `兑换商品: ${item.name}`,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      newPoints: updatedUser.points,
    })
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
