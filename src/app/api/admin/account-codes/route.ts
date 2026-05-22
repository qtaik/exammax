import { NextResponse } from "next/server"
import crypto from "crypto"
import { requireAuth, requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AccountCodeStatus, Role } from "@prisma/client"

export async function GET(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    // 自动过期：将 status=ACTIVE 且 expiresAt 已过的码标记为 EXPIRED
    await prisma.accountCode.updateMany({
      where: { status: "ACTIVE", expiresAt: { lte: new Date() } },
      data: { status: "EXPIRED" },
    })

    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")))
    const status = url.searchParams.get("status") as AccountCodeStatus | undefined

    const where: any = {}
    if (status && ["ACTIVE", "EXPIRED", "REVOKED"].includes(status)) {
      where.status = status
    }

    const [codes, total] = await Promise.all([
      prisma.accountCode.findMany({
        where,
        include: {
          boundUser: { select: { id: true, username: true } },
          createdBy: { select: { id: true, username: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.accountCode.count({ where }),
    ])

    return NextResponse.json({
      codes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error("Get account codes error:", err)
    return NextResponse.json({ error: "获取账户码列表失败" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const body = await req.json()
    const { count, role, expiresAt } = body as {
      count: number
      role?: Role
      expiresAt?: string
    }

    if (!count || count < 1 || count > 100) {
      return NextResponse.json({ error: "生成数量须在1-100之间" }, { status: 400 })
    }

    const useRole: Role = role || "STUDENT"

    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      const code = "exam_" + crypto.randomBytes(32).toString("hex")
      codes.push(code)
    }

    const accountCodes = await Promise.all(
      codes.map((code) =>
        prisma.accountCode.create({
          data: {
            code,
            role: useRole,
            createdById: user!.userId,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          },
        })
      )
    )

    return NextResponse.json({ codes: accountCodes })
  } catch (err) {
    console.error("Generate account codes error:", err)
    return NextResponse.json({ error: "生成账户码失败" }, { status: 500 })
  }
}
