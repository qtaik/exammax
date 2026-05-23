import { NextResponse } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function calcLevel(experience: number): number {
  let level = 1
  let remaining = experience
  while (remaining >= 100 * level) {
    remaining -= 100 * level
    level++
  }
  return level
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  const userId = params.id

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, experience: true },
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

    const newExp = mode === "set" ? amount : targetUser.experience + amount
    if (newExp < 0) {
      return NextResponse.json({ error: "经验不能小于 0" }, { status: 400 })
    }

    const newLevel = calcLevel(newExp)

    await prisma.user.update({
      where: { id: userId },
      data: { experience: newExp, level: newLevel },
    })

    return NextResponse.json({ success: true, experience: newExp, level: newLevel })
  } catch (err) {
    console.error("Update experience error:", err)
    return NextResponse.json({ error: "更新经验失败" }, { status: 500 })
  }
}
