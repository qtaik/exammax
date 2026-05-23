import { NextResponse } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  const userId = params.id

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, points: true },
    })
    if (!targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const { mode, amount } = await req.json()
    if (!["set", "add"].includes(mode)) {
      return NextResponse.json({ error: "mode 必须为 set 或 add" }, { status: 400 })
    }
    if (typeof amount !== "number" || !Number.isInteger(amount)) {
      return NextResponse.json({ error: "amount 必须为整数" }, { status: 400 })
    }

    const newPoints = mode === "set" ? amount : targetUser.points + amount
    if (newPoints < 0) {
      return NextResponse.json({ error: "积分不能小于 0" }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { points: newPoints },
    })

    return NextResponse.json({ success: true, points: newPoints })
  } catch (err) {
    console.error("Update points error:", err)
    return NextResponse.json({ error: "更新积分失败" }, { status: 500 })
  }
}
