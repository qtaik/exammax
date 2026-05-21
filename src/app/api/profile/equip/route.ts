import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

const MAX_EQUIPPED = 5

export async function GET(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    const userData = await prisma.user.findUnique({
      where: { id: user!.userId },
      select: {
        id: true,
        username: true,
        role: true,
        points: true,
        experience: true,
        level: true,
        streakDays: true,
        activeTitleId: true,
        badges: {
          where: { equipped: true },
          include: {
            badge: {
              select: { id: true, name: true, icon: true, description: true },
            },
          },
        },
        items: {
          where: { itemId: user!.userId ? undefined : undefined },
          select: {
            itemId: true,
            item: { select: { id: true, name: true, type: true } },
          },
        },
      },
    })

    if (!userData) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    // Get active title info if set
    let activeTitle = null
    if (userData.activeTitleId) {
      const titleItem = await prisma.shopItem.findUnique({
        where: { id: userData.activeTitleId },
        select: { id: true, name: true, icon: true },
      })
      activeTitle = titleItem
    }

    const equippedBadges = userData.badges.map((ub) => ({
      id: ub.badge.id,
      name: ub.badge.name,
      icon: ub.badge.icon,
      description: ub.badge.description,
      equippedAt: ub.earnedAt.toISOString(),
    }))

    return NextResponse.json({
      user: {
        id: userData.id,
        username: userData.username,
        role: userData.role,
        points: userData.points,
        experience: userData.experience,
        level: userData.level,
        streakDays: userData.streakDays,
      },
      equippedBadges,
      activeTitle,
    })
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    const body = await req.json()
    const { badgeId } = body as { badgeId: string }

    if (!badgeId) {
      return NextResponse.json({ error: "缺少徽章ID" }, { status: 400 })
    }

    // Check if user owns this badge
    const userBadge = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId: user!.userId,
          badgeId,
        },
      },
    })

    if (!userBadge) {
      return NextResponse.json({ error: "你尚未获得此徽章" }, { status: 400 })
    }

    if (userBadge.equipped) {
      return NextResponse.json({ error: "该徽章已装备" }, { status: 400 })
    }

    // Check how many badges are currently equipped
    const equippedCount = await prisma.userBadge.count({
      where: {
        userId: user!.userId,
        equipped: true,
      },
    })

    if (equippedCount >= MAX_EQUIPPED) {
      return NextResponse.json(
        { error: `最多只能装备 ${MAX_EQUIPPED} 个徽章` },
        { status: 400 }
      )
    }

    // Equip the badge
    await prisma.userBadge.update({
      where: { id: userBadge.id },
      data: { equipped: true },
    })

    return NextResponse.json({ success: true, message: "徽章已装备" })
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    const body = await req.json()
    const { badgeId } = body as { badgeId: string }

    if (!badgeId) {
      return NextResponse.json({ error: "缺少徽章ID" }, { status: 400 })
    }

    // Check if user owns this badge
    const userBadge = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId: user!.userId,
          badgeId,
        },
      },
    })

    if (!userBadge) {
      return NextResponse.json({ error: "你尚未获得此徽章" }, { status: 400 })
    }

    if (!userBadge.equipped) {
      return NextResponse.json({ error: "该徽章未装备" }, { status: 400 })
    }

    // Unequip the badge
    await prisma.userBadge.update({
      where: { id: userBadge.id },
      data: { equipped: false },
    })

    return NextResponse.json({ success: true, message: "徽章已卸下" })
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
