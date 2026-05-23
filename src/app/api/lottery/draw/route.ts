import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

const PITY_THRESHOLD = 30

function randomInt(max: number) {
  return Math.floor(Math.random() * max)
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function POST(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user!.userId },
      select: { points: true, pityCounter: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    if (dbUser.points < 50) {
      return NextResponse.json({ error: "积分不足" }, { status: 400 })
    }

    // 获取奖池中的限定称号
    const limitedTitles = await prisma.shopItem.findMany({
      where: { type: "TITLE", limited: true },
      select: { id: true, name: true, icon: true },
    })

    let tier: string
    let rewardType: string | null = null
    let value: number | null = null
    let titleInfo: { id: string; name: string; icon: string | null } | null = null

    const isPity = dbUser.pityCounter >= PITY_THRESHOLD - 1

    if (isPity && limitedTitles.length > 0) {
      // 保底出金
      tier = "legendary"
      rewardType = "title"
      titleInfo = pickRandom(limitedTitles)
    } else {
      const roll = randomInt(100)
      if (roll < 2) {
        // 谢谢参与
        tier = "nothing"
      } else if (roll < 70) {
        // 经典时尚小垃圾 68%
        tier = "common"
        if (roll % 2 === 0) {
          rewardType = "points"
          value = pickRandom([5, 10])
        } else {
          rewardType = "exp"
          value = pickRandom([10, 20])
        }
      } else if (roll < 98) {
        // 好像有点用 28%
        tier = "rare"
        if (roll % 2 === 0) {
          rewardType = "points"
          value = pickRandom([50, 100])
        } else {
          rewardType = "exp"
          value = pickRandom([100, 200])
        }
      } else {
        // 金色传说 2%
        if (limitedTitles.length > 0) {
          tier = "legendary"
          rewardType = "title"
          titleInfo = pickRandom(limitedTitles)
        } else {
          // 奖池空了，给个安慰奖
          tier = "rare"
          rewardType = "points"
          value = 200
        }
      }
    }

    // 更新数据库
    const newPity = tier === "legendary" ? 0 : dbUser.pityCounter + 1

    const updates: Prisma.PrismaPromise<unknown>[] = [
      prisma.user.update({
        where: { id: user!.userId },
        data: {
          points: { decrement: 50 },
          pityCounter: newPity,
        },
      }),
      prisma.pointLog.create({
        data: {
          userId: user!.userId,
          points: -50,
          reason: tier === "legendary" ? `抽奖获得限定称号「${titleInfo!.name}」` : "抽奖",
        },
      }),
    ]

    // 发放奖励
    if (rewardType === "points" && value) {
      updates.push(
        prisma.user.update({
          where: { id: user!.userId },
          data: { points: { increment: value } },
        }),
        prisma.pointLog.create({
          data: {
            userId: user!.userId,
            points: value,
            reason: `抽奖获得积分红包 ${value}`,
          },
        })
      )
    }

    if (rewardType === "exp" && value) {
      const expUser = await prisma.user.findUnique({
        where: { id: user!.userId },
        select: { experience: true, level: true, points: true },
      })
      if (!expUser) {
        return NextResponse.json({ error: "用户不存在" }, { status: 404 })
      }
      const newExperience = expUser.experience + value
      const newLevel = Math.floor((1 + Math.sqrt(1 + 8 * newExperience / 100)) / 2)
      const leveledUp = newLevel > expUser.level

      updates.push(
        prisma.user.update({
          where: { id: user!.userId },
          data: {
            experience: { increment: value },
            ...(leveledUp ? { level: newLevel } : {}),
          },
        })
      )
    }

    if (rewardType === "title" && titleInfo) {
      // 检查是否已拥有
      const owned = await prisma.userItem.findUnique({
        where: { userId_itemId: { userId: user!.userId, itemId: titleInfo.id } },
      })
      if (!owned) {
        updates.push(
          prisma.userItem.create({
            data: { userId: user!.userId, itemId: titleInfo.id },
          })
        )
      }
    }

    await Promise.all(updates)

    return NextResponse.json({
      success: true,
      result: {
        tier,
        rewardType,
        value,
        title: titleInfo,
      },
      pityCounter: newPity,
    })
  } catch (err) {
    console.error("Lottery draw error:", err)
    return NextResponse.json({ error: "抽奖失败" }, { status: 500 })
  }
}
