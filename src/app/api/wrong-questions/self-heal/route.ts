import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { selfHeal, getRetentionDays } from "@/lib/wrong-questions"

export async function POST(req: Request) {
  try {
    const authResult = requireAuth(req)
    if (authResult.error) return authResult.error

    const retentionDays = await getRetentionDays()
    const result = await selfHeal(authResult.user!.userId, retentionDays)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("错题自愈失败:", error)
    return NextResponse.json({ error: "自愈失败" }, { status: 500 })
  }
}
