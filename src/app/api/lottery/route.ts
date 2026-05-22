import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error

  const dbUser = await prisma.user.findUnique({
    where: { id: user!.userId },
    select: { points: true, pityCounter: true },
  })

  return NextResponse.json({
    points: dbUser!.points,
    pityCounter: dbUser!.pityCounter,
  })
}
