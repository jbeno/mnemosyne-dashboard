import { useEffect, useState } from "react"

import { MemoryList } from "@/components/memory-list"
import { MetricStrip } from "@/components/metric-strip"
import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dashboardApi } from "@/lib/api"
import type { LifecycleData } from "@/lib/types"

export function LifecyclePage({ databaseKey }: { databaseKey: string }) {
  const [data, setData] = useState<LifecycleData | null>(null)
  const [activeQueue, setActiveQueue] = useState("hot")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setActiveQueue("hot")
    void dashboardApi.lifecycle()
      .then(setData)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Lifecycle data could not be loaded."))
      .finally(() => setLoading(false))
  }, [databaseKey])

  const thresholds = data?.thresholds
  return (
    <div className="space-y-8">
      <PageHeader
        description="Understand how episodic memories move from full-detail hot storage into compressed warm and cold tiers."
        eyebrow="Memory"
        title="Lifecycle"
      />
      <MetricStrip metrics={(data?.cards || []).map((card) => ({ label: card.title, value: card.count }))} />
      <section className="grid gap-4 border-y py-5 text-sm sm:grid-cols-2 lg:grid-cols-4" aria-label="Lifecycle policy">
        <PolicyValue label="Warm threshold" value={thresholds ? `${thresholds.tier2_days} days` : "—"} />
        <PolicyValue label="Cold threshold" value={thresholds ? `${thresholds.tier3_days} days` : "—"} />
        <PolicyValue label="Tier weights" value={thresholds ? `Hot ×${Number(thresholds.weights['1'] || 1).toFixed(2)} · Warm ×${Number(thresholds.weights['2'] || 0.5).toFixed(2)} · Cold ×${Number(thresholds.weights['3'] || 0.25).toFixed(2)}` : "—"} />
        <PolicyValue label="Operation" value="Read-only inspection" />
      </section>
      {error ? <p className="border-l-2 border-destructive px-4 py-2 text-sm" role="alert">{error}</p> : null}
      <Tabs onValueChange={setActiveQueue} value={activeQueue}>
        <TabsList aria-label="Lifecycle queue">
          {(data?.cards || []).map((card) => <TabsTrigger key={card.key} value={card.key}>{card.title}</TabsTrigger>)}
        </TabsList>
        {(data?.cards || []).map((card) => {
          const queue = data?.queues[card.key]
          return (
            <TabsContent className="pt-6" key={card.key} value={card.key}>
              <div className="mb-6 max-w-3xl border-l-2 border-primary/45 pl-5">
                <h2 className="text-lg font-semibold">{queue?.title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{queue?.description}</p>
              </div>
              <MemoryList empty={loading ? "Loading lifecycle queue…" : "No memories in this lifecycle queue."} items={queue?.items} limit={queue?.items.length || 1} title="Memories" />
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}

function PolicyValue({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>
}
