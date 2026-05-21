import Link from "next/link"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          ExamMax 刷题平台
        </h1>
        <p className="text-center text-muted-foreground mb-12">
          通过刷题练习和奖励激励提升学习效果
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            登录
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 rounded-lg border border-primary text-primary hover:bg-primary/10 transition"
          >
            注册
          </Link>
        </div>
      </div>
    </main>
  )
}
