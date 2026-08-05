import { useCallback, useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"

import { KeyValueList } from "@/components/key-value-list"
import { MetricStrip } from "@/components/metric-strip"
import { NetworkMap } from "@/components/network-map"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dashboardApi } from "@/lib/api"
import type { GraphData, GraphNode, Triple } from "@/lib/types"
import { formatDate } from "@/lib/utils"

export function KnowledgeGraphPage({ databaseKey }: { databaseKey: string }) {
  const [query, setQuery] = useState("")
  const [graph, setGraph] = useState<GraphData>({ nodes: [], edges: [] })
  const [triples, setTriples] = useState<Triple[]>([])
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (search: string) => {
    setLoading(true)
    setError(null)
    try {
      const [nextGraph, nextTriples] = await Promise.all([dashboardApi.graph(search), dashboardApi.triples(search)])
      setGraph(nextGraph)
      setTriples(nextTriples.items)
      setSelected(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Knowledge graph could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { setQuery(""); void load("") }, [databaseKey, load])
  const connected = useMemo(() => selected ? graph.edges.filter((edge) => edge.source === selected.id || edge.target === selected.id) : [], [graph.edges, selected])
  const linkedNodeCount = useMemo(() => {
    const degree = new Map<string, number>()
    graph.edges.forEach((edge) => { degree.set(edge.source, (degree.get(edge.source) || 0) + 1); degree.set(edge.target, (degree.get(edge.target) || 0) + 1) })
    return [...degree.values()].filter((value) => value > 1).length
  }, [graph.edges])

  return (
    <div className="space-y-10" aria-busy={loading}>
      <PageHeader description="Explore relationships between entities and inspect the structured facts that produced them." eyebrow="Knowledge" title="Knowledge graph" />
      <MetricStrip metrics={[
        { description: "Unique subjects and objects in the loaded relationship set.", label: "Nodes", value: graph.nodes.length },
        { description: "Subject-predicate-object connections currently loaded.", label: "Relations", value: graph.edges.length },
        { description: "Knowledge triples matching the current filter.", label: "Facts", value: triples.length },
        { description: "Nodes connected to more than one relationship in the loaded set.", label: "Connected hubs", value: linkedNodeCount },
      ]} />
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void load(query) }}>
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Filter knowledge graph" className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Filter by subject, predicate, or object…" value={query} /></div>
        <Button disabled={loading} type="submit">Apply</Button>
        {query ? <Button onClick={() => { setQuery(""); void load("") }} type="button" variant="ghost">Clear</Button> : null}
      </form>
      {error ? <p className="border-l-2 border-destructive px-4 py-2 text-sm" role="alert">{error}</p> : null}

      <Tabs defaultValue="map">
        <TabsList aria-label="Knowledge graph view"><TabsTrigger value="map">Relationship map</TabsTrigger><TabsTrigger value="facts">Facts table</TabsTrigger></TabsList>
        <TabsContent className="pt-6" value="map">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <NetworkMap edges={graph.edges} emptyMessage="No structured knowledge relationships match this filter. Mnemosyne populates this map from temporal triples, episodic graph facts, and MEMORIA relationships." nodes={graph.nodes} onSelect={setSelected} selectedId={selected?.id} />
            <aside className="border-t pt-5 xl:border-l xl:border-t-0 xl:pl-6" aria-live="polite">
              {selected ? <><p className="eyebrow">Selected node</p><h2 className="mt-2 text-xl font-semibold">{selected.label}</h2><KeyValueList className="mt-4" rows={[{ label: "Connections", value: connected.length.toLocaleString() }, { label: "Occurrences", value: Number(selected.count || 0).toLocaleString() }]} /><div className="mt-5 divide-y">{connected.slice(0,10).map((edge) => <div className="py-3" key={edge.id}><div className="flex flex-wrap gap-1.5"><Badge variant="outline">{edge.predicate || edge.label || "related"}</Badge>{edge.knowledge_store ? <Badge variant="secondary">{edge.knowledge_store}</Badge> : null}</div><p className="mt-2 text-sm leading-5 text-muted-foreground">{edge.subject} → {edge.object}</p></div>)}</div></> : <><p className="eyebrow">Graph inspector</p><h2 className="mt-2 text-xl font-semibold">Nothing selected</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Select a node to inspect its connected relationships and source store.</p></>}
            </aside>
          </div>
        </TabsContent>
        <TabsContent className="pt-6" value="facts">
          <Table>
            <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Predicate</TableHead><TableHead>Object</TableHead><TableHead>Confidence</TableHead><TableHead>Store</TableHead><TableHead>Source</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
            <TableBody>{triples.map((triple, index) => <TableRow key={triple.id || index}><TableCell className="max-w-56 font-medium">{triple.subject || "—"}</TableCell><TableCell><Badge variant="outline">{triple.predicate || "—"}</Badge></TableCell><TableCell className="max-w-72 whitespace-normal">{triple.object || "—"}</TableCell><TableCell className="tabular-nums">{triple.confidence === undefined || triple.confidence === null ? "—" : Number(triple.confidence).toFixed(2)}</TableCell><TableCell>{triple.knowledge_store ? <Badge variant="secondary">{triple.knowledge_store}</Badge> : "—"}</TableCell><TableCell>{triple.source || "—"}</TableCell><TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(triple.created_at || triple.valid_from)}</TableCell></TableRow>)}</TableBody>
          </Table>
          {!loading && !triples.length ? <p className="py-8 text-sm text-muted-foreground">No knowledge triples match this filter.</p> : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
