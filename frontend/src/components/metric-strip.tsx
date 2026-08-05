import { formatNumber } from "@/lib/utils"

export type Metric = { label: string; value: number | undefined }

export function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px border-y bg-border lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric) => (
        <div className="bg-background px-2 py-5 sm:px-5" key={metric.label}>
          <dd className="font-display text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
            {metric.value === undefined ? "—" : formatNumber(metric.value)}
          </dd>
          <dt className="mt-1 text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">
            {metric.label}
          </dt>
        </div>
      ))}
    </dl>
  )
}
