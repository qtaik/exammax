function validateProductionConfig() {
  if (process.env.NODE_ENV !== "production") return

  const warnings: string[] = []

  const url = process.env.NEXTAUTH_URL
  if (!url || url.includes("localhost") || url.startsWith("http://")) {
    warnings.push(`NEXTAUTH_URL=${url || "(not set)"} — 公网部署必须设为 HTTPS 域名`)
  }

  const jwt = process.env.JWT_SECRET
  if (!jwt || jwt === "exammax-jwt-secret-key-2026" || jwt.length < 32) {
    warnings.push("JWT_SECRET 为弱密钥或未设置，请生成至少 32 位随机字符串")
  }

  if (!process.env.REDIS_PASSWORD) {
    warnings.push("REDIS_PASSWORD 未设置，Redis 无密码保护")
  }

  if (warnings.length > 0) {
    console.warn("[production-check] ⚠️ 生产环境配置警告:")
    warnings.forEach(w => console.warn(`  - ${w}`))
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    validateProductionConfig()
    const { schedulerLoop } = await import("@/lib/scheduler")
    setTimeout(() => schedulerLoop(), 5000)
  }
}
