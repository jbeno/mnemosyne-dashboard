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
  type?: string
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
