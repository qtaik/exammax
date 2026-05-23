import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const type = url.searchParams.get("type") || "practice"   // "practice" | "exam"
    const scope = url.searchParams.get("scope") || "personal"  // "personal" | "class"

    if (scope === "class") {
      // 班级排行
      const classes = await prisma.class.findMany({
        include: {
          members: { select: { userId: true } },
        },
      })
      const studentIds = classes.flatMap((c) => c.members.map((m) => m.userId))

      let userAccuracyMap = new Map<string, number>()

      if (type === "exam") {
        // 考试: 从 TaskSubmission 统计
        const submissions = await prisma.taskSubmission.findMany({
          where: { userId: { in: studentIds }, status: "COMPLETED" },
          select: { userId: true, correctCount: true, totalCount: true },
        })
        const userStats = new Map<string, { correct: number; total: number }>()
        for (const s of submissions) {
          const stats = userStats.get(s.userId) || { correct: 0, total: 0 }
          stats.correct += s.correctCount
          stats.total += s.totalCount
          userStats.set(s.userId, stats)
        }
        for (const [uid, stats] of userStats) {
          userAccuracyMap.set(uid, stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0)
        }
      } else {
        // 刷题: 从 AnswerRecord (非考试) 统计
        const records = await prisma.answerRecord.groupBy({
          by: ["userId"],
          where: { userId: { in: studentIds }, taskId: null },
          _count: { isCorrect: true },
        })
        // We need correct count separately
        const correctCounts = await prisma.answerRecord.groupBy({
          by: ["userId"],
          where: { userId: { in: studentIds }, taskId: null, isCorrect: true },
          _count: { id: true },
        })
        const totalMap = new Map(records.map((r) => [r.userId, (r as any)._count?.isCorrect || 0]))
        const correctMap = new Map(correctCounts.map((r) => [r.userId, r._count.id]))
        for (const uid of studentIds) {
          const total = totalMap.get(uid) || 0
          const correct = correctMap.get(uid) || 0
          userAccuracyMap.set(uid, total > 0 ? Math.round((correct / total) * 100) : 0)
        }
      }

      // 按班级聚合
      const classLeaderboard = classes
        .filter((c) => c.members.length > 0)
        .map((c) => {
          const memberIds = c.members.map((m) => m.userId)
          const accuracies = memberIds.map((uid) => userAccuracyMap.get(uid) || 0).filter((a) => a > 0)
          const avgAccuracy = accuracies.length > 0 ? Math.round(accuracies.reduce((s, a) => s + a, 0) / accuracies.length) : 0
          return {
            id: c.id,
            name: c.name,
            memberCount: memberIds.length,
            activeCount: accuracies.length,
            avgAccuracy,
          }
        })
        .filter((c) => c.activeCount > 0)
        .sort((a, b) => b.avgAccuracy - a.avgAccuracy)

      return NextResponse.json({ leaderboard: classLeaderboard })
    }

    // 个人排行
    let rankings: {
      userId: string
      correct: number
      total: number
      accuracy: number
    }[] = []

    if (type === "exam") {
      const submissions = await prisma.taskSubmission.findMany({
        where: { status: "COMPLETED" },
        select: { userId: true, correctCount: true, totalCount: true },
      })
      const userStats = new Map<string, { correct: number; total: number }>()
      for (const s of submissions) {
        const stats = userStats.get(s.userId) || { correct: 0, total: 0 }
        stats.correct += s.correctCount
        stats.total += s.totalCount
        userStats.set(s.userId, stats)
      }
      rankings = Array.from(userStats.entries()).map(([userId, stats]) => ({
        userId,
        correct: stats.correct,
        total: stats.total,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      }))
    } else {
      // 刷题: AnswerRecord WHERE taskId IS NULL
      const records = await prisma.answerRecord.groupBy({
        by: ["userId"],
        where: { taskId: null },
        _count: { id: true },
      })
      const correctRecords = await prisma.answerRecord.groupBy({
        by: ["userId"],
        where: { taskId: null, isCorrect: true },
        _count: { id: true },
      })
      const totalMap = new Map(records.map((r) => [r.userId, r._count.id]))
      const correctMap = new Map(correctRecords.map((r) => [r.userId, r._count.id]))
      rankings = Array.from(totalMap.entries()).map(([userId, total]) => {
        const correct = correctMap.get(userId) || 0
        return { userId, correct, total, accuracy: total > 0 ? Math.round((correct / total) * 100) : 0 }
      })
    }

    // 只取学生用户
    const allStudentIds = rankings.map((r) => r.userId)
    const students = await prisma.user.findMany({
      where: { id: { in: allStudentIds }, role: "STUDENT" },
      select: {
        id: true,
        username: true,
        role: true,
        level: true,
        showBadgeFirst: true,
        showBadgeText: true,
        activeTitleId: true,
        badges: {
          where: { equipped: true },
          take: 1,
          include: { badge: { select: { id: true, name: true, icon: true } } },
        },
        classMembers: {
          take: 1,
          include: { class: { select: { id: true, name: true } } },
        },
      },
    })
    const studentSet = new Set(students.map((s) => s.id))
    const studentMap = new Map(students.map((s) => [s.id, s]))

    // 批量查称号
    const activeTitleIds = [...new Set(students.map((s) => s.activeTitleId).filter(Boolean))] as string[]
    const titleItems = activeTitleIds.length > 0
      ? await prisma.shopItem.findMany({ where: { id: { in: activeTitleIds } }, select: { id: true, name: true, icon: true } })
      : []
    const titleMap = new Map(titleItems.map((t) => [t.id, t]))

    const leaderboard = rankings
      .filter((r) => studentSet.has(r.userId))
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 50)
      .map((r) => {
        const u = studentMap.get(r.userId)!
        return {
          userId: u.id,
          username: u.username,
          role: u.role,
          level: u.level,
          accuracy: r.accuracy,
          correct: r.correct,
          total: r.total,
          equippedBadge: u.badges[0] ? { id: u.badges[0].badge.id, name: u.badges[0].badge.name, icon: u.badges[0].badge.icon } : null,
          activeTitle: u.activeTitleId ? titleMap.get(u.activeTitleId) || null : null,
          showBadgeFirst: u.showBadgeFirst,
          showBadgeText: u.showBadgeText,
          className: u.classMembers[0]?.class.name || null,
        }
      })

    // 当前用户排名
    let currentUser: Record<string, unknown> | null = null
    const authUser = await getAuthUser(req)
    if (authUser && studentSet.has(authUser.id)) {
      const idx = rankings
        .filter((r) => studentSet.has(r.userId))
        .sort((a, b) => b.accuracy - a.accuracy)
        .findIndex((r) => r.userId === authUser.id)
      if (idx >= 0) {
        const r = rankings.filter((r) => studentSet.has(r.userId)).sort((a, b) => b.accuracy - a.accuracy)[idx]
        const u = studentMap.get(r.userId)!
        currentUser = {
          userId: u.id,
          username: u.username,
          role: u.role,
          level: u.level,
          accuracy: r.accuracy,
          correct: r.correct,
          total: r.total,
          rank: idx + 1,
          equippedBadge: u.badges[0] ? { id: u.badges[0].badge.id, name: u.badges[0].badge.name, icon: u.badges[0].badge.icon } : null,
          activeTitle: u.activeTitleId ? titleMap.get(u.activeTitleId) || null : null,
          showBadgeFirst: u.showBadgeFirst,
          showBadgeText: u.showBadgeText,
          className: u.classMembers[0]?.class.name || null,
        }
      }
    }

    return NextResponse.json({ leaderboard, currentUser })
  } catch (err) {
    console.error("排行榜查询失败:", err)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
