import { prisma } from "@/lib/prisma"

async function getRetentionDays(): Promise<number> {
  const setting = await prisma.setting.findUnique({
    where: { key: "answer_retention_days" },
  })
  return setting ? parseInt(setting.value, 10) : 30
}

async function getIntervalMs(): Promise<number> {
  const setting = await prisma.setting.findUnique({
    where: { key: "scheduler_interval_seconds" },
  })
  const seconds = setting ? parseInt(setting.value, 10) : 3600
  return Math.max(seconds, 10) * 1000 // minimum 10 seconds
}

async function runCleanup() {
  const retentionDays = await getRetentionDays()

  // Clean expired AnswerRecords
  if (retentionDays > 0) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - retentionDays)

    const result = await prisma.answerRecord.deleteMany({
      where: { createdAt: { lt: cutoff } },
    })

    if (result.count > 0) {
      console.log(
        `[Scheduler] Cleaned ${result.count} expired AnswerRecords (retention: ${retentionDays} days)`,
      )
    }
  }

  // Rebuild WrongQuestions for all users with AnswerRecords
  const userIds = await prisma.answerRecord.findMany({
    select: { userId: true },
    distinct: ["userId"],
  })

  if (userIds.length > 0) {
    const { selfHeal } = await import("@/lib/wrong-questions")
    let healedTotal = 0
    for (const { userId } of userIds) {
      const result = await selfHeal(userId, retentionDays)
      healedTotal += result.healed
    }

    if (healedTotal > 0) {
      console.log(
        `[Scheduler] Rebuilt ${healedTotal} WrongQuestions across ${userIds.length} users`,
      )
    }
  }
}

export async function schedulerLoop() {
  console.log("[Scheduler] Cleanup cycle starting...")
  try {
    await runCleanup()
  } catch (err) {
    console.error("[Scheduler] Error:", err)
  }

  // Schedule next run with latest interval setting
  try {
    const intervalMs = await getIntervalMs()
    console.log(`[Scheduler] Next run in ${intervalMs / 1000}s`)
    setTimeout(schedulerLoop, intervalMs)
  } catch (err) {
    console.error("[Scheduler] Failed to schedule next run:", err)
  }
}
