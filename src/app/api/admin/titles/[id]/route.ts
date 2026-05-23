import { NextResponse } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const existing = await prisma.shopItem.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: "称号不存在" }, { status: 404 })
    }

    const body = await req.json()
    const { name, icon, price, limited } = body as {
      name?: string
      icon?: string
      price?: number
      limited?: boolean
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name.trim()
    if (icon !== undefined) data.icon = icon.trim() || null
    if (limited !== undefined) {
      data.limited = limited
      if (limited) data.price = 0
    }
    if (price !== undefined && !limited && !data.limited) data.price = price

    const title = await prisma.shopItem.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ title })
  } catch (err) {
    console.error("更新称号失败:", err)
    return NextResponse.json({ error: "更新称号失败" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const existing = await prisma.shopItem.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: "称号不存在" }, { status: 404 })
    }

    // 清理关联数据
    await prisma.$transaction([
      prisma.userItem.deleteMany({ where: { itemId: params.id } }),
      prisma.user.updateMany({ where: { activeTitleId: params.id }, data: { activeTitleId: null } }),
      prisma.shopItem.delete({ where: { id: params.id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("删除称号失败:", err)
    return NextResponse.json({ error: "删除称号失败" }, { status: 500 })
  }
}
