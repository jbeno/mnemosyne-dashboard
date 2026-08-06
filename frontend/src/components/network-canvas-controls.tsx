import { type ReactElement, type ReactNode, useEffect, useRef, useState } from "react"
import { Box, Map as MapIcon, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type NetworkDimension = "2d" | "3d"

export function NetworkDimensionTabs({ dimension, onChange }: { dimension: NetworkDimension; onChange: (dimension: NetworkDimension) => void }) {
  return (
    <Tabs onValueChange={(value) => onChange(value as NetworkDimension)} value={dimension}>
      <TabsList aria-label="Visualization dimension" className="h-8 border bg-background/90 shadow-sm backdrop-blur" variant="default">
        <TabsTrigger aria-label="Show 2D map" className="gap-1 px-2 text-xs" value="2d"><MapIcon className="size-4" strokeWidth={1.75} />2D</TabsTrigger>
        <TabsTrigger aria-label="Show 3D map" className="gap-1 px-2 text-xs" value="3d"><Box className="size-4" strokeWidth={1.75} />3D</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export function CanvasTooltip({ children, label, side = "bottom" }: { children: ReactElement; label: string; side?: "bottom" | "left" | "right" | "top" }) {
  return <Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent side={side}>{label}</TooltipContent></Tooltip>
}

export function FullscreenInspectorPanel({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="absolute inset-x-4 bottom-4 z-20 max-h-[44vh] overflow-auto rounded-lg border bg-background/94 p-5 pt-12 shadow-2xl backdrop-blur-xl md:inset-y-16 md:left-auto md:w-[23rem] md:max-h-none">
      <CanvasTooltip label="Close node inspector" side="left"><Button aria-label="Close node inspector" className="absolute right-3 top-3 size-8" onClick={onClose} size="icon" variant="ghost"><X /></Button></CanvasTooltip>
      {children}
    </div>
  )
}

export function NetworkSearchControl({ className, matchCount, onChange, query }: { className?: string; matchCount: number; onChange: (query: string) => void; query: string }) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  return (
    <div className={cn("relative", className)}>
      <CanvasTooltip label="Search nodes"><Button aria-expanded={open} aria-label="Search nodes" aria-pressed={Boolean(query)} onClick={() => setOpen((value) => !value)} size="icon" variant={query ? "secondary" : "ghost"}><Search /></Button></CanvasTooltip>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(19rem,calc(100vw-2rem))] rounded-md border bg-popover p-2 shadow-xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input ref={inputRef} aria-label="Search graph nodes" className="bg-background pl-9 pr-9" onChange={(event) => onChange(event.target.value)} placeholder="Search nodes…" value={query} />
            {query ? <CanvasTooltip label="Clear search" side="left"><Button aria-label="Clear node search" className="absolute right-1 top-1/2 size-7 -translate-y-1/2" onClick={() => onChange("")} size="icon" variant="ghost"><X /></Button></CanvasTooltip> : null}
          </div>
          <p className="mt-2 px-1 text-xs text-muted-foreground" role="status">{query.trim() ? `${matchCount.toLocaleString()} matching node${matchCount === 1 ? "" : "s"}` : "Type to highlight matching nodes."}</p>
        </div>
      ) : null}
    </div>
  )
}
