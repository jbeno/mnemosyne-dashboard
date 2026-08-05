import type { Databases, Stats, TodayDigest } from "@/lib/types"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`)
  }
  return payload as T
}

export const dashboardApi = {
  stats: () => request<Stats>("/api/stats"),
  databases: () => request<Databases>("/api/databases"),
  selectDatabase: (path: string) =>
    request<{ ok: boolean; active: string }>("/api/databases/select", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),
  today: () => request<TodayDigest>("/api/digest/today?limit=80"),
}
