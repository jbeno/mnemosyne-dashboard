import type { CountRow } from "@/lib/types"
import { formatNumber, shortId } from "@/lib/utils"

export function BreakdownList({
  title,
  rows,
  field = "label",
  limit = 8,
}: {
  title: string
  rows: CountRow[] | undefined
  field?: keyof CountRow
  limit?: number
}) {
  const visible = (rows || []).slice(0, limit)
  return (
    <section className="min-w-0 py-1" aria-labelledby={`breakdown-${title.replaceAll(" ", "-")}`}>
      <h2
        className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
        id={`breakdown-${title.replaceAll(" ", "-")}`}
      >
        {title}
      </h2>
      {visible.length ? (
        <dl className="divide-y">
          {visible.map((row, index) => {
            const raw = String(row[field] ?? row.label ?? "Unknown")
            return (
              <div className="flex min-w-0 items-center justify-between gap-4 py-2.5 text-sm" key={`${raw}-${index}`}>
                <dt className="truncate text-muted-foreground" title={raw}>
                  {field === "session_id" ? shortId(raw, 28) : raw}
                </dt>
                <dd className="font-semibold tabular-nums">{formatNumber(row.count)}</dd>
              </div>
            )
          })}
        </dl>
      ) : (
        <p className="py-3 text-sm text-muted-foreground">No data yet.</p>
      )}
    </section>
  )
}
