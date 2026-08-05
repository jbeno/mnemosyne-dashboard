import { useEffect, useMemo, useRef, useState } from "react"
import { Maximize2, Minus, Minimize2, Plus, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { layoutNetwork, limitNetworkEdges, projectNetwork, type NetworkMode } from "@/lib/network-layout"
import type { GraphEdge, GraphNode } from "@/lib/types"

type ViewOffset = { x: number; y: number }

export function NetworkMap({
  edges,
  emptyMessage = "No relationships are available for this view.",
  mode = "graph",
  nodes,
  onSelect,
  selectedId,
}: {
  edges: GraphEdge[]
  emptyMessage?: string
  mode?: NetworkMode
  nodes: GraphNode[]
  onSelect?: (node: GraphNode) => void
  selectedId?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerId: number; x: number; y: number; origin: ViewOffset; moved: boolean } | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [offset, setOffset] = useState<ViewOffset>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const spatial = useMemo(() => layoutNetwork(nodes, edges, mode), [edges, mode, nodes])
  const positioned = useMemo(() => projectNetwork(spatial, mode === "graph" ? { pitch: 0.08, yaw: 0.08 } : undefined), [mode, spatial])
  const byId = useMemo(() => new Map(positioned.map((node) => [node.id, node])), [positioned])
  const labeledIds = useMemo(() => chooseLabels(positioned, mode === "graph" ? 22 : 18), [mode, positioned])
  const visibleEdges = useMemo(() => limitNetworkEdges(edges, spatial, mode), [edges, mode, spatial])
  const selectedNode = selectedId ? byId.get(selectedId) : undefined

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener("fullscreenchange", update)
    return () => document.removeEventListener("fullscreenchange", update)
  }, [])

  const reset = () => {
    setOffset({ x: 0, y: 0 })
    setZoom(1)
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current || !document.fullscreenEnabled) return
    if (document.fullscreenElement === containerRef.current) await document.exitFullscreen()
    else await containerRef.current.requestFullscreen()
  }

  return (
    <div
      className="relative min-h-[28rem] overflow-hidden rounded-lg border bg-background/35 shadow-inner shadow-black/5 fullscreen:min-h-screen fullscreen:rounded-none fullscreen:border-0"
      data-network-mode={mode}
      ref={containerRef}
    >
      <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-md border bg-background/90 p-1 shadow-sm backdrop-blur">
        <Button aria-label="Zoom out" disabled={zoom <= 0.55} onClick={() => setZoom((value) => Math.max(0.55, value - 0.15))} size="icon" variant="ghost"><Minus /></Button>
        <Button aria-label="Reset view" onClick={reset} size="icon" variant="ghost"><RotateCcw /></Button>
        <Button aria-label="Zoom in" disabled={zoom >= 2.4} onClick={() => setZoom((value) => Math.min(2.4, value + 0.15))} size="icon" variant="ghost"><Plus /></Button>
        {document.fullscreenEnabled ? <Button aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} onClick={() => void toggleFullscreen()} size="icon" variant="ghost">{fullscreen ? <Minimize2 /> : <Maximize2 />}</Button> : null}
      </div>
      {!positioned.length ? <div className="grid min-h-[34rem] place-items-center px-8 text-center"><p className="max-w-lg text-sm leading-6 text-muted-foreground">{emptyMessage}</p></div> : (
        <svg
          aria-label={`${mode} relationship map`}
          className={cn("h-[34rem] w-full touch-none select-none", fullscreen && "h-screen")}
          onPointerDown={(event) => {
            if ((event.target as Element).closest("[data-network-node]")) return
            dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, origin: offset, moved: false }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current
            if (!drag || drag.pointerId !== event.pointerId) return
            const rect = event.currentTarget.getBoundingClientRect()
            const dx = (event.clientX - drag.x) * (1000 / Math.max(1, rect.width))
            const dy = (event.clientY - drag.y) * (620 / Math.max(1, rect.height))
            if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true
            setOffset({ x: drag.origin.x + dx, y: drag.origin.y + dy })
          }}
          onPointerUp={(event) => {
            if (dragRef.current?.pointerId === event.pointerId) {
              dragRef.current = null
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
          }}
          onWheel={(event) => {
            event.preventDefault()
            setZoom((value) => Math.max(0.55, Math.min(2.4, value * Math.exp(-event.deltaY * 0.001))))
          }}
          role="group"
          viewBox="0 0 1000 620"
        >
          <defs>
            <radialGradient id={`network-glow-${mode}`}><stop offset="0" stopColor="var(--primary)" stopOpacity="0.18" /><stop offset="1" stopColor="var(--background)" stopOpacity="0" /></radialGradient>
            <filter id={`node-glow-${mode}`} height="300%" width="300%" x="-100%" y="-100%"><feGaussianBlur stdDeviation="3" /></filter>
          </defs>
          <rect fill={`url(#network-glow-${mode})`} height="620" width="1000" />
          <g transform={`translate(${offset.x} ${offset.y}) translate(500 310) scale(${zoom}) translate(-500 -310)`}>
            {visibleEdges.map((edge) => {
              const source = byId.get(edge.source)
              const target = byId.get(edge.target)
              if (!source || !target) return null
              const selected = selectedId && (edge.source === selectedId || edge.target === selectedId)
              return <line className={cn("stroke-border", selected && "stroke-primary")} key={edge.id} opacity={selected ? 0.9 : mode === "graph" ? 0.48 : 0.3} strokeWidth={selected ? 1.8 : 0.8} x1={source.screenX} x2={target.screenX} y1={source.screenY} y2={target.screenY} />
            })}
            {[...positioned].sort((a, b) => b.depth - a.depth).map((node) => {
              const selected = node.id === selectedId
              const showLabel = selected || labeledIds.has(node.id)
              const depthOpacity = Math.max(0.5, Math.min(1, 0.78 - node.depth / 1100))
              return (
                <g
                  aria-label={`${node.label}, ${node.degree || node.count || 1} connections`}
                  className="cursor-pointer outline-none"
                  data-network-node
                  key={node.id}
                  onClick={() => onSelect?.(node)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect?.(node) }}
                  role="button"
                  tabIndex={0}
                  transform={`translate(${node.screenX} ${node.screenY})`}
                >
                  {selected ? <circle className="fill-primary/25" filter={`url(#node-glow-${mode})`} r={node.screenRadius * 2.4} /> : null}
                  <circle className={cn(node.kind === "memory" ? "fill-chart-2" : "fill-primary", selected && "stroke-foreground")} opacity={selected ? 1 : depthOpacity} r={node.screenRadius} strokeWidth={selected ? 2.5 : 0} />
                  {showLabel ? <text className="fill-foreground text-[11px]" fontWeight={selected ? 650 : 500} paintOrder="stroke" stroke="var(--background)" strokeWidth="4" x={node.screenRadius + 6} y="4">{shortLabel(node.label)}</text> : null}
                </g>
              )
            })}
          </g>
        </svg>
      )}
      {fullscreen && selectedNode ? <div className="absolute bottom-4 left-4 max-w-sm border-l-2 border-primary bg-background/90 px-4 py-3 text-sm shadow-lg backdrop-blur"><p className="font-semibold">{selectedNode.label}</p><p className="mt-1 text-xs text-muted-foreground">{selectedNode.kind || "entity"}{selectedNode.category ? ` · ${selectedNode.category}` : ""} · {selectedNode.degree} connections</p></div> : null}
      <p className="pointer-events-none absolute bottom-3 right-3 hidden text-xs text-muted-foreground sm:block">Drag to pan · scroll to zoom · select a node to inspect</p>
    </div>
  )
}

function shortLabel(value: string) {
  const clean = value.replace(/^memory:/, "Memory ")
  return clean.length > 28 ? `${clean.slice(0, 25)}…` : clean
}

function chooseLabels(nodes: ReturnType<typeof projectNetwork>, limit: number) {
  const selected = new Set<string>()
  const boxes: Array<{ bottom: number; left: number; right: number; top: number }> = []
  const candidates = [...nodes].sort((a, b) => (b.degree + Number(b.weight || b.count || 0)) - (a.degree + Number(a.weight || a.count || 0)))
  for (const node of candidates) {
    if (selected.size >= limit) break
    const label = shortLabel(node.label)
    const left = node.screenX + node.screenRadius + 5
    const top = node.screenY - 9
    const box = { left, top, right: left + label.length * 6.6, bottom: top + 18 }
    const collides = boxes.some((placed) => !(box.right < placed.left || placed.right < box.left || box.bottom < placed.top || placed.bottom < box.top))
    if (collides) continue
    selected.add(node.id)
    boxes.push(box)
  }
  return selected
}
