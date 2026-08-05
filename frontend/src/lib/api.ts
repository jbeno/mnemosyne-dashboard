import type { ActivitySeries, CanonicalData, ConstellationData, DashboardConfig, Databases, Diagnostics, GraphData, InferredProfileData, JsonRecord, LifecycleData, MemoriaStats, Memory, MemoryQuery, PatternsData, PersonaData, RealtimeStatus, ReviewData, RuntimeStatus, Stats, TimelineData, TodayDigest, Triple } from "@/lib/types"

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
  activitySeries: (days = 30) => request<ActivitySeries>(`/api/activity-series?days=${days}`),
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
  patterns: () => request<PatternsData>("/api/patterns?limit=10"),
  inferredProfile: () => request<InferredProfileData>("/api/profile/inferred?limit=10"),
  graph: (q = "") => request<GraphData>(`/api/graph?${new URLSearchParams({ q, limit: "300" }).toString()}`),
  triples: (q = "") => request<{ items: Triple[] }>(`/api/triples?${new URLSearchParams({ q, limit: "300" }).toString()}`),
  memoriaStats: () => request<MemoriaStats>("/api/memoria/stats"),
  memoria: (collection: "facts" | "timelines" | "instructions" | "kg" | "preferences", q = "") => request<{ items: JsonRecord[] }>(`/api/memoria/${collection}?${new URLSearchParams({ q, limit: "200" }).toString()}`),
  persona: (query: Record<string, string>) => request<PersonaData>(`/api/persona?${new URLSearchParams({ ...query, limit: "200" }).toString()}`),
  canonical: (query: Record<string, string>) => request<CanonicalData>(`/api/canonical?${new URLSearchParams({ ...query, limit: "200" }).toString()}`),
  constellation: () => request<ConstellationData>("/api/constellation?limit=240"),
  config: () => request<{ ok: boolean; config: DashboardConfig }>("/api/config"),
  saveConfig: (updates: Record<string, unknown>) => request<{ ok: boolean; config: DashboardConfig; message: string }>("/api/config", { method: "POST", body: JSON.stringify(updates) }),
  diagnostics: () => request<Diagnostics>("/api/diagnostics"),
  runtimeStatus: () => request<RuntimeStatus>("/api/runtime/status"),
  realtimeStatus: () => request<RealtimeStatus>("/api/realtime/status"),
  backup: () => request<{ ok: boolean; backup: { path: string } }>("/api/admin/backup", { method: "POST", body: "{}" }),
}
