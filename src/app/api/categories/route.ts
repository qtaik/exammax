import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { questions: true } },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error("获取分类列表失败:", error)
    return NextResponse.json(
      { error: "获取分类列表失败" },
      { status: 500 }
    )
  }
}
