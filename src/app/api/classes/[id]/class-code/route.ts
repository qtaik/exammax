import { NextResponse } from "next/server"
import crypto from "crypto"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// 获取或生成班级码（一班级一码，已有则返回旧的）
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { error, user } = await requireAuth(req)
  if (error) return error

  try {
    const cls = await prisma.class.findUnique({ where: { id: params.id } })
    if (!cls) return NextResponse.json({ error: "班级不存在" }, { status: 404 })

    if (!["TEACHER", "ADMIN"].includes(user!.role)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }
    if (user!.role !== "ADMIN" && cls.teacherId !== user!.userId) {
      return NextResponse.json({ error: "无权操作此班级" }, { status: 403 })
    }

    let classCode = await prisma.classCode.findFirst({
      where: { classId: params.id },
    })

    if (!classCode) {
      const code = "exmclass_" + crypto.randomBytes(16).toString("hex")
      classCode = await prisma.classCode.create({
        data: { code, classId: params.id, createdById: user!.userId },
      })
    }

    return NextResponse.json({ classCode })
  } catch (err) {
    console.error("Get class code error:", err)
    return NextResponse.json({ error: "获取班级码失败" }, { status: 500 })
  }
}
