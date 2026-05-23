import { NextResponse } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "answer_retention_days" },
    })
    const retentionDays = setting ? parseInt(setting.value, 10) : 30

    let cleanedRecords = 0
    if (retentionDays > 0) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - retentionDays)

      const result = await prisma.answerRecord.deleteMany({
        where: { createdAt: { lt: cutoff } },
      })
      cleanedRecords = result.count
    }

    const userIds = await prisma.answerRecord.findMany({
      select: { userId: true },
      distinct: ["userId"],
    })

    let healedWq = 0
    if (userIds.length > 0) {
      const { selfHeal } = await import("@/lib/wrong-questions")
      const results = await Promise.all(
        userIds.map(({ userId }) => selfHeal(userId, retentionDays))
      )
      healedWq = results.reduce((sum, r) => sum + r.healed, 0)
    }

    return NextResponse.json({
      success: true,
      retentionDays,
      cleanedRecords,
      healedWrongQuestions: healedWq,
      usersProcessed: userIds.length,
    })
  } catch (err) {
    console.error("Cleanup error:", err)
    return NextResponse.json({ error: "清理失败" }, { status: 500 })
  }
}
