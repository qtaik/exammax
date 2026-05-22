import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const authResult = requireAuth(req)
    if (authResult.error) return authResult.error

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
      return NextResponse.json({ error: "邀请码已被使用" }, { status: 400 })
    }
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: "邀请码已过期" }, { status: 400 })
    }

    if (!invitation.classId) {
      return NextResponse.json({ error: "此邀请码未关联班级" }, { status: 400 })
    }

    // Check if already a member
    const existing = await prisma.classMember.findUnique({
      where: {
        classId_userId: {
          classId: invitation.classId,
          userId: authResult.user!.userId,
        },
      },
    })
    if (existing) {
      return NextResponse.json({ error: "你已在该班级中" }, { status: 400 })
    }

    // Mark invitation as used first — fail-fast to avoid orphan ClassMember
    await prisma.invitationCode.update({
      where: { id: invitation.id },
      data: { status: "USED", usedById: authResult.user!.userId, usedAt: new Date() },
    })

    const member = await prisma.classMember.create({
      data: { classId: invitation.classId, userId: authResult.user!.userId },
    })

    // Get class name for response
    const cls = await prisma.class.findUnique({
      where: { id: invitation.classId },
      select: { name: true },
    })

    return NextResponse.json({
      success: true,
      className: cls?.name || "",
    }, { status: 201 })
  } catch (error) {
    console.error("加入班级失败:", error)
    return NextResponse.json({ error: "加入班级失败" }, { status: 500 })
  }
}
