import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth(req)
    if (authResult.error) return authResult.error

    const { code } = await req.json()
    if (!code?.trim()) {
      return NextResponse.json({ error: "请输入班级码" }, { status: 400 })
    }

    const classCode = await prisma.classCode.findUnique({
      where: { code: code.trim() },
    })

    if (!classCode) {
      return NextResponse.json({ error: "班级码不存在" }, { status: 404 })
    }

    // Check if already a member
    const existing = await prisma.classMember.findUnique({
      where: {
        classId_userId: {
          classId: classCode.classId,
          userId: authResult.user!.userId,
        },
      },
    })
    if (existing) {
      return NextResponse.json({ error: "你已在该班级中" }, { status: 400 })
    }

    const member = await prisma.classMember.create({
      data: { classId: classCode.classId, userId: authResult.user!.userId },
    })

    const cls = await prisma.class.findUnique({
      where: { id: classCode.classId },
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
