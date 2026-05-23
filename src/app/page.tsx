"use client"

import Link from "next/link"
import { motion, type Variants } from "framer-motion"

const container: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <motion.div
        className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="text-4xl font-bold text-center mb-8"
          variants={fadeUp}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          ExamMax
        </motion.h1>
        <motion.p
          className="text-center text-muted-foreground mb-12"
          variants={fadeUp}
        >
          不刷题的学生不是好卷王
        </motion.p>
        <motion.div className="flex justify-center gap-4" variants={fadeUp}>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/login"
              className="inline-block px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
            >
              登录
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/register"
              className="inline-block px-6 py-3 rounded-lg border border-primary text-primary hover:bg-primary/10 transition"
            >
              注册
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </main>
  )
}
