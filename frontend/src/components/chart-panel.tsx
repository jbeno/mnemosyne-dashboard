import type { ReactNode } from "react"

import { InfoHint } from "@/components/info-hint"
import { cn } from "@/lib/utils"

export function ChartPanel({
  actions,
  children,
  className,
  description,
  help,
  title,
}: {
  actions?: ReactNode
  children: ReactNode
  className?: string
  description?: string
  help?: string
  title: string
}) {
  return (
    <section className={cn("border-t pt-5", className)} aria-labelledby={`chart-${title.replaceAll(" ", "-").toLowerCase()}`}>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold" id={`chart-${title.replaceAll(" ", "-").toLowerCase()}`}>{title}</h2>
            {help ? <InfoHint label={title} text={help} /> : null}
          </div>
          {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}
