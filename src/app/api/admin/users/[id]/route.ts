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
    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const { username, role } = await req.json()

    if (username !== undefined) {
      if (!username || username.trim().length === 0) {
        return NextResponse.json({ error: "用户名不能为空" }, { status: 400 })
      }
      const trimmed = username.trim()
      if (trimmed !== targetUser.username) {
        const existing = await prisma.user.findUnique({ where: { username: trimmed } })
        if (existing) {
          return NextResponse.json({ error: "用户名已存在" }, { status: 409 })
        }
        await prisma.user.update({ where: { id: userId }, data: { username: trimmed } })
      }
    }

    if (role !== undefined) {
      if (!["STUDENT", "TEACHER"].includes(role)) {
        return NextResponse.json({ error: "无效的角色" }, { status: 400 })
      }
      if (userId === user!.userId) {
        return NextResponse.json({ error: "不能修改自己的角色" }, { status: 400 })
      }
      await prisma.user.update({ where: { id: userId }, data: { role } })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Update user error:", err)
    return NextResponse.json({ error: "更新用户失败" }, { status: 500 })
  }
}
