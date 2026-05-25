const isProd = process.env.NODE_ENV === "production"

const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
].join("; ")

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    instrumentationHook: true,
  },
  async headers() {
    const baseHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ]

    // CSP 和 HSTS 仅在生产环境生效，避免开发时干扰浏览器扩展/DevTools
    if (isProd) {
      baseHeaders.push(
        { key: "Content-Security-Policy", value: cspHeader },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      )
    }

    return [{ source: "/(.*)", headers: baseHeaders }]
  },
}

module.exports = nextConfig
