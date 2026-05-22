import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = requireAuth(req)
    if (authResult.error) return authResult.error

    const cls = await prisma.class.findUnique({ where: { id: params.id } })
    if (!cls) return NextResponse.json({ error: "班级不存在" }, { status: 404 })

    const { code } = await req.json()
    if (!code?.trim()) {
      return NextResponse.json({ error: "请输入邀请码" }, { status: 400 })
    }

    const invitation = await prisma.invitationCode.findUnique({
      where: { code: code.trim() },
    })

    if (!invitation) {
      return NextResponse.json({ error: "邀请码不存在" }, { status: 404 })
    }
    if (invitation.status !== "UNUSED") {
      return NextResponse.json({ error: "邀请码已使用或已过期" }, { status: 400 })
    }
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: "邀请码已过期" }, { status: 400 })
    }
    if (invitation.classId !== params.id) {
      return NextResponse.json({ error: "此邀请码不属于该班级" }, { status: 400 })
    }

    try {
      const member = await prisma.classMember.create({
        data: { classId: params.id, userId: authResult.user!.userId },
      })
      return NextResponse.json({ member }, { status: 201 })
    } catch {
      return NextResponse.json({ error: "你已在该班级中" }, { status: 400 })
    }
  } catch (error) {
    console.error("加入班级失败:", error)
    return NextResponse.json({ error: "加入班级失败" }, { status: 500 })
  }
}
