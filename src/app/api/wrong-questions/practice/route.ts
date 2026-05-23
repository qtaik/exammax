import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getWrongQuestionsForPractice } from "@/lib/wrong-questions"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const authResult = await requireAuth(req)
    if (authResult.error) return authResult.error

    const { searchParams } = new URL(req.url)
    const ids = searchParams.get("ids")
    if (!ids) {
      return NextResponse.json({ questions: [] })
    }

    const questionIds = ids.split(",").filter(Boolean)
    if (questionIds.length === 0) {
      return NextResponse.json({ questions: [] })
    }

    const questions = await getWrongQuestionsForPractice(questionIds)

    return NextResponse.json({ questions })
  } catch (error) {
    console.error("获取错题练习数据失败:", error)
    return NextResponse.json({ error: "获取题目失败" }, { status: 500 })
  }
}
