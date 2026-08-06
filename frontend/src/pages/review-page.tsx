import { useCallback, useEffect, useState } from "react"
import { Search } from "lucide-react"

import { ChartPanel } from "@/components/chart-panel"
import { CategoryBarChart } from "@/components/dashboard-charts"
import { MemoryList } from "@/components/memory-list"
import { MemoryDetailSheet } from "@/components/memory-detail-sheet"
import { MemoryMaintenanceBar } from "@/components/memory-maintenance-bar"
import { MetricStrip } from "@/components/metric-strip"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { dashboardApi } from "@/lib/api"
import type { Memory, ReviewData } from "@/lib/types"

const PAGE_SIZE = 100

export function ReviewPage({ adminEnabled, databaseKey }: { adminEnabled: boolean; databaseKey: string }) {
  const [queue, setQueue] = useState("high_importance_contaminated")
  const [query, setQuery] = useState("")
  const [minImportance, setMinImportance] = useState("0")
  const [data, setData] = useState<ReviewData | null>(null)
  const [items, setItems] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const load = useCallback(async (selectedQueue: string, offset: number, search: string, importance: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await dashboardApi.review({
        queue: selectedQueue,
        q: search,
        min_importance: importance === "0" ? "" : importance,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })
      setData(response)
      const pageItems = response.queues[selectedQueue]?.items || []
      setItems((current) => (offset ? [...current, ...pageItems] : pageItems))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Review queues could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setQueue("high_importance_contaminated")
    setQuery("")
    setMinImportance("0")
    setSelectedIds(new Set())
    setSelectedMemory(null)
    void load("high_importance_contaminated", 0, "", "0")
  }, [databaseKey, load])

  const changeQueue = (value: string) => {
    setQueue(value)
    setSelectedIds(new Set())
    void load(value, 0, query, minImportance)
  }
  const toggleSelected = (memory: Memory, checked: boolean) => setSelectedIds((current) => { const next = new Set(current); if (checked) next.add(memory.id); else next.delete(memory.id); return next })
  const reload = async () => { await load(queue, 0, query, minImportance); setSelectedIds(new Set()) }
  const selected = data?.queues[queue]

  return (
    <div className="space-y-8">
      <PageHeader
        description="Inspect provenance and lifecycle signals before deciding whether any memory needs attention."
        eyebrow="Memory"
        title="Trust review"
      />
      <MetricStrip metrics={(data?.cards || []).map((card) => ({ description: card.description, label: card.title, value: card.count }))} />
      <ChartPanel className="border-t-0 pt-0" description="Relative size of each read-only review queue." help="These categories overlap, so their bars should not be added together. Use the queue descriptions and filters to decide whether inspection is worthwhile." title="Queue distribution">
        <CategoryBarChart data={(data?.cards || []).map((card) => ({ description: card.description, label: card.title, value: card.count }))} label="Memories" />
      </ChartPanel>
      <form className="grid gap-3 lg:grid-cols-[minmax(13rem,1fr)_minmax(16rem,2fr)_minmax(12rem,1fr)_auto]" onSubmit={(event) => { event.preventDefault(); void load(queue, 0, query, minImportance) }}>
        <Select onValueChange={changeQueue} value={queue}>
          <SelectTrigger aria-label="Review queue"><SelectValue placeholder="Review queue" /></SelectTrigger>
          <SelectContent>{(data?.cards || []).map((card) => <SelectItem key={card.key} value={card.key}>{card.title} ({card.count})</SelectItem>)}</SelectContent>
        </Select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search review queue" className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Search this queue…" value={query} />
        </div>
        <label className="flex h-9 items-center gap-3 text-xs text-muted-foreground">
          <span className="shrink-0">Importance {Number(minImportance) ? `≥ ${Number(minImportance).toFixed(2)}` : "any"}</span>
          <input className="w-full accent-[var(--primary)]" max="1" min="0" onChange={(event) => setMinImportance(event.target.value)} step="0.1" type="range" value={minImportance} />
        </label>
        <Button disabled={loading} type="submit">Apply</Button>
      </form>
      <section className="border-l-2 border-primary/45 py-1 pl-5">
        <h2 className="text-lg font-semibold">{selected?.title || "Review queue"}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{selected?.description || "Select a queue to inspect its memories."}</p>
        <p className="mt-2 text-xs tabular-nums text-muted-foreground">{data?.total || 0} total · {items.length} listed · {adminEnabled ? "audited maintenance available" : "read-only review"}</p>
      </section>
      {error ? <p className="border-l-2 border-destructive px-4 py-2 text-sm" role="alert">{error}</p> : null}
      <MemoryMaintenanceBar adminEnabled={adminEnabled} ids={[...selectedIds]} onChanged={reload} onClear={() => setSelectedIds(new Set())} />
      <MemoryList empty={loading ? "Loading review queue…" : "This review queue is clear."} items={items} limit={items.length || 1} onSelect={setSelectedMemory} onToggleSelected={toggleSelected} selectable={adminEnabled} selectedIds={selectedIds} title="Queue memories" />
      {data?.has_more && data.next_offset !== null ? <Button disabled={loading} onClick={() => void load(queue, data.next_offset || items.length, query, minImportance)} variant="outline">{loading ? "Loading…" : "Load more"}</Button> : null}
      <MemoryDetailSheet adminEnabled={adminEnabled} memory={selectedMemory} onChanged={reload} onOpenChange={(open) => { if (!open) setSelectedMemory(null) }} />
    </div>
  )
}
