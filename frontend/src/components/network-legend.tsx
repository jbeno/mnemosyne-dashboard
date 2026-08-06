import { List } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { networkColorModeLabel, networkLegendItems, type NetworkColorMode } from "@/lib/network-appearance"
import type { NetworkMode } from "@/lib/network-layout"
import type { GraphNode } from "@/lib/types"

export function NetworkLegend({ colorMode, mode, nodes }: { colorMode: NetworkColorMode; mode: NetworkMode; nodes: GraphNode[] }) {
  const [open, setOpen] = useState(false)
  const items = useMemo(() => networkLegendItems(mode, nodes, colorMode), [colorMode, mode, nodes])

  return <div className="absolute bottom-3 left-3 z-[9]">
    {open ? <div className="absolute bottom-full mb-2 max-h-72 w-72 overflow-auto rounded-lg border bg-popover/96 p-3 shadow-xl backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-semibold">Map legend</p><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{networkColorModeLabel(mode, colorMode)}</p></div>
      <ul className="space-y-2.5">{items.map((item) => <li className="grid grid-cols-[1rem_1fr] gap-2.5" key={item.label}>
        <span aria-hidden className={item.line ? "mt-2 h-px w-4" : "mt-1 size-2.5 rounded-full"} style={{ backgroundColor: item.color, boxShadow: item.line ? undefined : `0 0 8px ${item.color}80` }} />
        <span><span className="block text-xs font-medium text-popover-foreground">{item.label}</span><span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{item.description}</span></span>
      </li>)}</ul>
    </div> : null}
    <Button aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} graph legend`} onClick={() => setOpen((value) => !value)} size="sm" variant={open ? "secondary" : "outline"}><List />Legend</Button>
  </div>
}
