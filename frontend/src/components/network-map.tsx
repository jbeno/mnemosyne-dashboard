import { useMemo, useState } from "react"
import { Minus, Plus, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { GraphEdge, GraphNode } from "@/lib/types"

type PositionedNode = GraphNode & { x: number; y: number; radius: number }

export function NetworkMap({
  edges,
  mode = "graph",
  nodes,
  onSelect,
  selectedId,
}: {
  edges: GraphEdge[]
  mode?: "graph" | "constellation" | "neural"
  nodes: GraphNode[]
  onSelect?: (node: GraphNode) => void
  selectedId?: string
}) {
  const [zoom, setZoom] = useState(1)
  const positioned = useMemo(() => layoutNodes(nodes, edges, mode), [edges, mode, nodes])
  const byId = useMemo(() => new Map(positioned.map((node) => [node.id, node])), [positioned])
  const visibleEdges = edges.slice(0, mode === "graph" ? 220 : 160)

  return (
    <div className="relative min-h-[28rem] overflow-hidden rounded-lg border bg-background/35" data-network-mode={mode}>
      <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-md border bg-background/90 p-1 shadow-sm">
        <Button aria-label="Zoom out" disabled={zoom <= 0.7} onClick={() => setZoom((value) => Math.max(0.7, value - 0.15))} size="icon" variant="ghost"><Minus /></Button>
        <Button aria-label="Reset zoom" onClick={() => setZoom(1)} size="icon" variant="ghost"><RotateCcw /></Button>
        <Button aria-label="Zoom in" disabled={zoom >= 1.75} onClick={() => setZoom((value) => Math.min(1.75, value + 0.15))} size="icon" variant="ghost"><Plus /></Button>
      </div>
      {!positioned.length ? <p className="p-8 text-sm text-muted-foreground">No relationships are available for this view.</p> : (
        <svg aria-label={`${mode} relationship map`} className="h-[34rem] w-full" role="group" viewBox="0 0 1000 620">
          <defs>
            <radialGradient id={`network-glow-${mode}`}><stop offset="0" stopColor="var(--primary)" stopOpacity="0.2" /><stop offset="1" stopColor="var(--background)" stopOpacity="0" /></radialGradient>
          </defs>
          <rect fill={`url(#network-glow-${mode})`} height="620" width="1000" />
          <g transform={`translate(500 310) scale(${zoom}) translate(-500 -310)`}>
            {visibleEdges.map((edge) => {
              const source = byId.get(edge.source)
              const target = byId.get(edge.target)
              if (!source || !target) return null
              const selected = selectedId && (edge.source === selectedId || edge.target === selectedId)
              return <line className={cn("stroke-border", selected && "stroke-primary")} key={edge.id} opacity={selected ? 0.9 : 0.42} strokeWidth={selected ? 1.8 : 0.8} x1={source.x} x2={target.x} y1={source.y} y2={target.y} />
            })}
            {positioned.map((node, index) => {
              const selected = node.id === selectedId
              const showLabel = selected || index < (mode === "graph" ? 24 : 18) || node.radius >= 8
              return (
                <g aria-label={`${node.label}, ${node.count || 1} connections`} className="cursor-pointer outline-none" key={node.id} onClick={() => onSelect?.(node)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect?.(node) }} role="button" tabIndex={0} transform={`translate(${node.x} ${node.y})`}>
                  <circle className={cn(node.kind === "memory" ? "fill-chart-2" : "fill-primary", selected && "stroke-foreground")} opacity={selected ? 1 : 0.82} r={node.radius} strokeWidth={selected ? 3 : 0} />
                  {showLabel ? <text className="fill-foreground text-[11px]" fontWeight={selected ? 650 : 500} paintOrder="stroke" stroke="var(--background)" strokeWidth="4" x={node.radius + 6} y="4">{shortLabel(node.label)}</text> : null}
                </g>
              )
            })}
          </g>
        </svg>
      )}
    </div>
  )
}

function layoutNodes(nodes: GraphNode[], edges: GraphEdge[], mode: "graph" | "constellation" | "neural"): PositionedNode[] {
  const degree = new Map<string, number>()
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) || 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) || 0) + 1)
  }
  return [...nodes].sort((a, b) => (degree.get(b.id) || b.count || 0) - (degree.get(a.id) || a.count || 0)).slice(0, 180).map((node, index, all) => {
    const weight = Math.max(1, degree.get(node.id) || node.count || node.weight || 1)
    const radius = Math.min(13, 3.5 + Math.sqrt(weight) * 1.8)
    if (mode === "neural") {
      const column = index % 7
      const row = Math.floor(index / 7)
      return { ...node, radius, x: 105 + column * 132 + Math.sin(index * 1.7) * 26, y: 70 + (row * 78) % 500 + Math.cos(index * 1.3) * 20 }
    }
    const angle = index * 2.399963229728653 + (mode === "constellation" ? 0.7 : 0)
    const normalized = all.length <= 1 ? 0 : Math.sqrt(index / (all.length - 1))
    const orbit = 32 + normalized * (mode === "constellation" ? 260 : 245)
    return { ...node, radius, x: 500 + Math.cos(angle) * orbit * 1.55, y: 310 + Math.sin(angle) * orbit }
  })
}

function shortLabel(value: string) {
  const clean = value.replace(/^memory:/, "Memory ")
  return clean.length > 28 ? `${clean.slice(0, 25)}…` : clean
}
