export interface MemoryItem {
  id: string
  content: string
  source?: string
  timestamp?: string
  created_at?: string
  session_id?: string
  importance?: number
  recall_count?: number
  scope?: string
  veracity?: string
  memory_kind?: 'working' | 'episodic'
  tier?: string
  degradation_label?: string
  superseded_by?: string
  valid_until?: string
}

export interface GraphNode {
  id: string
  label: string
  kind: 'memory' | 'entity' | string
  category?: string
  weight?: number
  count?: number
  last_seen?: string
  preview?: string
  memory_id?: string
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label?: string
  kind?: string
  predicate?: string
  subject?: string
  object?: string
  knowledge_store?: string
}

export interface GraphDataset {
  read_only: boolean
  nodes: GraphNode[]
  edges: GraphEdge[]
  clusters: Array<{ label: string; count: number }>
}

export interface Stats {
  counts: Record<string, number>
  by_veracity: Array<{ veracity: string; count: number; weight: number }>
  by_degradation: Array<{ degradation_tier: number; degradation_label: string; count: number; weight: number }>
  working_memory: { total: number; unconsolidated: number; consolidated: number }
  review: { active_candidates: number; active_non_stated: number }
  degradation: { degraded: number; due_tier2: number; due_tier3: number }
  recent: MemoryItem[]
}

export interface ActivityPoint {
  date: string
  memories: number
  triples: number
  consolidations: number
  total: number
}

export interface OverviewPayload {
  profile: string
  capabilities: { read: boolean; manage: boolean; forget: boolean }
  database: { path: string; label: string; available: boolean }
  stats: Stats
  activity: { days: number; start: string; end: string; series: ActivityPoint[] }
  constellation: GraphDataset
  memory_map: GraphDataset
  knowledge_graph: GraphDataset
}

export interface MemoriesPayload {
  items: MemoryItem[]
  count: number
  limit: number
  offset: number
}

export interface TimelineEvent {
  type: 'memory' | 'triple' | 'consolidation'
  timestamp: string
  session_id?: string
  title: string
  preview: string
  item: MemoryItem & Record<string, unknown>
}

export interface TimelinePayload {
  query: string
  group: 'day' | 'session'
  groups: Array<{ key: string; count: number; events: TimelineEvent[] }>
}
