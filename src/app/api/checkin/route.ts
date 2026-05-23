import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

function isYesterday(date: Date, now: Date): boolean {
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  return isSameDay(date, yesterday)
}

function isBeforeYesterday(date: Date, now: Date): boolean {
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  return date < yesterday
}

export async function GET(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user!.userId },
      select: { streakDays: true, lastCheckIn: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const now = new Date()
    const checkedIn = dbUser.lastCheckIn ? isSameDay(dbUser.lastCheckIn, now) : false

    return NextResponse.json({
      checkedIn,
      streakDays: dbUser.streakDays,
      lastCheckIn: dbUser.lastCheckIn ? dbUser.lastCheckIn.toISOString() : null,
    })
  } catch (error) {
    console.error("GET /api/checkin error:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error

  try {
    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
      const dbUser = await tx.user.findUnique({
        where: { id: user!.userId },
      })

      if (!dbUser) {
        return { status: 404 as const, error: "用户不存在" }
      }

      // Check if already checked in today (inside transaction for atomicity)
      if (dbUser.lastCheckIn && isSameDay(dbUser.lastCheckIn, now)) {
        return { status: 400 as const, error: "今日已签到" }
      }

      // Determine new streak days
      let newStreakDays: number
      if (dbUser.lastCheckIn === null) {
        newStreakDays = 1
      } else if (isYesterday(dbUser.lastCheckIn, now)) {
        newStreakDays = dbUser.streakDays + 1
      } else if (isBeforeYesterday(dbUser.lastCheckIn, now)) {
        newStreakDays = 1
      } else {
        newStreakDays = 1
      }

      // Calculate points earned: 5 + (streakDays - 1) * 5, cap at 50
      const pointsEarned = Math.min(5 + (newStreakDays - 1) * 5, 50)
      const expEarned = 10

      const newExperience = dbUser.experience + expEarned
      const newLevel = Math.floor((1 + Math.sqrt(1 + 8 * newExperience / 100)) / 2)
      const leveledUp = newLevel > dbUser.level

      await tx.user.update({
        where: { id: user!.userId },
        data: {
          points: { increment: pointsEarned },
          experience: { increment: expEarned },
          streakDays: newStreakDays,
          lastCheckIn: now,
          level: newLevel,
        },
      })

      await tx.pointLog.create({
        data: {
          userId: user!.userId,
          points: pointsEarned,
          reason: `每日签到 (连续${newStreakDays}天)`,
        },
      })

      return { status: 200 as const, pointsEarned, streakDays: newStreakDays, leveledUp, newLevel }
    })

    if (result.status === 400 || result.status === 404) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      pointsEarned: result.pointsEarned,
      streakDays: result.streakDays,
      ...(result.leveledUp && { newLevel: result.newLevel }),
    })
  } catch (error) {
    console.error("POST /api/checkin error:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
