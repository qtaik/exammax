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
    const [targetUser, userTitles] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { activeTitleId: true },
      }),
      prisma.userItem.findMany({
        where: { userId, item: { type: "TITLE" } },
        include: { item: true },
      }),
    ])

    if (!targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    return NextResponse.json({
      activeTitleId: targetUser.activeTitleId,
      userTitles,
    })
  } catch (err) {
    console.error("Get user titles error:", err)
    return NextResponse.json({ error: "获取称号失败" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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

    const { titleId } = await req.json()
    if (!titleId) {
      return NextResponse.json({ error: "缺少称号ID" }, { status: 400 })
    }

    const hasItem = await prisma.userItem.findFirst({
      where: { userId, itemId: titleId },
    })
    if (!hasItem) {
      return NextResponse.json({ error: "用户未拥有此称号" }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { activeTitleId: titleId },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Set title error:", err)
    return NextResponse.json({ error: "设置称号失败" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
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

    await prisma.user.update({
      where: { id: userId },
      data: { activeTitleId: null },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Unset title error:", err)
    return NextResponse.json({ error: "取消称号失败" }, { status: 500 })
  }
}
