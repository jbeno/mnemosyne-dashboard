import { useCallback, useEffect, useState } from "react"
import { Search } from "lucide-react"

import { MemoryList } from "@/components/memory-list"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { dashboardApi } from "@/lib/api"
import type { Memory, MemoryQuery, Stats } from "@/lib/types"

const PAGE_SIZE = 100

type Filters = {
  q: string
  kind: string
  status: string
  sort: string
  source: string
  scope: string
  trust: string
}

const initialFilters: Filters = {
  q: "",
  kind: "all",
  status: "active",
  sort: "recent",
  source: "all",
  scope: "all",
  trust: "all",
}

function queryFor(filters: Filters, offset = 0): MemoryQuery {
  return {
    q: filters.q,
    kind: filters.kind,
    status: filters.status,
    sort: filters.sort,
    source: filters.source === "all" ? "" : filters.source,
    scope: filters.scope === "all" ? "" : filters.scope,
    veracity: filters.trust.startsWith("veracity:") ? filters.trust.replace("veracity:", "") : "",
    contaminated_only: filters.trust === "non-stated" ? "1" : "",
    degraded_only: filters.trust === "degraded" ? "1" : "",
    due_for_degradation: filters.trust === "due" ? "1" : "",
    limit: String(PAGE_SIZE),
    offset: String(offset),
  }
}

export function MemoriesPage({ stats, databaseKey }: { stats: Stats | null; databaseKey: string }) {
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [applied, setApplied] = useState<Filters>(initialFilters)
  const [items, setItems] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const load = useCallback(async (next: Filters, offset = 0) => {
    setLoading(true)
    setError(null)
    try {
      const response = await dashboardApi.memories(queryFor(next, offset))
      setItems((current) => (offset ? [...current, ...response.items] : response.items))
      setHasMore(response.items.length === PAGE_SIZE)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Memories could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setFilters(initialFilters)
    setApplied(initialFilters)
    void load(initialFilters)
  }, [databaseKey, load])

  const update = (key: keyof Filters, value: string) => setFilters((current) => ({ ...current, [key]: value }))
  const apply = () => {
    setApplied(filters)
    void load(filters)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        description="Search and filter active, expired, and superseded working or episodic memories."
        eyebrow="Memory"
        title="Browse memories"
      />

      <form
        className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:flex-wrap"
        onSubmit={(event) => {
          event.preventDefault()
          apply()
        }}
      >
        <div className="relative w-full sm:min-w-72 sm:flex-[1_1_22rem]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search memory content" className="pl-9" onChange={(event) => update("q", event.target.value)} placeholder="Search content, ID, or session…" value={filters.q} />
        </div>
        <FilterSelect label="Memory kind" onChange={(value) => update("kind", value)} options={[['all','All memory'],['working','Working'],['episodic','Episodic']]} value={filters.kind} />
        <FilterSelect label="Status" onChange={(value) => update("status", value)} options={[['active','Active'],['expired','Expired'],['superseded','Superseded'],['all','All status']]} value={filters.status} />
        <FilterSelect label="Sort" onChange={(value) => update("sort", value)} options={[['recent','Most recent'],['oldest','Oldest'],['importance','Importance'],['recall','Recall count']]} value={filters.sort} />
        <FilterSelect label="Source" onChange={(value) => update("source", value)} options={[['all','All sources'],...(stats?.by_source || []).map((row) => [row.source || 'unknown', row.source || 'Unknown'] as [string,string])]} value={filters.source} />
        <FilterSelect label="Scope" onChange={(value) => update("scope", value)} options={[['all','All scopes'],...(stats?.by_scope || []).map((row) => [row.scope || 'unknown', row.scope || 'Unknown'] as [string,string])]} value={filters.scope} />
        <FilterSelect className="sm:w-44" label="Trust or lifecycle" onChange={(value) => update("trust", value)} options={[['all','Any trust'],['non-stated','Non-stated'],['veracity:stated','Stated'],['veracity:tool','Tool'],['veracity:unknown','Unknown'],['degraded','Degraded'],['due','Due lifecycle']]} value={filters.trust} />
        <Button className="w-full sm:w-auto" disabled={loading} type="submit">Apply</Button>
      </form>

      {error ? <p className="border-l-2 border-destructive px-4 py-2 text-sm" role="alert">{error}</p> : null}
      <MemoryList empty={loading ? "Loading memories…" : "No memories match these filters."} items={items} limit={items.length || 1} title="Results" />
      {hasMore ? (
        <Button disabled={loading} onClick={() => void load(applied, items.length)} variant="outline">
          {loading ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  )
}

function FilterSelect({ className = "", label, value, onChange, options }: { className?: string; label: string; value: string; onChange: (value: string) => void; options: Array<[string,string]> }) {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger aria-label={label} className={`w-full sm:w-40 ${className}`}><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}</SelectContent>
    </Select>
  )
}
