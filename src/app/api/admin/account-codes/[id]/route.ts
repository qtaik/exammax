import { NextResponse } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const body = await req.json()
    const { action, expiresAt } = body as {
      action: "extend" | "revoke" | "reinstate"
      expiresAt?: string
    }

    if (!["extend", "revoke", "reinstate"].includes(action)) {
      return NextResponse.json({ error: "无效操作" }, { status: 400 })
    }

    const code = await prisma.accountCode.findUnique({ where: { id: params.id } })
    if (!code) {
      return NextResponse.json({ error: "账户码不存在" }, { status: 404 })
    }

    switch (action) {
      case "extend": {
        if (!expiresAt) {
          return NextResponse.json({ error: "缺少过期时间" }, { status: 400 })
        }
        const newExpiresAt = new Date(expiresAt)
        const newStatus = newExpiresAt > new Date() ? "ACTIVE" as const : code.status
        const updated = await prisma.accountCode.update({
          where: { id: params.id },
          data: { expiresAt: newExpiresAt, status: newStatus },
        })
        return NextResponse.json({ code: updated })
      }
      case "revoke": {
        if (code.status === "REVOKED") {
          return NextResponse.json({ error: "账户码已被吊销" }, { status: 400 })
        }
        const updated = await prisma.accountCode.update({
          where: { id: params.id },
          data: { status: "REVOKED" },
        })
        return NextResponse.json({ code: updated })
      }
      case "reinstate": {
        if (code.status !== "REVOKED") {
          return NextResponse.json({ error: "只能恢复已吊销的账户码" }, { status: 400 })
        }
        const now = new Date()
        const newStatus = code.expiresAt && code.expiresAt <= now ? "EXPIRED" as const : "ACTIVE" as const
        const updated = await prisma.accountCode.update({
          where: { id: params.id },
          data: { status: newStatus },
        })
        return NextResponse.json({ code: updated })
      }
    }
  } catch (err) {
    console.error("Update account code error:", err)
    return NextResponse.json({ error: "更新账户码失败" }, { status: 500 })
  }
}
