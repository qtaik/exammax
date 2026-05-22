export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { schedulerLoop } = await import("@/lib/scheduler")
    // Start after a short delay to let DB connection establish
    setTimeout(() => schedulerLoop(), 5000)
  }
}
