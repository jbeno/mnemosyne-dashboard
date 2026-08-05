import { useEffect, useMemo, useState } from "react"

import { ChartPanel } from "@/components/chart-panel"
import { CategoryBarChart } from "@/components/dashboard-charts"
import { KeyValueList } from "@/components/key-value-list"
import { MetricStrip } from "@/components/metric-strip"
import { NetworkMap } from "@/components/network-map"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dashboardApi } from "@/lib/api"
import type { ConstellationData, GraphNode } from "@/lib/types"
import { formatDate } from "@/lib/utils"

export function VisualizerPage({ databaseKey }: { databaseKey: string }) {
  const [data, setData] = useState<ConstellationData>({ nodes: [], edges: [], clusters: [] })
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setSelected(null)
    void dashboardApi.constellation()
      .then((response) => { if (active) setData(response) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Visualizer data could not be loaded.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [databaseKey])

  const connected = useMemo(() => selected ? data.edges.filter((edge) => edge.source === selected.id || edge.target === selected.id) : [], [data.edges, selected])
  const memoryNodes = data.nodes.filter((node) => node.kind === "memory").length

  return (
    <div className="space-y-10" aria-busy={loading}>
      <PageHeader description="Trace relationships between retained memories and the entities they mention." eyebrow="Explore" title="Visualizer" />
      <MetricStrip metrics={[
        { description: "Entities and memory references in the current visualization snapshot.", label: "Nodes", value: data.nodes.length },
        { description: "Relationships between the loaded nodes.", label: "Links", value: data.edges.length },
        { description: "Nodes representing retained working or episodic memories.", label: "Memory nodes", value: memoryNodes },
        { description: "Semantic categories inferred for the loaded nodes.", label: "Clusters", value: data.clusters.length },
      ]} />
      {error ? <p className="border-l-2 border-destructive px-4 py-2 text-sm" role="alert">{error}</p> : null}

      <Tabs defaultValue="constellation">
        <TabsList aria-label="Visualization layout"><TabsTrigger value="constellation">Constellation</TabsTrigger><TabsTrigger value="neural">Neural map</TabsTrigger></TabsList>
        {(["constellation", "neural"] as const).map((mode) => <TabsContent className="pt-6" key={mode} value={mode}><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]"><NetworkMap edges={data.edges} mode={mode} nodes={data.nodes} onSelect={setSelected} selectedId={selected?.id} /><NodeInspector connected={connected.length} node={selected} /></div></TabsContent>)}
      </Tabs>

      <ChartPanel description="Semantic grouping across the loaded visualization snapshot." help="Clusters are inferred from text content for orientation; they are not durable classifications written back to memory." title="Cluster distribution">
        <CategoryBarChart data={data.clusters.slice(0, 12).map((row) => ({ label: row.label, value: row.count }))} label="Nodes" />
      </ChartPanel>
    </div>
  )
}

function NodeInspector({ connected, node }: { connected: number; node: GraphNode | null }) {
  return <aside className="border-t pt-5 xl:border-l xl:border-t-0 xl:pl-6" aria-live="polite">{node ? <><p className="eyebrow">Selected node</p><h2 className="mt-2 text-xl font-semibold">{node.label}</h2><div className="mt-3 flex flex-wrap gap-1.5"><Badge variant="outline">{node.kind || "entity"}</Badge>{node.category ? <Badge variant="secondary">{node.category}</Badge> : null}</div>{node.preview ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{node.preview}</p> : null}<KeyValueList className="mt-4" rows={[{ label: "Connections", value: connected.toLocaleString() }, { label: "Occurrences", value: Number(node.count || 0).toLocaleString() }, { label: "Weight", value: Number(node.weight || 0).toFixed(2) }, { label: "Last seen", value: formatDate(node.last_seen) }]} /></> : <><p className="eyebrow">Node inspector</p><h2 className="mt-2 text-xl font-semibold">Explore the map</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Select a node to see its type, category, relationship count, and source preview.</p></>}</aside>
}
