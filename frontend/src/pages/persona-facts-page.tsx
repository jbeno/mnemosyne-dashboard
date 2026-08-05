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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dashboardApi } from "@/lib/api"
import type { CanonicalData, PersonaData } from "@/lib/types"

export function PersonaFactsPage({ databaseKey }: { databaseKey: string }) {
  const [persona, setPersona] = useState<PersonaData | null>(null)
  const [canonical, setCanonical] = useState<CanonicalData | null>(null)
  const [activeTab, setActiveTab] = useState("persona")
  const [query, setQuery] = useState("")
  const [tier, setTier] = useState("all")
  const [category, setCategory] = useState("all")
  const [owner, setOwner] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (target: "persona" | "canonical", search = "") => {
    setLoading(true)
    setError(null)
    try {
      if (target === "persona") setPersona(await dashboardApi.persona({ q: search, tier: tier === "all" ? "" : tier }))
      else setCanonical(await dashboardApi.canonical({ q: search, category: category === "all" ? "" : category, owner_id: owner === "all" ? "" : owner }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Persona and canonical facts could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [category, owner, tier])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setQuery("")
    setTier("all")
    setCategory("all")
    setOwner("all")
    void Promise.all([dashboardApi.persona({}), dashboardApi.canonical({})])
      .then(([nextPersona, nextCanonical]) => { if (active) { setPersona(nextPersona); setCanonical(nextCanonical) } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Persona and canonical facts could not be loaded.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [databaseKey])

  const tierOptions = useMemo(() => persona?.stats.by_tier.map((row) => row.tier).filter(Boolean) || [], [persona])
  const categoryOptions = useMemo(() => canonical?.stats.by_category.map((row) => row.category).filter(Boolean) || [], [canonical])
  const ownerOptions = useMemo(() => canonical?.stats.by_owner.map((row) => row.owner_id).filter(Boolean) || [], [canonical])

  return (
    <div className="space-y-10" aria-busy={loading}>
      <PageHeader description="Review learned persona signals and owner-scoped facts that Mnemosyne treats as durable identity context." eyebrow="Knowledge" title="Persona & facts" />
      <MetricStrip metrics={[
        { description: "All L3 persona facts, including working, long-term, and permanent tiers.", label: "Persona facts", value: persona?.stats.total },
        { description: "Persona facts promoted to the permanent tier.", label: "Permanent", value: persona?.stats.by_tier.find((row) => row.tier === "permanent")?.count || 0 },
        { description: "Currently valid owner-scoped canonical facts.", label: "Canonical facts", value: canonical?.stats.total },
        { description: "Distinct owners with at least one currently valid canonical fact.", label: "Fact owners", value: canonical?.stats.by_owner.length },
      ]} />
      {error ? <p className="border-l-2 border-destructive px-4 py-2 text-sm" role="alert">{error}</p> : null}

      <div className="grid gap-x-10 gap-y-12 xl:grid-cols-2">
        <ChartPanel className="border-t-0 pt-0" description="Persona facts by retention tier." help="Working facts are tentative; long-term and permanent facts have been reinforced or explicitly promoted." title="Persona tiers">
          <CategoryBarChart data={(persona?.stats.by_tier || []).map((row) => ({ label: titleCase(row.tier), value: row.count }))} label="Facts" />
        </ChartPanel>
        <ChartPanel className="border-t-0 pt-0" description="Most common active canonical fact categories." help="Canonical facts are owner-scoped, versioned records intended to provide stable context." title="Canonical categories">
          <CategoryBarChart data={(canonical?.stats.by_category || []).slice(0, 8).map((row) => ({ label: titleCase(row.category), value: row.count }))} label="Facts" />
        </ChartPanel>
      </div>

      <Tabs onValueChange={(value) => { setActiveTab(value); setQuery("") }} value={activeTab}>
        <TabsList aria-label="Persona and facts view"><TabsTrigger value="persona">Persona</TabsTrigger><TabsTrigger value="canonical">Canonical facts</TabsTrigger></TabsList>
        <TabsContent className="pt-6" value="persona">
          <FilterForm loading={loading} onClear={() => { setQuery(""); setTier("all"); void dashboardApi.persona({}).then(setPersona) }} onSubmit={() => void load("persona", query)} query={query} setQuery={setQuery}>
            <Select onValueChange={setTier} value={tier}><SelectTrigger aria-label="Persona tier" className="w-full sm:w-48"><SelectValue placeholder="All tiers" /></SelectTrigger><SelectContent><SelectItem value="all">All tiers</SelectItem>{tierOptions.map((value) => <SelectItem key={value} value={value}>{titleCase(value)}</SelectItem>)}</SelectContent></Select>
          </FilterForm>
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Learned persona</h2><Badge variant="outline">{(persona?.items.length || 0).toLocaleString()} shown</Badge></div>
          <StructuredRecordList empty={loading ? "Loading persona facts…" : "No persona facts match these filters."} items={persona?.items} />
        </TabsContent>
        <TabsContent className="pt-6" value="canonical">
          <FilterForm loading={loading} onClear={() => { setQuery(""); setCategory("all"); setOwner("all"); void dashboardApi.canonical({}).then(setCanonical) }} onSubmit={() => void load("canonical", query)} query={query} setQuery={setQuery}>
            <Select onValueChange={setOwner} value={owner}><SelectTrigger aria-label="Canonical fact owner" className="w-full sm:w-56"><SelectValue placeholder="All owners" /></SelectTrigger><SelectContent><SelectItem value="all">All owners</SelectItem>{ownerOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
            <Select onValueChange={setCategory} value={category}><SelectTrigger aria-label="Canonical fact category" className="w-full sm:w-52"><SelectValue placeholder="All categories" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categoryOptions.map((value) => <SelectItem key={value} value={value}>{titleCase(value)}</SelectItem>)}</SelectContent></Select>
          </FilterForm>
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Canonical facts</h2><Badge variant="outline">{(canonical?.items.length || 0).toLocaleString()} shown</Badge></div>
          <StructuredRecordList empty={loading ? "Loading canonical facts…" : "No canonical facts match these filters."} items={canonical?.items} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function FilterForm({ children, loading, onClear, onSubmit, query, setQuery }: { children: React.ReactNode; loading: boolean; onClear: () => void; onSubmit: () => void; query: string; setQuery: (value: string) => void }) {
  return <form className="mb-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap" onSubmit={(event) => { event.preventDefault(); onSubmit() }}><div className="relative min-w-60 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search facts" className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Search facts…" value={query} /></div>{children}<Button disabled={loading} type="submit">Apply</Button><Button onClick={onClear} type="button" variant="ghost">Clear</Button></form>
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase())
}
