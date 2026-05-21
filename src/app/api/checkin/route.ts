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
  const { error, user } = requireAuth(req)
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
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user!.userId },
    })

    if (!dbUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const now = new Date()

    // Check if already checked in today
    if (dbUser.lastCheckIn && isSameDay(dbUser.lastCheckIn, now)) {
      return NextResponse.json({ error: "今日已签到" }, { status: 400 })
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
      // Edge case: lastCheckIn is somehow in the future or today (shouldn't happen)
      newStreakDays = 1
    }

    // Calculate points earned: 5 + (streakDays - 1) * 5, cap at 50
    const pointsEarned = Math.min(5 + (newStreakDays - 1) * 5, 50)

    // Calculate new level: floor(experience / 100) + 1
    const newExperience = dbUser.experience + pointsEarned
    const newLevel = Math.floor(newExperience / 100) + 1
    const leveledUp = newLevel > dbUser.level

    // Update user and create point log in a transaction
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user!.userId },
        data: {
          points: { increment: pointsEarned },
          experience: { increment: pointsEarned },
          streakDays: newStreakDays,
          lastCheckIn: now,
          level: newLevel,
        },
      }),
      prisma.pointLog.create({
        data: {
          userId: user!.userId,
          points: pointsEarned,
          reason: `每日签到 (连续${newStreakDays}天)`,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      pointsEarned,
      streakDays: newStreakDays,
      ...(leveledUp && { newLevel }),
    })
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
