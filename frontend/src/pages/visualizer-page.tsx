import { useEffect, useMemo, useState } from "react"
import { Box, Map as MapIcon } from "lucide-react"

import { ChartPanel } from "@/components/chart-panel"
import { CategoryBarChart } from "@/components/dashboard-charts"
import { KeyValueList } from "@/components/key-value-list"
import { MetricStrip } from "@/components/metric-strip"
import { NetworkMap } from "@/components/network-map"
import { PageHeader } from "@/components/page-header"
import { ThreeNetworkMap } from "@/components/three-network-map"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dashboardApi } from "@/lib/api"
import type { NetworkColorMode } from "@/lib/network-appearance"
import type { ConstellationData, GraphNode } from "@/lib/types"
import { cn, formatDate } from "@/lib/utils"

type LinkedNode = { node: GraphNode; predicates: string[] }

export function VisualizerPage({
  databaseKey,
  initialSelectedCategory,
  initialSelectedId,
  initialSelectedKind,
  initialSelectedLabel,
}: {
  databaseKey: string
  initialSelectedCategory?: string
  initialSelectedId?: string
  initialSelectedKind?: string
  initialSelectedLabel?: string
}) {
  const [colorMode, setColorMode] = useState<NetworkColorMode>("type")
  const [dimension, setDimension] = useState<"2d" | "3d">("2d")
  const [mode, setMode] = useState<"constellation" | "neural">("constellation")
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
      .then((response) => {
        if (!active) return
        setData(response)
        const stableMatch = initialSelectedLabel
          ? response.nodes.find((node) => node.label === initialSelectedLabel
            && (!initialSelectedKind || node.kind === initialSelectedKind)
            && (!initialSelectedCategory || node.category === initialSelectedCategory))
          : null
        setSelected(stableMatch || (initialSelectedId ? response.nodes.find((node) => node.id === initialSelectedId) : null) || null)
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Visualizer data could not be loaded.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [databaseKey, initialSelectedCategory, initialSelectedId, initialSelectedKind, initialSelectedLabel])

  const connected = useMemo(() => selected ? data.edges.filter((edge) => edge.source === selected.id || edge.target === selected.id) : [], [data.edges, selected])
  const linkedNodes = useMemo<LinkedNode[]>(() => {
    if (!selected) return []
    const byId = new Map(data.nodes.map((node) => [node.id, node]))
    const links = new Map<string, Set<string>>()
    for (const edge of connected) {
      const otherId = edge.source === selected.id ? edge.target : edge.source
      if (!byId.has(otherId)) continue
      const predicates = links.get(otherId) || new Set<string>()
      predicates.add(edge.predicate || edge.label || "related")
      links.set(otherId, predicates)
    }
    return [...links.entries()]
      .map(([id, predicates]) => ({ node: byId.get(id)!, predicates: [...predicates] }))
      .sort((left, right) => Number(right.node.weight || right.node.count || 0) - Number(left.node.weight || left.node.count || 0) || left.node.label.localeCompare(right.node.label))
  }, [connected, data.nodes, selected])
  const memoryNodes = data.nodes.filter((node) => node.kind === "memory").length

  return (
    <div className="space-y-10" aria-busy={loading}>
      <PageHeader description="Trace relationships between retained memories and the entities they mention." eyebrow="Explore" title="Visualizer" />
      <MetricStrip metrics={[
        { description: "Entities and memory references in the current visualization snapshot.", label: "Nodes", value: data.nodes.length },
        { description: "Relationships between the loaded nodes.", label: "Links", value: data.edges.length },
        { description: "Nodes representing retained working or episodic memories.", label: "Memory nodes", value: memoryNodes },
        { description: "Dashboard categories assigned to the loaded nodes from weighted text signals.", label: "Categories", value: data.clusters.length },
      ]} />
      {error ? <p className="border-l-2 border-destructive px-4 py-2 text-sm" role="alert">{error}</p> : null}

      <div>
        <div className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <Tabs onValueChange={(value) => setMode(value as typeof mode)} value={mode}>
            <TabsList aria-label="Visualization topology"><TabsTrigger value="constellation">Constellation</TabsTrigger><TabsTrigger value="neural">Neural map</TabsTrigger></TabsList>
          </Tabs>
          <Tabs onValueChange={(value) => setDimension(value as typeof dimension)} value={dimension}>
            <div className="flex items-center gap-2 pb-2 sm:pb-0">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">View</span>
              <TabsList aria-label="Visualization dimension" variant="default"><TabsTrigger value="2d"><MapIcon />2D</TabsTrigger><TabsTrigger value="3d"><Box />3D</TabsTrigger></TabsList>
            </div>
          </Tabs>
        </div>
        <div className="grid gap-6 pt-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          {dimension === "3d" ? <ThreeNetworkMap colorMode={colorMode} edges={data.edges} fullscreenPanel={<NodeInspector connected={connected.length} linkedNodes={linkedNodes} node={selected} onSelect={setSelected} />} mode={mode} nodes={data.nodes} onClearSelection={() => setSelected(null)} onColorModeChange={setColorMode} onSelect={setSelected} selectedId={selected?.id} showEdgeLabels /> : <NetworkMap colorMode={colorMode} edges={data.edges} fullscreenPanel={<NodeInspector connected={connected.length} linkedNodes={linkedNodes} node={selected} onSelect={setSelected} />} mode={mode} nodes={data.nodes} onClearSelection={() => setSelected(null)} onColorModeChange={setColorMode} onSelect={setSelected} selectedId={selected?.id} showEdgeLabels />}
          <NodeInspector className="border-t pt-5 xl:border-l xl:border-t-0 xl:pl-6" connected={connected.length} linkedNodes={linkedNodes} node={selected} onSelect={setSelected} />
        </div>
      </div>

      <ChartPanel description="Dashboard categories assigned across the loaded visualization snapshot." help="Categories come from a fixed dashboard taxonomy and weighted text signals; they are not durable classifications written back to memory." title="Category distribution">
        <CategoryBarChart data={data.clusters.slice(0, 12).map((row) => ({ label: row.label, value: row.count }))} label="Nodes" />
      </ChartPanel>
    </div>
  )
}

function NodeInspector({ className, connected, linkedNodes, node, onSelect }: { className?: string; connected: number; linkedNodes: LinkedNode[]; node: GraphNode | null; onSelect: (node: GraphNode) => void }) {
  return <aside className={cn(className)} aria-live="polite">{node ? <><p className="eyebrow">Selected node</p><h2 className="mt-2 break-words text-xl font-semibold">{node.label}</h2><div className="mt-3 flex flex-wrap gap-1.5"><Badge variant="outline">{node.kind || "entity"}</Badge>{node.category ? <Badge variant="secondary">{node.category}</Badge> : null}</div>{node.preview ? <p className="mt-4 break-words text-sm leading-6 text-muted-foreground">{node.preview}</p> : null}<KeyValueList className="mt-4" rows={[{ label: "Connections", value: connected.toLocaleString() }, { label: "Occurrences", value: Number(node.count || 0).toLocaleString() }, { label: "Weight", value: Number(node.weight || 0).toFixed(2) }, { label: "Last seen", value: formatDate(node.last_seen) }]} />{linkedNodes.length ? <div className="mt-6"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Linked nodes</h3><span className="text-xs tabular-nums text-muted-foreground">{linkedNodes.length}</span></div><ul className="mt-2 divide-y border-y">{linkedNodes.slice(0, 12).map((linked) => <li key={linked.node.id}><button className="group flex w-full items-start justify-between gap-3 py-3 text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onSelect(linked.node)} type="button"><span className="min-w-0"><span className="block truncate text-sm font-medium">{linked.node.label}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{linked.predicates.join(" · ")}</span></span><span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-muted-foreground group-hover:text-primary">{linked.node.kind || "entity"}</span></button></li>)}</ul>{linkedNodes.length > 12 ? <p className="mt-2 text-xs text-muted-foreground">{linkedNodes.length - 12} more linked nodes are available in the map.</p> : null}</div> : null}</> : <><p className="eyebrow">Node inspector</p><h2 className="mt-2 text-xl font-semibold">Explore the map</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Select a node to see its type, category, relationship count, source preview, and linked nodes.</p></>}</aside>
}
