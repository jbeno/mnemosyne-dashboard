import { BreakdownList } from "@/components/breakdown-list"
import { MemoryList } from "@/components/memory-list"
import { MetricStrip } from "@/components/metric-strip"
import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Consolidation, TodayDigest, Triple } from "@/lib/types"
import { formatDate } from "@/lib/utils"

function ActivityList({ title, items }: { title: string; items?: Array<Triple | Consolidation> }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between border-b pb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="text-xs tabular-nums text-muted-foreground">{items?.length || 0}</span>
      </div>
      {items?.length ? (
        <div className="divide-y">
          {items.slice(0, 12).map((item, index) => {
            const triple = item as Triple
            const consolidation = item as Consolidation
            const text = triple.subject
              ? `${triple.subject} — ${triple.predicate || "related to"} → ${triple.object || "unknown"}`
              : consolidation.summary || consolidation.content || "Consolidation completed"
            return (
              <article className="py-4 first:pt-1" key={item.id || `${title}-${index}`}>
                <time className="mb-2 block text-xs text-muted-foreground">
                  {formatDate(triple.created_at || triple.valid_from || consolidation.created_at || consolidation.timestamp)}
                </time>
                <p className="text-sm leading-6 text-foreground/90">{text}</p>
              </article>
            )
          })}
        </div>
      ) : (
        <p className="py-6 text-sm text-muted-foreground">No {title.toLowerCase()} today.</p>
      )}
    </section>
  )
}

export function TodayPage({ digest, loading }: { digest: TodayDigest | null; loading: boolean }) {
  const counts = digest?.counts
  const metrics = [
    { label: "Added", value: counts?.memories_added },
    { label: "Retrieved", value: counts?.memories_recalled },
    { label: "Non-stated", value: counts?.contaminated_added },
    { label: "Lifecycle changes", value: counts?.degraded_added },
    { label: "Facts", value: counts?.triples_added },
    { label: "Consolidations", value: counts?.consolidations },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        description="Memory activity recorded since local midnight, organized for a quick daily review."
        eyebrow="Daily digest"
        title="Today"
      />
      <section aria-label="Today's activity totals" aria-busy={loading}>
        <MetricStrip metrics={metrics} />
      </section>
      <section className="grid gap-x-8 gap-y-7 border-b pb-8 md:grid-cols-2 xl:grid-cols-5" aria-label="Today's breakdowns">
        <BreakdownList rows={digest?.breakdowns?.entities} title="Entities" />
        <BreakdownList rows={digest?.breakdowns?.veracity} title="Trust" />
        <BreakdownList rows={digest?.breakdowns?.degradation} title="Lifecycle" />
        <BreakdownList rows={digest?.breakdowns?.sources} title="Sources" />
        <BreakdownList rows={digest?.breakdowns?.sessions} title="Sessions" />
      </section>

      <Tabs defaultValue="added">
        <TabsList aria-label="Daily activity type">
          <TabsTrigger value="added">Added</TabsTrigger>
          <TabsTrigger value="recalled">Retrieved</TabsTrigger>
          <TabsTrigger value="facts">Facts</TabsTrigger>
          <TabsTrigger value="consolidations">Consolidations</TabsTrigger>
        </TabsList>
        <TabsContent className="pt-6" value="added">
          <MemoryList empty="No memories were added today." items={digest?.memories_added} title="Memories added" />
        </TabsContent>
        <TabsContent className="pt-6" value="recalled">
          <MemoryList empty="No memories were retrieved today." items={digest?.memories_recalled} title="Memories retrieved" />
        </TabsContent>
        <TabsContent className="pt-6" value="facts">
          <ActivityList items={digest?.triples_added} title="Facts added" />
        </TabsContent>
        <TabsContent className="pt-6" value="consolidations">
          <ActivityList items={digest?.consolidations} title="Consolidations" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
