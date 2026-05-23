import { describe, it, expect } from "vitest"

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000"

describe("Register API", () => {
  it("should reject registration without account code", async () => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "testuser", password: "test123" }),
    })
    const data = await res.json()
    expect(res.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it("should reject registration with invalid account code", async () => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "testuser", password: "test123", code: "invalid-code-999" }),
    })
    expect(res.status).toBe(400)
  })

  it("should reject registration with missing fields", async () => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "test" }),
    })
    expect(res.status).toBe(400)
  })
})
