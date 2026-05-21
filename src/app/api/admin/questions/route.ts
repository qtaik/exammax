import { NextResponse } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { QuestionType } from "@prisma/client"

function buildWhere(req: Request) {
  const url = new URL(req.url)
  const categoryId = url.searchParams.get("categoryId") || undefined
  const type = url.searchParams.get("type") as QuestionType | undefined
  const search = url.searchParams.get("search") || undefined

  const where: any = {}
  if (categoryId) where.categoryId = categoryId
  if (type && ["CHOICE", "FILL", "JUDGE"].includes(type)) where.type = type
  if (search) where.content = { contains: search }
  return where
}

export async function GET(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const url = new URL(req.url)
    const mode = url.searchParams.get("mode")
    const where = buildWhere(req)

    // Return only IDs (for select all)
    if (mode === "ids") {
      const questions = await prisma.question.findMany({
        where,
        select: { id: true },
      })
      return NextResponse.json({ ids: questions.map((q) => q.id), total: questions.length })
    }

    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")))

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.question.count({ where }),
    ])

    return NextResponse.json({
      questions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error("Get questions error:", err)
    return NextResponse.json({ error: "获取题目列表失败" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const body = await req.json()
    const { type, content, options, answer, explanation, categoryId, difficulty, imageUrl } = body as {
      type: QuestionType
      content: string
      options?: string[]
      answer: string
      explanation?: string
      categoryId: string
      difficulty?: number
      imageUrl?: string
    }

    if (!type || !content || !answer || !categoryId) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    if (!["CHOICE", "FILL", "JUDGE"].includes(type)) {
      return NextResponse.json({ error: "无效的题目类型" }, { status: 400 })
    }

    if (type === "CHOICE" && (!options || !Array.isArray(options) || options.length === 0)) {
      return NextResponse.json({ error: "选择题必须提供选项" }, { status: 400 })
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!category) {
      return NextResponse.json({ error: "分类不存在" }, { status: 400 })
    }

    const question = await prisma.question.create({
      data: {
        type,
        content,
        options: type === "CHOICE" ? options : undefined,
        answer,
        explanation,
        categoryId,
        difficulty: difficulty || 1,
        imageUrl,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ question })
  } catch (err) {
    console.error("Create question error:", err)
    return NextResponse.json({ error: "创建题目失败" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const body = await req.json()
    const { id, type, content, options, answer, explanation, categoryId, difficulty, imageUrl } = body as {
      id: string
      type: QuestionType
      content: string
      options?: string[]
      answer: string
      explanation?: string
      categoryId: string
      difficulty?: number
      imageUrl?: string
    }

    if (!id) {
      return NextResponse.json({ error: "缺少题目ID" }, { status: 400 })
    }

    if (!type || !content || !answer || !categoryId) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    if (!["CHOICE", "FILL", "JUDGE"].includes(type)) {
      return NextResponse.json({ error: "无效的题目类型" }, { status: 400 })
    }

    if (type === "CHOICE" && (!options || !Array.isArray(options) || options.length === 0)) {
      return NextResponse.json({ error: "选择题必须提供选项" }, { status: 400 })
    }

    const existing = await prisma.question.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 })
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!category) {
      return NextResponse.json({ error: "分类不存在" }, { status: 400 })
    }

    const question = await prisma.question.update({
      where: { id },
      data: {
        type,
        content,
        options: type === "CHOICE" ? options : undefined,
        answer,
        explanation,
        categoryId,
        difficulty: difficulty || 1,
        imageUrl,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ question })
  } catch (err) {
    console.error("Update question error:", err)
    return NextResponse.json({ error: "更新题目失败" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get("id")
    const idsParam = url.searchParams.get("ids")
    const mode = url.searchParams.get("mode")

    // Delete by filter (select all across pages)
    if (mode === "filter") {
      const where = buildWhere(req)
      const result = await prisma.question.deleteMany({ where })
      return NextResponse.json({ success: true, deleted: result.count })
    }

    // Batch delete by IDs
    if (idsParam) {
      const ids = idsParam.split(",").filter(Boolean)
      if (ids.length === 0) {
        return NextResponse.json({ error: "缺少题目ID" }, { status: 400 })
      }
      const result = await prisma.question.deleteMany({
        where: { id: { in: ids } },
      })
      return NextResponse.json({ success: true, deleted: result.count })
    }

    // Single delete
    if (!id) {
      return NextResponse.json({ error: "缺少题目ID" }, { status: 400 })
    }

    const existing = await prisma.question.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 })
    }

    await prisma.question.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Delete question error:", err)
    return NextResponse.json({ error: "删除题目失败" }, { status: 500 })
  }
}
