import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const registerSchema = z.object({
  username: z.string().min(2, "用户名至少2个字符").max(20, "用户名最多20个字符"),
  password: z.string().min(6, "密码至少6个字符"),
  invitationCode: z.string().min(1, "请输入邀请码"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { username, password, invitationCode } = registerSchema.parse(body)

    // 验证邀请码
    const invitation = await prisma.invitationCode.findUnique({
      where: { code: invitationCode },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: "邀请码不存在" },
        { status: 400 }
      )
    }

    if (invitation.status !== "UNUSED") {
      return NextResponse.json(
        { error: "邀请码已被使用" },
        { status: 400 }
      )
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      await prisma.invitationCode.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      })
      return NextResponse.json(
        { error: "邀请码已过期" },
        { status: 400 }
      )
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "用户名已被注册" },
        { status: 400 }
      )
    }

    // 创建用户
    const passwordHash = await hash(password, 12)
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: invitation.role,
      },
    })

    // 标记邀请码为已使用
    await prisma.invitationCode.update({
      where: { id: invitation.id },
      data: {
        status: "USED",
        usedById: user.id,
        usedAt: new Date(),
      },
    })

    return NextResponse.json(
      { message: "注册成功", userId: user.id },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    )
  }
}
