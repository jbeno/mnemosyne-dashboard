import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { ActivityPoint } from "@/lib/types"

const activityConfig = {
  memories: { label: "Memories", color: "var(--chart-1)" },
  triples: { label: "Knowledge triples", color: "var(--chart-2)" },
  consolidations: { label: "Consolidations", color: "var(--chart-3)" },
} satisfies ChartConfig

export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  return (
    <>
      <ChartContainer className="h-80" config={activityConfig}>
        <LineChart accessibilityLayer data={data} margin={{ left: -16, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis axisLine={false} dataKey="date" minTickGap={28} tickFormatter={shortDate} tickLine={false} tickMargin={10} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={42} />
          <Tooltip content={<ChartTooltipContent config={activityConfig} labelFormatter={longDate} />} cursor={false} />
          <Line dataKey="memories" dot={false} stroke="var(--color-memories)" strokeWidth={2.5} type="monotone" />
          <Line dataKey="triples" dot={false} stroke="var(--color-triples)" strokeWidth={2} type="monotone" />
          <Line dataKey="consolidations" dot={false} stroke="var(--color-consolidations)" strokeWidth={2} type="monotone" />
        </LineChart>
      </ChartContainer>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Activity chart legend">
        {Object.entries(activityConfig).map(([key, item]) => (
          <span className="flex items-center gap-2" key={key}><span className="h-0.5 w-4" style={{ background: item.color }} />{item.label}</span>
        ))}
      </div>
    </>
  )
}

export type CategoryDatum = { description?: string; label: string; value: number; fill?: string }

export function CategoryBarChart({ data, label }: { data: CategoryDatum[]; label: string }) {
  const config = { value: { label, color: "var(--chart-1)" } } satisfies ChartConfig
  const height = Math.max(180, data.length * 46)
  return (
    <ChartContainer className="h-auto" config={config} height={height}>
      <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 4, right: 24 }}>
        <CartesianGrid horizontal={false} />
        <XAxis allowDecimals={false} axisLine={false} tickLine={false} type="number" />
        <YAxis axisLine={false} dataKey="label" tickLine={false} type="category" width={112} />
        <Tooltip content={<ChartTooltipContent config={config} />} cursor={{ fill: "var(--muted)", opacity: 0.35 }} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]}>
          <LabelList className="fill-foreground text-xs font-medium" dataKey="value" position="right" />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
}

function longDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
}
