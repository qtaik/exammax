import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = requireAuth(req)
    if (authResult.error) return authResult.error

    const membership = await prisma.classMember.findUnique({
      where: {
        classId_userId: {
          classId: params.id,
          userId: authResult.user!.userId,
        },
      },
    })
    if (!membership) {
      return NextResponse.json({ error: "你不在该班级中" }, { status: 400 })
    }

    await prisma.classMember.delete({
      where: { id: membership.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("退出班级失败:", error)
    return NextResponse.json({ error: "退出班级失败" }, { status: 500 })
  }
}
