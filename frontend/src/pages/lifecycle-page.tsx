import { useEffect, useState } from "react"

import { ChartPanel } from "@/components/chart-panel"
import { CategoryBarChart } from "@/components/dashboard-charts"
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
      <MetricStrip metrics={(data?.cards || []).map((card) => ({ description: card.description, label: card.title, value: card.count }))} />
      <div className="grid gap-x-10 gap-y-12 xl:grid-cols-2">
        <ChartPanel className="border-t-0 pt-0" description="Current episodic memories retained at each lifecycle weight." help="Hot, warm, and cold are normal retention tiers, not health states." title="Tier distribution">
          <CategoryBarChart data={(data?.cards || []).filter((card) => ["hot", "warm", "cold"].includes(card.key)).map((card) => ({ description: card.description, label: card.title.replace(" memories", ""), value: card.count }))} label="Memories" />
        </ChartPanel>
        <ChartPanel className="border-t-0 pt-0" description="Queues that may warrant lifecycle review or maintenance." help="Due transitions are actionable maintenance signals. Recently degraded and high-importance degraded are inspection views, not errors." title="Lifecycle attention">
          <CategoryBarChart data={(data?.cards || []).filter((card) => !["hot", "warm", "cold"].includes(card.key)).map((card) => ({ description: card.description, label: card.title, value: card.count }))} label="Memories" />
        </ChartPanel>
      </div>
      <section aria-labelledby="lifecycle-policy">
        <h2 className="text-lg font-semibold" id="lifecycle-policy">Lifecycle policy</h2>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <PolicyValue label="Warm threshold" value={thresholds ? `${thresholds.tier2_days} days` : "—"} />
          <PolicyValue label="Cold threshold" value={thresholds ? `${thresholds.tier3_days} days` : "—"} />
          <PolicyValue label="Tier weights" value={thresholds ? `Hot ×${Number(thresholds.weights['1'] || 1).toFixed(2)} · Warm ×${Number(thresholds.weights['2'] || 0.5).toFixed(2)} · Cold ×${Number(thresholds.weights['3'] || 0.25).toFixed(2)}` : "—"} />
          <PolicyValue label="Operation" value="Read-only inspection" />
        </div>
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
