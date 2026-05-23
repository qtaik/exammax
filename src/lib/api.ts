"use client"

type RequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown
  params?: Record<string, string | number | undefined>
  headers?: Record<string, string>
}

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

let redirecting = false

function handle401(reason?: string) {
  if (typeof window === "undefined") return
  if (redirecting) return
  redirecting = true
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : ""
  window.location.replace(`/login${query}`)
}

async function request<T = unknown>(
  method: string,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...options.headers,
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  // Build URL with query params, skipping undefined values
  let url = path
  if (options.params) {
    const entries = Object.entries(options.params).filter(
      ([, v]) => v !== undefined
    ) as [string, string][]
    if (entries.length > 0) {
      url += "?" + new URLSearchParams(entries).toString()
    }
  }

  // Only set Content-Type for requests with body
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json"
  }

  const res = await fetch(url, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  })

  const isJson = res.headers.get("content-type")?.includes("application/json")
  const data = isJson ? await res.json() : await res.text()

  if (res.status === 401) {
    const msg = isJson ? data?.error : ""
    handle401(msg || undefined)
    throw new Error(msg || "认证失败")
  }

  if (!res.ok) {
    const errorMsg = isJson ? data?.error : data
    throw new Error(errorMsg || `请求失败 (${res.status})`)
  }

  return data as T
}

export const api = {
  get<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("GET", path, options)
  },
  post<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return request<T>("POST", path, { ...options, body })
  },
  put<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return request<T>("PUT", path, { ...options, body })
  },
  patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return request<T>("PATCH", path, { ...options, body })
  },
  delete<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("DELETE", path, options)
  },
}
