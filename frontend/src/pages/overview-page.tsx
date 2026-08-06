import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, CalendarDays } from "lucide-react"

import { ChartPanel } from "@/components/chart-panel"
import { ActivityChart, CategoryBarChart, type CategoryDatum } from "@/components/dashboard-charts"
import { MetricStrip } from "@/components/metric-strip"
import { NetworkMap } from "@/components/network-map"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { dashboardApi } from "@/lib/api"
import type { ActivitySeries, ConstellationData, CountRow, GraphNode, Stats } from "@/lib/types"

export function OverviewPage({
  databaseKey,
  stats,
  loading,
  onOpenVisualizer,
}: {
  databaseKey: string
  stats: Stats | null
  loading: boolean
  onOpenVisualizer: (node?: Pick<GraphNode, "id" | "label" | "kind" | "category">) => void
}) {
  const [days, setDays] = useState(30)
  const [activity, setActivity] = useState<ActivitySeries | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)
  const [constellation, setConstellation] = useState<ConstellationData>({ nodes: [], edges: [], clusters: [] })
  const [constellationLoading, setConstellationLoading] = useState(true)
  const working = stats?.working_memory?.unconsolidated ?? stats?.counts.working_memory ?? 0
  const inventory: CategoryDatum[] = [
    { description: "Short-term records that have not yet been consolidated into durable memory.", label: "Working", value: working },
    { description: "Durable summaries retained after consolidation.", label: "Episodic", value: stats?.counts.episodic_memory || 0 },
    { description: "Structured subject-predicate-object relationships across temporal triples, episodic facts, and MEMORIA.", label: "Knowledge relations", value: stats?.counts.triples || 0 },
    { description: "Completed consolidation operations recorded by Mnemosyne.", label: "Consolidations", value: stats?.counts.consolidation_log || 0 },
  ]
  const attention: CategoryDatum[] = [
    { description: "Active, higher-importance memories whose provenance is not explicitly stated. This is a review queue, not an error count.", label: "Review", value: stats?.review?.active_candidates || 0 },
    { description: "Episodic memories that have moved through Mnemosyne's lifecycle. Degradation is intentional aging, not necessarily a fault.", label: "Degraded", value: stats?.degradation?.degraded || 0 },
    { description: "Hot memories old enough for the configured transition to the warm tier.", label: "Due warm", value: stats?.degradation?.due_tier2 || 0 },
    { description: "Warm memories old enough for the configured transition to the cold tier.", label: "Due cold", value: stats?.degradation?.due_tier3 || 0 },
  ]
  const keyMetrics = [
    { description: "Short-term records awaiting consolidation. Growth is expected; sustained growth toward the configured capacity can indicate stalled consolidation.", label: "Working active", value: working },
    { description: "Durable summaries retained after Mnemosyne consolidates short-term records.", label: "Episodic", value: stats?.counts.episodic_memory },
    { description: "Active, higher-importance memories with non-stated provenance. Review is optional unless the queue is growing or contains consequential facts.", label: "Review candidates", value: stats?.review?.active_candidates },
    { description: "Episodic memories that have aged into a lower lifecycle tier. A non-zero value is normally expected.", label: "Degraded", value: stats?.degradation?.degraded },
  ]

  useEffect(() => {
    if (!databaseKey) return
    let active = true
    setActivityLoading(true)
    void dashboardApi.activitySeries(days)
      .then((response) => { if (active) setActivity(response) })
      .catch(() => { if (active) setActivity(null) })
      .finally(() => { if (active) setActivityLoading(false) })
    return () => { active = false }
  }, [databaseKey, days])

  useEffect(() => {
    if (!databaseKey) return
    let active = true
    setConstellationLoading(true)
    void dashboardApi.constellation()
      .then((response) => { if (active) setConstellation(response) })
      .catch(() => { if (active) setConstellation({ nodes: [], edges: [], clusters: [] }) })
      .finally(() => { if (active) setConstellationLoading(false) })
    return () => { active = false }
  }, [databaseKey])

  const preview = useMemo(() => {
    const nodes = constellation.nodes.slice(0, 120)
    const ids = new Set(nodes.map((node) => node.id))
    return { nodes, edges: constellation.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)) }
  }, [constellation])

  return (
    <div className="space-y-10" aria-busy={loading || activityLoading || constellationLoading}>
      <PageHeader
        description="A current read on retained memory, trust, lifecycle health, and consolidation activity."
        divided={false}
        eyebrow="Memory system"
        title="Overview"
      />

      <section aria-label="Key memory metrics">
        <MetricStrip metrics={keyMetrics} />
      </section>

      <div className="grid gap-x-10 gap-y-12 xl:grid-cols-2">
        <ChartPanel
          actions={(
            <Select onValueChange={(value) => setDays(Number(value))} value={String(days)}>
              <SelectTrigger aria-label="Activity timeframe" className="w-48 sm:w-52">
                <CalendarDays />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          )}
          className="border-t-0 pt-0"
          description={`Daily records written across memory, knowledge, and consolidation logs during the last ${days} days.`}
          help="Spikes show write or consolidation activity, not necessarily a problem. A sustained rise in working memory without consolidations is the pattern worth investigating. The range changes this activity history; the metrics above remain a current snapshot."
          title="Memory activity"
        >
          <ActivityChart data={activity?.series || []} />
        </ChartPanel>

        <ChartPanel
          actions={<Button onClick={() => onOpenVisualizer()} size="sm" variant="ghost">Open visualizer<ArrowUpRight /></Button>}
          className="border-t-0 pt-0"
          description="Current relationships between retained memories and the entities they mention."
          help="This is a current snapshot rather than a time series. Color distinguishes retained memories from entity/topic nodes; position groups nodes by dashboard category, and size reflects weight and connectivity."
          title="Memory map"
        >
          <NetworkMap colorMode="type" edges={preview.edges} emptyMessage={constellationLoading ? "Loading the current memory map…" : "No memory relationships are available for this database."} mode="constellation" nodes={preview.nodes} onSelect={onOpenVisualizer} presentation="preview" />
        </ChartPanel>
      </div>

      <div className="grid gap-x-10 gap-y-12 xl:grid-cols-2">
        <ChartPanel description="Current retained records by storage function." help="This is the shape of the memory store. Working memory is short-lived; episodic memory and structured knowledge relations are durable forms produced by consolidation and extraction." title="System inventory">
          <CategoryBarChart data={inventory} label="Records" />
        </ChartPanel>
        <ChartPanel description="Items surfaced for optional provenance or lifecycle attention." help="These queues are advisory. Due transitions suggest maintenance work; degraded and review counts alone do not mean the memory system is unhealthy." title="Attention queues">
          <CategoryBarChart data={attention} label="Items" />
        </ChartPanel>
        <ChartPanel description="How retained memories describe the confidence of their origin." help="Unknown usually means provenance was never labeled, often for older records. Prioritize reviewing high-importance unknown or tool-derived memories rather than trying to relabel every record." title="Trust provenance">
          <CategoryBarChart data={rows(stats?.by_veracity, "veracity")} label="Memories" />
        </ChartPanel>
        <ChartPanel description="Episodic memory distribution across hot, warm, and cold tiers." help="Hot, warm, and cold are retention tiers. Movement toward colder tiers is normal aging that reduces retrieval weight; due counts indicate transitions that have not yet run." title="Lifecycle tiers">
          <CategoryBarChart data={rows(stats?.by_degradation, "degradation_label")} label="Memories" />
        </ChartPanel>
      </div>
    </div>
  )
}

function rows(items: CountRow[] | undefined, field: "veracity" | "degradation_label"): CategoryDatum[] {
  return (items || []).map((item) => {
    const rawLabel = item[field] || "Unknown"
    return {
      description: field === "veracity" ? trustDescription(rawLabel) : lifecycleDescription(rawLabel),
      label: sentenceCase(rawLabel),
      value: item.count,
    }
  })
}

function sentenceCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

function trustDescription(value: string) {
  const descriptions: Record<string, string> = {
    stated: "Information explicitly stated by the user or source.",
    unknown: "No provenance label is stored, commonly on older records. Review consequential, high-importance items first.",
    inferred: "A conclusion inferred by the agent rather than directly stated.",
    imported: "Information imported from another store or source.",
    tool: "Information produced from a tool result and worth rechecking when consequential.",
  }
  return descriptions[value.toLowerCase()] || "A stored provenance category used when weighting retrieval confidence."
}

function lifecycleDescription(value: string) {
  const descriptions: Record<string, string> = {
    hot: "Recent or high-priority episodic memory with full retrieval weight.",
    warm: "Older episodic memory retained with reduced retrieval weight.",
    cold: "Long-term episodic memory retained with the lowest retrieval weight.",
  }
  return descriptions[value.toLowerCase()] || "A Mnemosyne lifecycle tier used to age retained episodic memory."
}
