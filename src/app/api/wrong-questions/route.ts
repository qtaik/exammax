import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import {
  getWrongList,
  upsertWrongQuestion,
} from "@/lib/wrong-questions"

export async function GET(req: Request) {
  try {
    const authResult = requireAuth(req)
    if (authResult.error) return authResult.error

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") as "ACTIVE" | "COMPLETED" | null
    const sort = searchParams.get("sort") || undefined
    const page = Math.max(Number(searchParams.get("page")) || 1, 1)
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100)
    const categoryId = searchParams.get("categoryId") || undefined

    const data = await getWrongList({
      userId: authResult.user!.userId,
      status: status || undefined,
      sort,
      page,
      limit,
      categoryId,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error("获取错题列表失败:", error)
    return NextResponse.json({ error: "获取错题列表失败" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const authResult = requireAuth(req)
    if (authResult.error) return authResult.error

    const { questionId, correct, userAnswer } = await req.json()
    if (!questionId || correct === undefined) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 })
    }

    await upsertWrongQuestion(
      authResult.user!.userId,
      questionId,
      correct,
      userAnswer || ""
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("更新错题失败:", error)
    return NextResponse.json({ error: "更新错题失败" }, { status: 500 })
  }
}
