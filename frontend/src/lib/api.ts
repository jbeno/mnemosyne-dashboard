import type { Databases, LifecycleData, Memory, MemoryQuery, ReviewData, Stats, TimelineData, TodayDigest } from "@/lib/types"

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
  memories: (query: MemoryQuery) => request<{ items: Memory[] }>(`/api/memories?${new URLSearchParams(query).toString()}`),
  review: (query: Record<string, string>) => request<ReviewData>(`/api/review?${new URLSearchParams(query).toString()}`),
  lifecycle: () => request<LifecycleData>("/api/lifecycle?limit=80"),
  timeline: (query: Record<string, string>) => request<TimelineData>(`/api/timeline?${new URLSearchParams(query).toString()}`),
}
