import { prisma } from "@/lib/prisma"
import { selfHeal, getRetentionDays } from "@/lib/wrong-questions"

async function getIntervalMs(): Promise<number> {
  const setting = await prisma.setting.findUnique({
    where: { key: "scheduler_interval_seconds" },
  })
  const seconds = setting ? parseInt(setting.value, 10) : 3600
  return Math.max(seconds, 10) * 1000 // minimum 10 seconds
}

async function runCleanup() {
  const retentionDays = await getRetentionDays()

  // 1. Rebuild WrongQuestions for all users with AnswerRecords FIRST
  const userIds = await prisma.answerRecord.findMany({
    select: { userId: true },
    distinct: ["userId"],
  })

  if (userIds.length > 0) {
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

  // 2. THEN clean expired AnswerRecords globally
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
}

export async function schedulerLoop() {
  try {
    await runCleanup()
  } catch (err) {
    console.error("[Scheduler] Error:", err)
  }

  try {
    const intervalMs = await getIntervalMs()
    setTimeout(schedulerLoop, intervalMs)
  } catch (err) {
    console.error("[Scheduler] Failed to get interval, using default 1h:", err)
    setTimeout(schedulerLoop, 3600_000)
  }
}
