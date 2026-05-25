FROM node:20-slim AS base

# 使用国内 Debian 镜像源
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

# 安装 OpenSSL
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# 容器内安装依赖，避免跨平台 node_modules 问题
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置 Prisma 环境变量，忽略校验和错误
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

RUN npx prisma generate
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy prisma schema and seed for database operations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Install prisma CLI + tsx for db push/seed commands (pinned to match @prisma/client@5)
RUN npm install --no-save prisma@5.14.0 tsx@4.22.3
USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
ENV HOME /tmp

CMD ["node", "server.js"]
