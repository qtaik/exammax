import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    const userData = await prisma.user.findUnique({
      where: { id: user!.userId },
      select: { activeTitleId: true },
    })

    if (!userData) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    let activeTitle = null
    if (userData.activeTitleId) {
      const titleItem = await prisma.shopItem.findUnique({
        where: { id: userData.activeTitleId },
        select: { id: true, name: true, icon: true, description: true },
      })
      activeTitle = titleItem
    }

    return NextResponse.json({ activeTitle })
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    const body = await req.json()
    const { itemId } = body as { itemId: string }

    if (!itemId) {
      return NextResponse.json({ error: "缺少称号ID" }, { status: 400 })
    }

    // Check if the item exists and is a TITLE type
    const item = await prisma.shopItem.findUnique({
      where: { id: itemId },
    })

    if (!item) {
      return NextResponse.json({ error: "称号不存在" }, { status: 404 })
    }

    if (item.type !== "TITLE") {
      return NextResponse.json({ error: "该物品不是称号类型" }, { status: 400 })
    }

    // Check if user owns this item
    const userItem = await prisma.userItem.findUnique({
      where: {
        userId_itemId: {
          userId: user!.userId,
          itemId,
        },
      },
    })

    if (!userItem) {
      return NextResponse.json({ error: "你尚未拥有此称号" }, { status: 400 })
    }

    // Set active title
    await prisma.user.update({
      where: { id: user!.userId },
      data: { activeTitleId: itemId },
    })

    return NextResponse.json({ success: true, message: "称号已设置", activeTitle: { id: item.id, name: item.name, icon: item.icon } })
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
