import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const authResult = await requireAuth(req)
    if (authResult.error) {
      return authResult.error
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(Number(searchParams.get("page")) || 1, 1)
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100)
    const categoryId = searchParams.get("categoryId")

    const where: Record<string, unknown> = {
      userId: authResult.user!.userId,
    }

    if (categoryId) {
      where.question = {
        category: { id: categoryId },
      }
    }

    const [records, total] = await Promise.all([
      prisma.answerRecord.findMany({
        where,
        select: {
          id: true,
          userAnswer: true,
          isCorrect: true,
          timeSpent: true,
          createdAt: true,
          question: {
            select: {
              id: true,
              type: true,
              content: true,
              answer: true,
              explanation: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.answerRecord.count({ where }),
    ])

    return NextResponse.json({
      records,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("获取答题历史失败:", error)
    return NextResponse.json(
      { error: "获取答题历史失败" },
      { status: 500 }
    )
  }
}
