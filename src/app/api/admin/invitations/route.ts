import { NextResponse } from "next/server"
import crypto from "crypto"
import { requireAuth, requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { InvitationStatus, Role } from "@prisma/client"

export async function GET(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")))
    const status = url.searchParams.get("status") as InvitationStatus | undefined

    const where: any = {}
    if (status && ["UNUSED", "USED", "EXPIRED", "REVOKED"].includes(status)) {
      where.status = status
    }

    const [invitations, total] = await Promise.all([
      prisma.invitationCode.findMany({
        where,
        include: {
          usedBy: { select: { username: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.invitationCode.count({ where }),
    ])

    return NextResponse.json({
      invitations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error("Get invitations error:", err)
    return NextResponse.json({ error: "获取邀请码列表失败" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error
  if (!["ADMIN", "TEACHER"].includes(user!.role)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { count, role, expiresAt, classId } = body as {
      count: number
      role?: Role
      expiresAt?: string
      classId?: string
    }

    if (!count || count < 1 || count > 100) {
      return NextResponse.json({ error: "生成数量须在1-100之间" }, { status: 400 })
    }

    const useRole: Role = role || "STUDENT"

    // 教师只能为自己班级生成邀请码
    if (user!.role === "TEACHER") {
      if (!classId) {
        return NextResponse.json({ error: "缺少班级ID" }, { status: 400 })
      }
      const cls = await prisma.class.findUnique({ where: { id: classId } })
      if (!cls) return NextResponse.json({ error: "班级不存在" }, { status: 404 })
      if (cls.teacherId !== user!.userId) {
        return NextResponse.json({ error: "无权为此班级生成邀请码" }, { status: 403 })
      }
    }

    const prefix = classId ? "exmclass_" : "exam_"
    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      const code = prefix + crypto.randomBytes(32).toString("hex")
      codes.push(code)
    }

    const invitations = await Promise.all(
      codes.map((code) =>
        prisma.invitationCode.create({
          data: {
            code,
            role: useRole,
            classId: classId || null,
            createdById: user!.userId,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          },
        })
      )
    )

    return NextResponse.json({ invitations })
  } catch (err) {
    console.error("Generate invitations error:", err)
    return NextResponse.json({ error: "生成邀请码失败" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const body = await req.json()
    const { id, status } = body as { id: string; status: InvitationStatus }

    if (!id) {
      return NextResponse.json({ error: "缺少邀请码ID" }, { status: 400 })
    }

    if (status !== "REVOKED") {
      return NextResponse.json({ error: "只能撤销邀请码" }, { status: 400 })
    }

    const invitation = await prisma.invitationCode.findUnique({ where: { id } })
    if (!invitation) {
      return NextResponse.json({ error: "邀请码不存在" }, { status: 404 })
    }

    if (invitation.status !== "UNUSED") {
      return NextResponse.json({ error: "只能撤销未使用的邀请码" }, { status: 400 })
    }

    await prisma.invitationCode.update({
      where: { id },
      data: { status: "REVOKED" },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Revoke invitation error:", err)
    return NextResponse.json({ error: "撤销邀请码失败" }, { status: 500 })
  }
}
