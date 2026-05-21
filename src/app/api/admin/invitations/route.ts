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
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const body = await req.json()
    const { count, role, expiresAt } = body as {
      count: number
      role: Role
      expiresAt?: string
    }

    if (!count || count < 1 || count > 100) {
      return NextResponse.json({ error: "生成数量须在1-100之间" }, { status: 400 })
    }

    if (!role || !["STUDENT", "TEACHER", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "无效的角色" }, { status: 400 })
    }

    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      const code = "exam_" + crypto.randomBytes(32).toString("hex")
      codes.push(code)
    }

    await prisma.invitationCode.createMany({
      data: codes.map((code) => ({
        code,
        role,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      })),
    })

    return NextResponse.json({ codes })
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
