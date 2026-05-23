const BASE = process.env.TEST_BASE_URL || "http://localhost:3000"

export async function loginAsAdmin(): Promise<{ token: string; userId: string }> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Login failed: ${data.error}`)
  return { token: data.token, userId: data.user?.id || "" }
}

export async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status}): ${data.error}`)
  return data as T
}

export async function apiPost<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`POST ${path} failed (${res.status}): ${data.error}`)
  return data as T
}

export async function apiDelete<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`DELETE ${path} failed (${res.status}): ${data.error}`)
  return data as T
}
