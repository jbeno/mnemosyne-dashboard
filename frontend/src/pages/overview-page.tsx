import { BreakdownList } from "@/components/breakdown-list"
import { MetricStrip } from "@/components/metric-strip"
import { PageHeader } from "@/components/page-header"
import type { Stats } from "@/lib/types"

export function OverviewPage({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  const working = stats?.working_memory?.unconsolidated ?? stats?.counts.working_memory
  const metrics = [
    { label: "Working active", value: working },
    { label: "Episodic", value: stats?.counts.episodic_memory },
    { label: "Review candidates", value: stats?.review?.active_candidates ?? 0 },
    { label: "Degraded", value: stats?.degradation?.degraded ?? 0 },
    { label: "Triples", value: stats?.counts.triples },
    { label: "Consolidations", value: stats?.counts.consolidation_log },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        description="A current read on retained memory, trust, lifecycle health, and consolidation activity."
        eyebrow="Memory system"
        title="Overview"
      />

      <section aria-label="Memory totals" aria-busy={loading}>
        <MetricStrip metrics={metrics} />
      </section>

      <section className="grid gap-x-8 gap-y-7 border-b pb-8 md:grid-cols-2 xl:grid-cols-5" aria-label="Memory breakdowns">
        <BreakdownList
          rows={[
            { label: "Unconsolidated", count: working || 0 },
            { label: "Consolidated", count: stats?.working_memory?.consolidated || 0 },
            { label: "Retained total", count: stats?.working_memory?.total ?? stats?.counts.working_memory ?? 0 },
          ]}
          title="Working memory"
        />
        <BreakdownList field="veracity" rows={stats?.by_veracity} title="Trust mix" />
        <BreakdownList field="degradation_label" rows={stats?.by_degradation} title="Lifecycle" />
        <BreakdownList field="source" rows={stats?.by_source} title="Sources" />
        <BreakdownList field="scope" rows={stats?.by_scope} title="Scopes" />
      </section>

      <section className="max-w-2xl" aria-label="Top sessions">
        <BreakdownList field="session_id" limit={10} rows={stats?.by_session} title="Top sessions" />
      </section>
    </div>
  )
}
