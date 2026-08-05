export type CountRow = {
  count: number
  label?: string
  source?: string
  scope?: string
  session_id?: string
  veracity?: string
  degradation_label?: string
}

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
  review?: { active_candidates: number }
  degradation?: { degraded: number }
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
