import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const type = url.searchParams.get("type") || "points"
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam ? parseInt(limitParam, 10) : 50

    const sortField = type === "experience" ? "experience" : "points"

    const users = await prisma.user.findMany({
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
              select: { id: true, name: true, icon: true },
            },
          },
          take: 5,
        },
      },
      orderBy: { [sortField]: "desc" },
      take: limit,
    })

    // Batch fetch active titles for users who have one
    const activeTitleIds = [...new Set(users.map((u) => u.activeTitleId).filter(Boolean))] as string[]
    const titleItems = activeTitleIds.length > 0
      ? await prisma.shopItem.findMany({
          where: { id: { in: activeTitleIds } },
          select: { id: true, name: true, icon: true },
        })
      : []
    const titleMap = new Map(titleItems.map((t) => [t.id, t]))

    const leaderboard = users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      points: u.points,
      experience: u.experience,
      level: u.level,
      streakDays: u.streakDays,
      equippedBadges: u.badges.map((ub) => ({
        id: ub.badge.id,
        name: ub.badge.name,
        icon: ub.badge.icon,
      })),
      activeTitle: u.activeTitleId ? titleMap.get(u.activeTitleId) || null : null,
    }))

    // Try to get current user's rank if authenticated
    let currentUserRank: number | null = null
    const currentUser = await getAuthUser(req)

    if (currentUser) {
      const rank = await prisma.user.count({
        where: {
          [sortField]: { gt: currentUser[sortField as keyof typeof currentUser] as number },
        },
      })
      currentUserRank = rank + 1

      // Check if current user is already in the list
      const isInList = users.some((u) => u.id === currentUser.id)

      if (!isInList) {
        // Fetch full current user data with badges and title
        const fullUser = await prisma.user.findUnique({
          where: { id: currentUser.id },
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
                  select: { id: true, name: true, icon: true },
                },
              },
              take: 5,
            },
          },
        })

        if (fullUser) {
          let userTitle = null
          if (fullUser.activeTitleId) {
            userTitle = titleMap.get(fullUser.activeTitleId) || await prisma.shopItem.findUnique({
              where: { id: fullUser.activeTitleId },
              select: { id: true, name: true, icon: true },
            })
          }

          return NextResponse.json({
            leaderboard,
            currentUser: {
              id: fullUser.id,
              username: fullUser.username,
              role: fullUser.role,
              points: fullUser.points,
              experience: fullUser.experience,
              level: fullUser.level,
              streakDays: fullUser.streakDays,
              equippedBadges: fullUser.badges.map((ub) => ({
                id: ub.badge.id,
                name: ub.badge.name,
                icon: ub.badge.icon,
              })),
              activeTitle: userTitle,
              rank: currentUserRank,
            },
          })
        }
      }
    }

    return NextResponse.json({
      leaderboard,
      ...(currentUser && { currentUser: { id: currentUser.id, rank: currentUserRank } }),
    })
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
