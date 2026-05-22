import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth"
import * as XLSX from "xlsx"

const questionRowSchema = z.object({
  "题目内容": z.coerce.string().min(1),
  "答案": z.coerce.string().min(1),
  "题目类型": z.coerce.string().pipe(z.enum(["single", "multi", "fill", "judge"])),
  "题目类目": z.coerce.string().min(1),
  "图片路径": z.coerce.string().optional().nullable(),
  "1": z.coerce.string().optional().nullable(),
  "2": z.coerce.string().optional().nullable(),
  "3": z.coerce.string().optional().nullable(),
  "4": z.coerce.string().optional().nullable(),
  "解析": z.coerce.string().optional().nullable(),
})

type QuestionRow = z.infer<typeof questionRowSchema>

function mapQuestionType(type: string): "CHOICE" | "FILL" | "JUDGE" {
  switch (type) {
    case "single":
    case "multi":
      return "CHOICE"
    case "fill":
      return "FILL"
    case "judge":
      return "JUDGE"
    default:
      return "CHOICE"
  }
}

export async function POST(req: Request) {
  const { error, user } = await requireAuth(req)
  if (error) return error
  const roleErr = requireRole(user!, ["ADMIN", "TEACHER"])
  if (roleErr) return roleErr

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const categoryIdParam = formData.get("categoryId") as string | null

    if (!file) {
      return NextResponse.json(
        { error: "请上传文件" },
        { status: 400 }
      )
    }

    // 读取 xlsx 文件
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet)

    if (rawData.length === 0) {
      return NextResponse.json(
        { error: "文件为空" },
        { status: 400 }
      )
    }

    // 检测格式: 新格式有 "正确答案" 或 "A" 列
    const isNewFormat = "正确答案" in rawData[0] || "A" in rawData[0]

    const normalizeRow = (row: Record<string, any>): Record<string, any> => {
      const rawAnswer = String(row[isNewFormat ? "正确答案" : "答案"] ?? "")
      // 标准化答案为字母格式 (A/B/C/D)
      const answer = isNewFormat
        ? rawAnswer
        : rawAnswer.replace(/1/g, "A").replace(/2/g, "B").replace(/3/g, "C").replace(/4/g, "D")
      return {
        "题目内容": row["题目内容"],
        "答案": answer,
        "题目类型": row["题目类型"],
        "题目类目": row["题目类目"],
        "图片路径": row["图片路径"],
        "1": row["A"] ?? row["1"] ?? "",
        "2": row["B"] ?? row["2"] ?? "",
        "3": row["C"] ?? row["3"] ?? "",
        "4": row["D"] ?? row["4"] ?? "",
        "解析": row["解析"] ?? undefined,
      }
    }

    const data = rawData.map(normalizeRow)

    // Determine the target category
    let targetCategoryId: string | null = null

    if (categoryIdParam) {
      // Use the provided categoryId
      const existingCategory = await prisma.category.findUnique({
        where: { id: categoryIdParam },
      })
      if (!existingCategory) {
        return NextResponse.json(
          { error: "指定的分类不存在" },
          { status: 400 }
        )
      }
      targetCategoryId = existingCategory.id
    } else {
      // Find or create the default category
      let defaultCategory = await prisma.category.findFirst({
        where: { name: "默认" },
      })
      if (!defaultCategory) {
        defaultCategory = await prisma.category.create({
          data: {
            name: "默认",
            description: "导入题目时自动创建的默认分类",
          },
        })
      }
      targetCategoryId = defaultCategory.id
    }

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    // 处理每一行
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNum = i + 2 // Excel 行号（从2开始，跳过表头）

      try {
        const validated = questionRowSchema.parse(row)

        // 构建选项数组
        const options: string[] = []
        if (validated["1"]) options.push(validated["1"])
        if (validated["2"]) options.push(validated["2"])
        if (validated["3"]) options.push(validated["3"])
        if (validated["4"]) options.push(validated["4"])

        // If no categoryId was provided, use per-row category from the spreadsheet
        let categoryId = targetCategoryId
        if (!categoryIdParam) {
          let category = await prisma.category.findFirst({
            where: { name: validated["题目类目"] },
          })
          if (!category) {
            category = await prisma.category.create({
              data: {
                name: validated["题目类目"],
              },
            })
          }
          categoryId = category.id
        }

        // 创建题目
        await prisma.question.create({
          data: {
            type: mapQuestionType(validated["题目类型"]),
            content: validated["题目内容"],
            options: options.length > 0 ? options : undefined,
            answer: validated["答案"],
            explanation: validated["解析"] || undefined,
            categoryId: categoryId!,
            imageUrl: validated["图片路径"] || undefined,
            difficulty: 1,
          },
        })

        results.success++
      } catch (error) {
        results.failed++
        if (error instanceof z.ZodError) {
          results.errors.push(`第 ${rowNum} 行: ${error.errors[0].message}`)
        } else {
          results.errors.push(`第 ${rowNum} 行: ${error}`)
        }
      }
    }

    return NextResponse.json({
      message: `导入完成: 成功 ${results.success} 条，失败 ${results.failed} 条`,
      ...results,
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json(
      { error: "导入失败，请稍后重试" },
      { status: 500 }
    )
  }
}
