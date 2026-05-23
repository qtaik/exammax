import { NextResponse } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  const userId = params.id

  try {
    const [userBadges, allBadges] = await Promise.all([
      prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
        orderBy: { earnedAt: "desc" },
      }),
      prisma.badge.findMany({ orderBy: { createdAt: "asc" } }),
    ])

    return NextResponse.json({ userBadges, allBadges })
  } catch (err) {
    console.error("Get user badges error:", err)
    return NextResponse.json({ error: "获取徽章失败" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  const userId = params.id

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const { badgeId } = await req.json()
    if (!badgeId) {
      return NextResponse.json({ error: "缺少徽章ID" }, { status: 400 })
    }

    const badge = await prisma.badge.findUnique({ where: { id: badgeId } })
    if (!badge) {
      return NextResponse.json({ error: "徽章不存在" }, { status: 404 })
    }

    const existing = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } },
    })
    if (existing) {
      return NextResponse.json({ error: "用户已拥有此徽章" }, { status: 409 })
    }

    await prisma.userBadge.create({
      data: { userId, badgeId },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Grant badge error:", err)
    return NextResponse.json({ error: "发放徽章失败" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  const userId = params.id

  try {
    const url = new URL(req.url)
    const badgeId = url.searchParams.get("badgeId")
    if (!badgeId) {
      return NextResponse.json({ error: "缺少徽章ID" }, { status: 400 })
    }

    const existing = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } },
    })
    if (!existing) {
      return NextResponse.json({ error: "用户未拥有此徽章" }, { status: 404 })
    }

    await prisma.userBadge.delete({
      where: { userId_badgeId: { userId, badgeId } },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Revoke badge error:", err)
    return NextResponse.json({ error: "移除徽章失败" }, { status: 500 })
  }
}
