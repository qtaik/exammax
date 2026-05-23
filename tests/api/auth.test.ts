import { describe, it, expect } from "vitest"

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000"

describe("Auth API", () => {
  it("should login with admin credentials", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.token).toBeDefined()
    expect(data.user).toBeDefined()
    expect(data.user.role).toBe("ADMIN")
  })

  it("should reject wrong password", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "wrongpassword" }),
    })
    expect(res.status).toBe(401)
  })

  it("should reject non-existent user", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "nonexistent_user_999", password: "test123" }),
    })
    expect(res.status).toBe(401)
  })

  it("should reject missing credentials", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it("should return user profile with valid token", async () => {
    // First login
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    })
    const { token } = await loginRes.json()

    // Then fetch profile
    const res = await fetch(`${BASE}/api/user/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    expect(res.status).toBe(200)
    const user = data.user || data
    expect(user.username).toBe("admin")
    expect(user.role).toBe("ADMIN")
  })

  it("should reject profile request without token", async () => {
    const res = await fetch(`${BASE}/api/user/me`)
    expect(res.status).toBe(401)
  })

  it("should reject profile request with invalid token", async () => {
    const res = await fetch(`${BASE}/api/user/me`, {
      headers: { Authorization: "Bearer invalid-token-here" },
    })
    expect(res.status).toBe(401)
  })
})
