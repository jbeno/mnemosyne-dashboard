import { InfoHint } from "@/components/info-hint"
import { formatNumber } from "@/lib/utils"

export type Metric = { description?: string; label: string; value: number | undefined }

export function MetricStrip({ metrics }: { metrics: Metric[] }) {
  const columns = metrics.length <= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3 xl:grid-cols-6"

  return (
    <dl className={`grid grid-cols-2 gap-px border-y bg-border ${columns}`}>
      {metrics.map((metric) => (
        <div className="bg-background px-2 py-5 sm:px-5" key={metric.label}>
          <dd className="font-display text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
            {metric.value === undefined ? "—" : formatNumber(metric.value)}
          </dd>
          <dt className="mt-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">
            <span>{metric.label}</span>
            {metric.description ? <InfoHint className="-my-1" label={metric.label} text={metric.description} /> : null}
          </dt>
        </div>
      ))}
    </dl>
  )
}
