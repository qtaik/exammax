import { NextResponse } from "next/server"
import { compare, hash } from "bcryptjs"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error

  try {
    const body = await req.json()
    const { oldPassword, newPassword } = body as {
      oldPassword: string
      newPassword: string
    }

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "请填写旧密码和新密码" }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "新密码至少6个字符" }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user!.userId },
      select: { passwordHash: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const valid = await compare(oldPassword, dbUser.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "旧密码错误" }, { status: 400 })
    }

    const newHash = await hash(newPassword, 12)
    await prisma.user.update({
      where: { id: user!.userId },
      data: { passwordHash: newHash },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/user/password error:", error)
    return NextResponse.json({ error: "修改密码失败" }, { status: 500 })
  }
}
