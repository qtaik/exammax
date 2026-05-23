import { prisma } from "./prisma"

export async function checkAndAwardBadges(userId: string) {
  const [totalAnswers, correctAnswers] = await Promise.all([
    prisma.answerRecord.count({ where: { userId } }),
    prisma.answerRecord.count({ where: { userId, isCorrect: true } }),
  ])

  const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0

  // Get all badge definitions and user's existing badges
  const [badges, userBadges] = await Promise.all([
    prisma.badge.findMany(),
    prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
  ])
  const ownedBadgeIds = new Set(userBadges.map((ub) => ub.badgeId))

  const toAward: string[] = []

  for (const badge of badges) {
    if (ownedBadgeIds.has(badge.id)) continue
    try {
      const raw = badge.condition as unknown
      const cond = typeof raw === "string" ? JSON.parse(raw) : raw as Record<string, unknown>
      let met = false
      switch (cond.type) {
        case "answer_count":
          met = totalAnswers >= cond.count
          break
        case "correct_count":
          met = correctAnswers >= cond.count
          break
        case "accuracy":
          met = accuracy >= cond.rate
          break
      }
      if (met) toAward.push(badge.id)
    } catch { /* skip malformed condition */ }
  }

  if (toAward.length > 0) {
    await prisma.userBadge.createMany({
      data: toAward.map((badgeId) => ({ userId, badgeId })),
    })
  }

  return toAward.length
}
