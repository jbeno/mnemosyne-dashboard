import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function KeyValueList({ className, rows }: { className?: string; rows: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className={cn("divide-y", className)}>
      {rows.map((row) => (
        <div className="grid gap-1 py-3 text-sm sm:grid-cols-[minmax(8rem,0.38fr)_minmax(0,1fr)] sm:gap-6" key={row.label}>
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0 break-words font-medium sm:text-right">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
