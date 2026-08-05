import { useEffect, useState } from "react"

import { ChartPanel } from "@/components/chart-panel"
import { CategoryBarChart } from "@/components/dashboard-charts"
import { MetricStrip } from "@/components/metric-strip"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dashboardApi } from "@/lib/api"
import type { ContextSignal, InferredProfileData, PatternItem, PatternsData } from "@/lib/types"
import { formatDate } from "@/lib/utils"

export function ContextBankPage({ databaseKey }: { databaseKey: string }) {
  const [patterns, setPatterns] = useState<PatternsData | null>(null)
  const [profile, setProfile] = useState<InferredProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void Promise.all([dashboardApi.patterns(), dashboardApi.inferredProfile()])
      .then(([nextPatterns, nextProfile]) => { if (active) { setPatterns(nextPatterns); setProfile(nextProfile) } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Context Bank could not be loaded.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [databaseKey])

  const metrics = [
    { description: "Active memories inspected for recurring patterns.", label: "Memories scanned", value: patterns?.summary.indexed_memories },
    { description: "Knowledge triples inspected alongside active memories.", label: "Triples scanned", value: patterns?.summary.indexed_triples },
    { description: "Patterns returned by Mnemosyne's PatternDetector at the configured confidence floor.", label: "Patterns found", value: patterns?.summary.patterns_found },
    { description: "Inferred context signals whose confidence or short-term character suggests optional review.", label: "Review signals", value: profile?.summary.needs_review },
  ]

  return (
    <div className="space-y-10" aria-busy={loading}>
      <PageHeader description="Understand the themes, origins, and inferred context currently available to Hermes agents." eyebrow="Knowledge" title="Context bank" />
      <MetricStrip metrics={metrics} />
      {error ? <p className="border-l-2 border-destructive px-4 py-2 text-sm" role="alert">{error}</p> : null}

      <div className="grid gap-x-10 gap-y-12 xl:grid-cols-2">
        <ChartPanel className="border-t-0 pt-0" description="Dashboard taxonomy across active memories and knowledge triples." help="Domains are descriptive groupings used for navigation and summary; they do not alter retrieval." title="Context domains">
          <CategoryBarChart data={chartRows(patterns?.context_domains)} label="Signals" />
        </ChartPanel>
        <ChartPanel className="border-t-0 pt-0" description="Where indexed context entered the memory system." help="Origins distinguish direct memory, knowledge graph, agent inference, migrations, and other extraction paths." title="Origins">
          <CategoryBarChart data={chartRows(patterns?.origins)} label="Signals" />
        </ChartPanel>
        <ChartPanel description="Functional type assigned to indexed context." help="Memory types are dashboard interpretations such as facts, preferences, relationships, and project notes." title="Memory types">
          <CategoryBarChart data={chartRows(patterns?.memory_types)} label="Signals" />
        </ChartPanel>
        <ChartPanel description="Highest-volume inferred context categories." help="These counts summarize the currently indexed context bank; individual signals remain read-only." title="Inferred context mix">
          <CategoryBarChart data={(profile?.summary.types || []).map((row) => ({ label: row.label || "Other", value: row.count }))} label="Signals" />
        </ChartPanel>
      </div>

      <section aria-labelledby="detected-patterns">
        <div className="mb-5">
          <h2 className="text-lg font-semibold" id="detected-patterns">Detected patterns</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Read-only PatternDetector output, grouped by the kind of recurrence it found.</p>
        </div>
        <Tabs defaultValue="content">
          <TabsList aria-label="Pattern type">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="temporal">Temporal</TabsTrigger>
            <TabsTrigger value="sequence">Sequence</TabsTrigger>
          </TabsList>
          <TabsContent className="pt-6" value="content"><PatternList items={patterns?.content_patterns} /></TabsContent>
          <TabsContent className="pt-6" value="temporal"><PatternList items={patterns?.temporal_patterns} /></TabsContent>
          <TabsContent className="pt-6" value="sequence"><PatternList items={patterns?.sequence_patterns} /></TabsContent>
        </Tabs>
      </section>

      <section aria-labelledby="inferred-context">
        <div className="mb-5">
          <h2 className="text-lg font-semibold" id="inferred-context">Inferred context</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">The most important active signals in each context domain. “Needs review” is advisory, not an error.</p>
        </div>
        <div className="grid min-w-0 gap-x-10 gap-y-8 xl:grid-cols-2">
          {(profile?.sections || []).map((section) => (
            <section className="min-w-0 border-t pt-5" key={section.name}>
              <div className="mb-2 flex items-baseline justify-between gap-4"><h3 className="font-semibold">{section.name}</h3><span className="text-xs tabular-nums text-muted-foreground">{section.count}</span></div>
              <div className="divide-y">{section.items.map((item, index) => <ContextRow item={item} key={`${item.kind}-${item.timestamp}-${index}`} />)}</div>
            </section>
          ))}
        </div>
        {!loading && !profile?.sections.length ? <p className="py-8 text-sm text-muted-foreground">No inferred context is available yet.</p> : null}
      </section>
    </div>
  )
}

function PatternList({ items }: { items: PatternItem[] | undefined }) {
  if (!items?.length) return <p className="py-6 text-sm text-muted-foreground">No patterns detected in this category.</p>
  return <div className="divide-y">{items.map((item, index) => <div className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={`${item.label}-${index}`}><div><p className="font-medium">{item.label}</p>{item.pattern_type ? <p className="mt-1 text-xs text-muted-foreground">{item.pattern_type.replaceAll("_", " ")}</p> : null}</div><div className="flex gap-2"><Badge variant="outline">{item.count.toLocaleString()}</Badge>{item.confidence !== undefined ? <Badge variant="secondary">{Math.round(item.confidence * 100)}% confidence</Badge> : null}</div></div>)}</div>
}

function ContextRow({ item }: { item: ContextSignal }) {
  return (
    <article className="py-4">
      <div className="flex flex-wrap gap-1.5"><Badge variant="outline">{item.context_type}</Badge><Badge variant={item.needs_review ? "secondary" : "ghost"}>{item.confidence_label}</Badge>{item.sensitive ? <Badge variant="outline">Sensitive</Badge> : null}</div>
      <p className="mt-2 break-words text-sm leading-6 text-foreground/90">{item.label}</p>
      <div className="mt-2 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="break-all">{item.source || item.kind}</span>{item.timestamp ? <time>{formatDate(item.timestamp)}</time> : null}</div>
    </article>
  )
}

function chartRows(items: PatternItem[] | undefined) {
  return (items || []).map((item) => ({ description: item.confidence !== undefined ? `${Math.round(item.confidence * 100)}% confidence` : undefined, label: item.label, value: item.count }))
}
