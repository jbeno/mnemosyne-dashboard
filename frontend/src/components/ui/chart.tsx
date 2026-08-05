import type { CSSProperties, ReactElement } from "react"
import { ResponsiveContainer, type TooltipContentProps } from "recharts"

import { cn } from "@/lib/utils"

export type ChartConfig = Record<string, { label: string; color: string }>

export function ChartContainer({
  children,
  className,
  config,
  height,
}: {
  children: ReactElement
  className?: string
  config: ChartConfig
  height?: number
}) {
  const style = {
    ...Object.fromEntries(
    Object.entries(config).map(([key, item]) => [`--color-${key}`, item.color]),
    ),
    ...(height ? { height } : {}),
  } as CSSProperties

  return (
    <div
      className={cn(
        "h-72 w-full text-xs text-muted-foreground [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/60 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
        className,
      )}
      style={style}
    >
      <ResponsiveContainer height="100%" width="100%">{children}</ResponsiveContainer>
    </div>
  )
}

export function ChartTooltipContent({
  active,
  config,
  label,
  labelFormatter,
  payload,
}: Omit<Partial<TooltipContentProps<number, string>>, "labelFormatter"> & {
  config: ChartConfig
  labelFormatter?: (label: string) => string
}) {
  if (!active || !payload?.length) return null
  const displayLabel = labelFormatter ? labelFormatter(String(label || "")) : String(label || "")
  const datumDescription = (payload[0]?.payload as { description?: string } | undefined)?.description

  return (
    <div className="min-w-36 rounded-md border bg-popover/95 px-3 py-2 text-xs text-popover-foreground shadow-xl backdrop-blur">
      {displayLabel ? <p className="mb-2 font-medium">{displayLabel}</p> : null}
      <div className="space-y-1.5">
        {payload.map((entry) => {
          const key = String(entry.dataKey || entry.name || "value")
          const item = config[key]
          return (
            <div className="flex items-center justify-between gap-6" key={key}>
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="size-2 rounded-[2px]" style={{ background: item?.color || entry.color }} />
                {item?.label || entry.name || key}
              </span>
              <span className="font-medium tabular-nums">{Number(entry.value || 0).toLocaleString()}</span>
            </div>
          )
        })}
      </div>
      {datumDescription ? <p className="mt-2 max-w-64 border-t pt-2 leading-5 text-muted-foreground">{datumDescription}</p> : null}
    </div>
  )
}
