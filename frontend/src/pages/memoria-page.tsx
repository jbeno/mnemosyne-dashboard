import { useCallback, useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"

import { ChartPanel } from "@/components/chart-panel"
import { CategoryBarChart } from "@/components/dashboard-charts"
import { MetricStrip } from "@/components/metric-strip"
import { PageHeader } from "@/components/page-header"
import { StructuredRecordList } from "@/components/structured-record-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dashboardApi } from "@/lib/api"
import type { JsonRecord, MemoriaStats } from "@/lib/types"

type Collection = "facts" | "timelines" | "instructions" | "kg" | "preferences"

const collections: Array<{ key: Collection; label: string; table: string; description: string }> = [
  { key: "facts", label: "Facts", table: "memoria_facts", description: "Structured facts extracted and retained by MEMORIA." },
  { key: "timelines", label: "Timelines", table: "memoria_timelines", description: "Dated events and changes organized as a chronology." },
  { key: "instructions", label: "Instructions", table: "memoria_instructions", description: "Durable operating instructions learned from conversations." },
  { key: "kg", label: "Knowledge graph", table: "memoria_kg", description: "MEMORIA subject-predicate-object relationships." },
  { key: "preferences", label: "Preferences", table: "memoria_preferences", description: "Learned choices and behavioral preferences." },
]

export function MemoriaPage({ databaseKey }: { databaseKey: string }) {
  const [stats, setStats] = useState<MemoriaStats | null>(null)
  const [items, setItems] = useState<Partial<Record<Collection, JsonRecord[]>>>({})
  const [activeCollection, setActiveCollection] = useState<Collection>("facts")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCollection = useCallback(async (collection: Collection, search = "") => {
    setLoading(true)
    setError(null)
    try {
      const response = await dashboardApi.memoria(collection, search)
      setItems((current) => ({ ...current, [collection]: response.items }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "MEMORIA records could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    setItems({})
    setQuery("")
    setActiveCollection("facts")
    setLoading(true)
    setError(null)
    void Promise.all([dashboardApi.memoriaStats(), dashboardApi.memoria("facts")])
      .then(([nextStats, response]) => { if (active) { setStats(nextStats); setItems({ facts: response.items }) } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "MEMORIA could not be loaded.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [databaseKey])

  const tableRows = useMemo(() => collections.map((collection) => ({ label: collection.label, value: stats?.tables[collection.table]?.count || 0 })), [stats])
  const total = tableRows.reduce((sum, row) => sum + row.value, 0)

  const selectCollection = (value: string) => {
    const collection = value as Collection
    setActiveCollection(collection)
    setQuery("")
    if (!items[collection]) void loadCollection(collection)
  }

  return (
    <div className="space-y-10" aria-busy={loading}>
      <PageHeader description="Inspect the structured memory layers maintained by the optional MEMORIA module." eyebrow="Knowledge" title="MEMORIA" />
      <MetricStrip metrics={[
        { description: "All records across the five MEMORIA collections.", label: "Total records", value: total },
        { description: collections[0].description, label: "Facts", value: stats?.tables.memoria_facts?.count },
        { description: collections[2].description, label: "Instructions", value: stats?.tables.memoria_instructions?.count },
        { description: collections[4].description, label: "Preferences", value: stats?.tables.memoria_preferences?.count },
      ]} />
      {error ? <p className="border-l-2 border-destructive px-4 py-2 text-sm" role="alert">{error}</p> : null}

      <div className="grid gap-x-10 gap-y-12 xl:grid-cols-2">
        <ChartPanel className="border-t-0 pt-0" description="Record volume across each MEMORIA storage function." help="A zero count usually means the corresponding extraction feature has not emitted records for this profile yet." title="Collection inventory">
          <CategoryBarChart data={tableRows} label="Records" />
        </ChartPanel>
        <ChartPanel className="border-t-0 pt-0" description="Sessions contributing the most MEMORIA facts, timelines, instructions, and preferences." help="Session concentration can reveal whether learned context is broad or dominated by one long-running conversation." title="Top sessions">
          <CategoryBarChart data={(stats?.top_sessions || []).slice(0, 8).map((row) => ({ label: shortSession(row.session_id), value: row.count }))} label="Records" />
        </ChartPanel>
      </div>

      <section aria-labelledby="memoria-collections">
        <div className="mb-5">
          <h2 className="text-lg font-semibold" id="memoria-collections">Collections</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Browse the source records behind the MEMORIA summary. This dashboard is read-only.</p>
        </div>
        <Tabs onValueChange={selectCollection} value={activeCollection}>
          <TabsList aria-label="MEMORIA collection">{collections.map((collection) => <TabsTrigger key={collection.key} value={collection.key}>{collection.label}</TabsTrigger>)}</TabsList>
          {collections.map((collection) => (
            <TabsContent className="pt-6" key={collection.key} value={collection.key}>
              <form className="mb-6 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void loadCollection(collection.key, query) }}>
                <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={`Search ${collection.label}`} className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${collection.label.toLowerCase()}…`} value={activeCollection === collection.key ? query : ""} /></div>
                <Button disabled={loading} type="submit">Apply</Button>
                {query && activeCollection === collection.key ? <Button onClick={() => { setQuery(""); void loadCollection(collection.key) }} type="button" variant="ghost">Clear</Button> : null}
              </form>
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3"><div><h3 className="font-semibold">{collection.label}</h3><p className="mt-1 text-sm text-muted-foreground">{collection.description}</p></div><Badge variant="outline">{(items[collection.key]?.length || 0).toLocaleString()} shown</Badge></div>
              {collection.key === "kg" ? <KnowledgeRows items={items.kg} /> : <StructuredRecordList empty={loading ? `Loading ${collection.label.toLowerCase()}…` : `No ${collection.label.toLowerCase()} found.`} items={items[collection.key]} />}
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </div>
  )
}

function KnowledgeRows({ items }: { items: JsonRecord[] | undefined }) {
  if (!items?.length) return <p className="py-8 text-sm text-muted-foreground">No MEMORIA knowledge relationships found.</p>
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Predicate</TableHead><TableHead>Object</TableHead><TableHead>Confidence</TableHead><TableHead>Session</TableHead></TableRow></TableHeader>
      <TableBody>{items.map((item, index) => <TableRow key={String(item.id || index)}><TableCell className="font-medium">{String(item.subject || "—")}</TableCell><TableCell><Badge variant="outline">{String(item.predicate || "—")}</Badge></TableCell><TableCell className="max-w-xl whitespace-normal">{String(item.object || "—")}</TableCell><TableCell className="tabular-nums">{item.confidence === undefined || item.confidence === null ? "—" : Number(item.confidence).toFixed(2)}</TableCell><TableCell className="max-w-48 truncate text-muted-foreground">{String(item.session_id || "—")}</TableCell></TableRow>)}</TableBody>
    </Table>
  )
}

function shortSession(value: string) {
  if (value.length <= 20) return value
  return `${value.slice(0, 10)}…${value.slice(-7)}`
}
