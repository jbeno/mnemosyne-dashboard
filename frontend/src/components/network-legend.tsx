import { List } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { networkLegendItems, type NetworkColorMode } from "@/lib/network-appearance"
import type { NetworkMode } from "@/lib/network-layout"
import type { GraphNode } from "@/lib/types"

export function NetworkLegend({ colorMode, mode, nodes, onColorModeChange }: { colorMode: NetworkColorMode; mode: NetworkMode; nodes: GraphNode[]; onColorModeChange?: (mode: NetworkColorMode) => void }) {
  const [open, setOpen] = useState(false)
  const items = useMemo(() => networkLegendItems(mode, nodes, colorMode), [colorMode, mode, nodes])

  return <div className="absolute bottom-3 left-3 z-[9]">
    {open ? <div className="absolute bottom-full mb-2 max-h-72 w-72 overflow-auto rounded-lg border bg-popover/96 p-3 shadow-xl backdrop-blur-xl">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Map legend</p>
        {onColorModeChange ? <Tabs onValueChange={(value) => onColorModeChange(value as NetworkColorMode)} value={colorMode}><TabsList aria-label="Color nodes by" size="sm" variant="default"><TabsTrigger value="type">Type</TabsTrigger><TabsTrigger value="category">{mode === "graph" ? "Source" : "Category"}</TabsTrigger></TabsList></Tabs> : null}
      </div>
      <ul className="space-y-2.5">{items.map((item) => <li className="grid grid-cols-[1rem_1fr] gap-2.5" key={item.label}>
        <span aria-hidden className={item.line ? "mt-2 h-px w-4" : "mt-1 size-2.5 rounded-full"} style={{ backgroundColor: item.color, boxShadow: item.line ? undefined : `0 0 8px ${item.color}80` }} />
        <span><span className="block text-xs font-medium text-popover-foreground">{item.label}</span><span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{item.description}</span></span>
      </li>)}</ul>
    </div> : null}
    <Button aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} graph legend`} className="h-7 gap-1.5 px-2 text-xs [&_svg]:size-3.5" onClick={() => setOpen((value) => !value)} size="sm" variant={open ? "secondary" : "outline"}><List strokeWidth={1.75} />Legend</Button>
  </div>
}
