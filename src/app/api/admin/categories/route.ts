import { NextResponse } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ categories })
  } catch (err) {
    console.error("Get categories error:", err)
    return NextResponse.json({ error: "获取分类列表失败" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const body = await req.json()
    const { name, description } = body as { name: string; description?: string }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "分类名称不能为空" }, { status: 400 })
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    })

    return NextResponse.json({ category })
  } catch (err) {
    console.error("Create category error:", err)
    return NextResponse.json({ error: "创建分类失败" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN"])
  if (roleErr) return roleErr

  try {
    const body = await req.json()
    const { id, name, description } = body as {
      id: string
      name?: string
      description?: string
    }

    if (!id) {
      return NextResponse.json({ error: "缺少分类ID" }, { status: 400 })
    }

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: "分类名称不能为空" }, { status: 400 })
    }

    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "分类不存在" }, { status: 404 })
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
    })

    return NextResponse.json({ category })
  } catch (err) {
    console.error("Update category error:", err)
    return NextResponse.json({ error: "更新分类失败" }, { status: 500 })
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

    // Batch delete
    if (idsParam) {
      const ids = idsParam.split(",").filter(Boolean)
      if (ids.length === 0) {
        return NextResponse.json({ error: "缺少分类ID" }, { status: 400 })
      }

      const categories = await prisma.category.findMany({
        where: { id: { in: ids } },
        include: { _count: { select: { questions: true } } },
      })

      const deletable = categories.filter((c) => c._count.questions === 0)
      const skipped = categories.filter((c) => c._count.questions > 0)

      if (deletable.length > 0) {
        await prisma.category.deleteMany({
          where: { id: { in: deletable.map((c) => c.id) } },
        })
      }

      return NextResponse.json({
        success: true,
        deleted: deletable.length,
        skipped: skipped.map((c) => ({ id: c.id, name: c.name, questions: c._count.questions })),
      })
    }

    // Single delete
    if (!id) {
      return NextResponse.json({ error: "缺少分类ID" }, { status: 400 })
    }

    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { questions: true } } },
    })

    if (!category) {
      return NextResponse.json({ error: "分类不存在" }, { status: 404 })
    }

    if (category._count.questions > 0) {
      return NextResponse.json({ error: "该分类下存在题目，无法删除" }, { status: 400 })
    }

    await prisma.category.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Delete category error:", err)
    return NextResponse.json({ error: "删除分类失败" }, { status: 500 })
  }
}
