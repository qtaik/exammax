import { describe, it, expect, beforeAll } from "vitest"
import { loginAsAdmin, apiGet, apiPost } from "../helpers"

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000"

describe("Core Flows (Authenticated)", () => {
  let token: string

  beforeAll(async () => {
    const auth = await loginAsAdmin()
    token = auth.token
  })

  // --- Checkin ---
  describe("Checkin", () => {
    it("should get checkin status", async () => {
      const data = await apiGet<{ checkedIn: boolean; streakDays: number }>("/api/checkin", token)
      expect(data).toHaveProperty("checkedIn")
      expect(data).toHaveProperty("streakDays")
    })

    it("should handle checkin action", async () => {
      const res = await fetch(`${BASE}/api/checkin`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      // Either succeeds (first checkin today) or fails with "今日已签到"
      expect(res.status === 200 || data.error === "今日已签到").toBe(true)
    })
  })

  // --- Practice ---
  describe("Practice", () => {
    it("should fetch practice questions", async () => {
      const data = await apiGet<{ questions: unknown[] }>("/api/practice?limit=5", token)
      expect(Array.isArray(data.questions)).toBe(true)
    })

    it("should submit a practice answer", async () => {
      // First get a question
      const { questions } = await apiGet<{ questions: { id: string; type: string }[] }>("/api/practice?limit=1", token)
      if (questions.length === 0) return // Skip if no questions in DB

      const q = questions[0]
      const answer = q.type === "CHOICE" ? "A" : q.type === "JUDGE" ? "T" : "test"
      const data = await apiPost<{ correct: boolean; correctAnswer: string; explanation: string }>(
        "/api/practice",
        { questionId: q.id, userAnswer: answer, timeSpent: 10 },
        token
      )
      expect(data).toHaveProperty("correct")
      expect(data).toHaveProperty("correctAnswer")
    })
  })

  // --- Shop ---
  describe("Shop", () => {
    it("should list shop items", async () => {
      const data = await apiGet<{ items: unknown[]; userPoints: number }>("/api/shop", token)
      expect(Array.isArray(data.items)).toBe(true)
      expect(typeof data.userPoints).toBe("number")
    })
  })

  // --- Lottery ---
  describe("Lottery", () => {
    it("should get lottery state", async () => {
      const data = await apiGet<{ points: number; pityCounter: number }>("/api/lottery", token)
      expect(typeof data.points).toBe("number")
      expect(typeof data.pityCounter).toBe("number")
    })
  })

  // --- Wrong Questions ---
  describe("Wrong Questions", () => {
    it("should list wrong questions", async () => {
      const data = await apiGet<{ records: unknown[] }>("/api/wrong-questions?status=ACTIVE", token)
      expect(Array.isArray(data.records)).toBe(true)
    })
  })

  // --- Achievements ---
  describe("Achievements", () => {
    it("should list achievements", async () => {
      const data = await apiGet<{ achievements: unknown[] }>("/api/achievements", token)
      expect(Array.isArray(data.achievements)).toBe(true)
    })
  })

  // --- Leaderboard ---
  describe("Leaderboard", () => {
    it("should get leaderboard", async () => {
      const data = await apiGet<{ leaderboard: unknown[] }>("/api/leaderboard?type=accuracy", token)
      expect(Array.isArray(data.leaderboard)).toBe(true)
    })
  })

  // --- Admin APIs ---
  describe("Admin APIs", () => {
    it("should get admin stats", async () => {
      const data = await apiGet<{ totalUsers: number }>("/api/admin/stats", token)
      expect(typeof data.totalUsers).toBe("number")
    })

    it("should get admin settings", async () => {
      const data = await apiGet<{ settings: unknown[] }>("/api/admin/settings", token)
      expect(Array.isArray(data.settings)).toBe(true)
    })

    it("should get admin users list", async () => {
      const data = await apiGet<{ users: unknown[] }>("/api/admin/users", token)
      expect(Array.isArray(data.users)).toBe(true)
    })
  })
})
