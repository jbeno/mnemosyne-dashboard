export type CountRow = {
  count: number
  label?: string
  source?: string
  scope?: string
  session_id?: string
  veracity?: string
  degradation_label?: string
}

export type JsonRecord = Record<string, unknown>

export type PatternItem = { label: string; count: number; confidence?: number; percent?: number; query?: string; pattern_type?: string }
export type PatternsData = {
  provider: string
  content_patterns: PatternItem[]
  temporal_patterns: PatternItem[]
  sequence_patterns: PatternItem[]
  context_domains: PatternItem[]
  origins: PatternItem[]
  memory_types: PatternItem[]
  summary: { indexed_memories: number; indexed_triples: number; patterns_found: number; context_domains: number }
}

export type ContextSignal = {
  kind: string
  label: string
  importance?: number
  confidence_label: string
  confidence_pct: number
  timestamp?: string
  category: string
  context_type: string
  source?: string
  status?: string
  tier?: string
  sensitive?: boolean
  needs_review?: boolean
}
export type InferredProfileData = {
  sections: Array<{ name: string; count: number; items: ContextSignal[] }>
  summary: { indexed_signals: number; sections: number; needs_review: number; sensitive: number; types: CountRow[] }
}

export type GraphNode = { id: string; label: string; count?: number; weight?: number; kind?: string; category?: string; preview?: string; memory_id?: string; last_seen?: string }
export type GraphEdge = { id: string; source: string; target: string; predicate?: string; label?: string; subject?: string; object?: string; confidence?: number; kind?: string; knowledge_store?: string }
export type GraphData = { nodes: GraphNode[]; edges: GraphEdge[] }

export type MemoriaStats = { tables: Record<string, { count: number; columns: string[] }>; top_sessions: Array<{ session_id: string; count: number }> }
export type PersonaStats = { total: number; by_tier: Array<{ tier: string; count: number }>; by_topic: Array<{ topic: string; count: number }> }
export type CanonicalStats = { total: number; by_owner: Array<{ owner_id: string; count: number }>; by_category: Array<{ category: string; count: number }> }
export type PersonaData = { items: JsonRecord[]; stats: PersonaStats }
export type CanonicalData = { items: JsonRecord[]; stats: CanonicalStats }
export type ConstellationData = GraphData & { clusters: Array<{ label: string; count: number }> }

export type DashboardConfig = { host: string; port: number; db_path: string; auth_enabled: boolean; has_password: boolean; bind_url: string; local_url: string; lan_url: string; memory_admin_enabled: boolean; db_paths: string[] }
export type AuthStatus = { version: string; auth_enabled: boolean; has_password: boolean; authenticated: boolean; config: DashboardConfig }
export type AuditEntry = { timestamp?: string; action?: string; memory_id?: string; before?: JsonRecord | null; after?: JsonRecord | null; extra?: JsonRecord; raw?: string }
export type Diagnostics = { db_path: string; exists: boolean; readable: boolean; read_only: boolean; size_bytes: number; modified_at: string; tables: string[]; table_counts: Record<string, number>; missing_expected_tables?: string[]; table_errors?: Record<string, string>; ok: boolean; error?: string }
export type RuntimeStatus = { ok: boolean; running: boolean; reachable: boolean; pid?: number; pid_file_pid?: number; listener_pids: number[]; stale_pid: boolean; runtime_stale: boolean; runtime_source: string; started_at?: number; probe: { status?: number; url?: string; error?: string }; config: DashboardConfig }
export type RealtimeStatus = { ok: boolean; read_only: boolean; streaming_supported: boolean; deltasync_supported: boolean; mnemosyne_version: string; realtime_generation: string; event_types: string[]; deltasync_tables: string[]; deltasync_methods: string[]; snapshot_event_count: number; transport: string; payload_policy: string; db_modified_at: string }

export type Memory = {
  id: string
  content?: string
  source?: string
  scope?: string
  session_id?: string
  timestamp?: string
  created_at?: string
  importance?: number
  veracity?: string
  degradation_label?: string
  memory_type?: string
  memory_kind?: string
  type?: string
  status?: string
  tier?: string | number
  degradation_tier?: number
  recall_count?: number
  last_recalled?: string
  valid_until?: string
  superseded_by?: string
  supersedes?: string
  effective_memory_weight?: number
}

export type MemoryQuery = {
  kind?: string
  q?: string
  source?: string
  scope?: string
  session_id?: string
  veracity?: string
  degradation_tier?: string
  contaminated_only?: string
  degraded_only?: string
  due_for_degradation?: string
  status?: string
  sort?: string
  limit?: string
  offset?: string
}

export type ReviewCard = { key: string; title: string; count: number; description?: string }
export type MemoryQueue = { title: string; description: string; filter?: MemoryQuery; items: Memory[] }

export type ReviewData = {
  read_only: boolean
  queue: string
  total: number
  listed: number
  next_offset: number | null
  has_more: boolean
  cards: ReviewCard[]
  queues: Record<string, MemoryQueue>
}

export type LifecycleData = {
  read_only: boolean
  thresholds: { tier2_days: number; tier3_days: number; weights: Record<string, number> }
  counts: Record<string, number>
  cards: ReviewCard[]
  queues: Record<string, MemoryQueue>
}

export type TimelineEvent = {
  type: string
  timestamp: string
  session_id?: string
  title: string
  preview: string
  item: Record<string, unknown>
}

export type TimelineData = {
  query: string
  group: string
  groups: Array<{ key: string; count: number; events: TimelineEvent[] }>
}

export type Triple = {
  id?: string
  subject?: string
  predicate?: string
  object?: string
  created_at?: string
  valid_from?: string
  valid_until?: string
  source?: string
  confidence?: number
  knowledge_store?: string
}

export type Consolidation = {
  id?: string
  summary?: string
  content?: string
  created_at?: string
  timestamp?: string
  session_id?: string
}

export type Stats = {
  db_path: string
  counts: {
    working_memory: number
    episodic_memory: number
    triples: number
    consolidation_log: number
  }
  working_memory?: { unconsolidated: number; consolidated: number; total: number }
  review?: { active_candidates: number; active_non_stated?: number; importance_threshold?: number }
  degradation?: { degraded: number; due_tier2?: number; due_tier3?: number }
  by_source: CountRow[]
  by_scope: CountRow[]
  by_session: CountRow[]
  by_veracity?: CountRow[]
  by_degradation?: CountRow[]
}

export type Database = {
  path: string
  label: string
  active: boolean
  size_bytes?: number
}

export type Databases = { databases: Database[]; active: string }

export type ActivityPoint = {
  date: string
  memories: number
  triples: number
  consolidations: number
  total: number
}

export type ActivitySeries = {
  days: number
  start: string
  end: string
  series: ActivityPoint[]
}

export type TodayDigest = {
  counts: {
    memories_added: number
    memories_recalled: number
    contaminated_added: number
    degraded_added: number
    triples_added: number
    consolidations: number
  }
  breakdowns?: {
    entities?: CountRow[]
    veracity?: CountRow[]
    degradation?: CountRow[]
    sources?: CountRow[]
    sessions?: CountRow[]
  }
  memories_added?: Memory[]
  memories_recalled?: Memory[]
  triples_added?: Triple[]
  consolidations?: Consolidation[]
}
