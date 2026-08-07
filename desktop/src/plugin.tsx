import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  PALETTE_AREA,
  ROUTES_AREA,
  SIDEBAR_NAV_AREA,
  SearchField,
  SegmentedControl,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  Tip,
  Textarea,
  fmtDateTime,
  host,
  icons,
  relativeTime,
  useQuery,
  useQueryClient,
  useValue,
  type HermesPlugin,
  type PluginContext
} from '@hermes/plugin-sdk'

import { categoryCounts, connectedIds, layoutGraph, type PositionedNode } from './graph'
import type {
  ActivityPoint,
  GraphEdge,
  GraphNode,
  MemoriesPayload,
  MemoryItem,
  OverviewPayload,
  TimelineEvent,
  TimelinePayload
} from './types'

const { Activity, Brain, Clock, Database, Eye, RefreshCw, Starmap } = {
  ...icons,
  Database: icons.Box
}

const PLUGIN_ID = 'mnemosyne-dashboard'
const ROUTE = '/memory'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Mnemosyne memory data could not be loaded.'
}

function query(path: string, params: Record<string, string | number | undefined>): string {
  const values = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') values.set(key, String(value))
  }
  const encoded = values.toString()
  return encoded ? `${path}?${encoded}` : path
}

function memoryTime(item: MemoryItem): string {
  return item.timestamp || item.created_at || ''
}

function timestampMs(value: string): number {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : Date.now()
}

function TypeBadge({ type }: { type: string }) {
  const normalized = (type || 'memory').toLocaleLowerCase()
  return <Badge className={`mnem-badge is-${normalized.replace(/[^a-z0-9]+/g, '-')}`} variant="outline">{type || 'memory'}</Badge>
}

function TrustBadge({ trust }: { trust?: string }) {
  const normalized = (trust || 'unknown').toLocaleLowerCase()
  return <Badge className={`mnem-badge is-trust-${normalized.replace(/[^a-z0-9]+/g, '-')}`} variant="outline">{normalized} trust</Badge>
}

function Strength({ value }: { value?: number }) {
  const normalized = Math.max(0, Math.min(1, Number(value || 0)))
  return (
    <Tip label="Stored importance influences recall ranking alongside semantic and full-text relevance.">
      <div aria-label={`Importance ${normalized.toFixed(2)}`} className="mnem-strength" tabIndex={0}>
        <span><i style={{ width: `${normalized * 100}%` }} /></span>
        <strong>{normalized.toFixed(2)}</strong>
        <small>Importance</small>
      </div>
    </Tip>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <Tip label={hint}>
      <div className="mnem-stat" tabIndex={0}>
        <strong>{value.toLocaleString()}</strong>
        <span>{label}</span>
      </div>
    </Tip>
  )
}

function ActivityChart({ points }: { points: ActivityPoint[] }) {
  if (points.length === 0) {
    return (
      <section className="mnem-section">
        <div className="mnem-section-title"><div><h2>Memory activity</h2><p>Records written across memory, knowledge, and consolidation logs.</p></div><Activity aria-hidden="true" size={16} /></div>
        <EmptyState description="This profile has not recorded memory activity yet." title="No activity to chart" />
      </section>
    )
  }
  const values = points.map(point => point.total)
  const max = Math.max(1, ...values)
  const width = 760
  const height = 170
  const inset = 10
  const path = points
    .map((point, index) => {
      const x = inset + (index / Math.max(1, points.length - 1)) * (width - inset * 2)
      const y = height - inset - (point.total / max) * (height - inset * 2)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <section className="mnem-section">
      <div className="mnem-section-title">
        <div>
          <h2>Memory activity</h2>
          <p>Records written across memory, knowledge, and consolidation logs.</p>
        </div>
        <Activity aria-hidden="true" size={16} />
      </div>
      <svg aria-label="Memory activity timeline" className="mnem-activity" role="img" viewBox={`0 0 ${width} ${height}`}>
        <line className="mnem-gridline" x1="10" x2="750" y1="160" y2="160" />
        <line className="mnem-gridline" x1="10" x2="750" y1="85" y2="85" />
        <path className="mnem-area" d={`${path} L750,160 L10,160 Z`} />
        <path className="mnem-line" d={path} />
      </svg>
      <div className="mnem-chart-axis">
        <span>{points[0]?.date || ''}</span>
        <span>{points.at(-1)?.date || ''}</span>
      </div>
    </section>
  )
}

function DistributionChart({
  description,
  items,
  title
}: {
  description: string
  items: Array<{ label: string; value: number }>
  title: string
}) {
  const max = Math.max(1, ...items.map(item => item.value))
  return (
    <section className="mnem-section mnem-distribution">
      <div className="mnem-section-title"><div><h2>{title}</h2><p>{description}</p></div></div>
      <div className="mnem-bars">
        {items.map(item => (
          <Tip key={item.label} label={`${item.label}: ${item.value.toLocaleString()}`}>
            <div className="mnem-bar" tabIndex={0}>
              <span>{item.label}</span>
              <i><b style={{ width: `${(item.value / max) * 100}%` }} /></i>
              <strong>{item.value.toLocaleString()}</strong>
            </div>
          </Tip>
        ))}
      </div>
    </section>
  )
}

const MAP_COLORS = ['#3b82f6', '#f97316', '#14b8a6', '#a855f7', '#eab308', '#ec4899', '#22c55e', '#6366f1', '#ef4444', '#06b6d4', '#84cc16', '#f59e0b']

function MapLegend({
  categoryColors,
  mapKind,
  mode,
  nodes,
  onModeChange
}: {
  categoryColors: Map<string, string>
  mapKind: 'memory' | 'knowledge'
  mode: 'type' | 'category'
  nodes: GraphNode[]
  onModeChange: (mode: 'type' | 'category') => void
}) {
  const categories = categoryCounts(nodes).slice(0, 6)
  return (
    <div className="mnem-legend">
      <SegmentedControl onChange={onModeChange} options={[{ id: 'type', label: 'Type' }, { id: 'category', label: mapKind === 'knowledge' ? 'Store' : 'Category' }]} value={mode} />
      <div className="mnem-legend-items">
        {mode === 'type' ? (
          <>
            <div className="mnem-legend-row"><i className="mnem-dot mnem-dot-entity" />{mapKind === 'knowledge' ? 'Entity' : 'Entity or topic'}</div>
            {mapKind === 'memory' && <div className="mnem-legend-row"><i className="mnem-dot mnem-dot-memory" />Memory record</div>}
            <div className="mnem-legend-row"><i className="mnem-line-key" />{mapKind === 'knowledge' ? 'Predicate relation' : 'Mention derived from text'}</div>
          </>
        ) : categories.map(category => (
          <div className="mnem-legend-row" key={category.label}>
            <i className="mnem-dot" style={{ background: categoryColors.get(category.label) }} />
            {category.label} <span>{category.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MemoryMaintenance({
  capabilities,
  ctx,
  item,
  onChanged
}: {
  capabilities: OverviewPayload['capabilities']
  ctx: PluginContext
  item: MemoryItem
  onChanged: () => void
}) {
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [forgetOpen, setForgetOpen] = useState(false)
  const [content, setContent] = useState(item.content)
  const [saving, setSaving] = useState(false)

  if (!capabilities.manage) {
    return <div className="mnem-readonly-note"><Eye size={14} /> Read-only. Enable local Memory admin mode to correct or forget records.</div>
  }

  return (
    <>
      <div className="mnem-maintenance">
        <Button onClick={() => { setContent(item.content); setCorrectionOpen(true) }} size="sm" variant="outline"><icons.Pencil />Correct</Button>
        {capabilities.forget && <Button onClick={() => setForgetOpen(true)} size="sm" variant="destructive"><icons.Trash2 />Forget</Button>}
      </div>
      <Dialog onOpenChange={setCorrectionOpen} open={correctionOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Correct this memory</DialogTitle>
            <DialogDescription>The original is retained as superseded and a backup is created before the replacement is written.</DialogDescription>
          </DialogHeader>
          <Textarea className="min-h-40" onChange={event => setContent(event.target.value)} value={content} />
          <DialogFooter>
            <Button onClick={() => setCorrectionOpen(false)} variant="ghost">Cancel</Button>
            <Button
              disabled={!content.trim() || saving}
              onClick={async () => {
                setSaving(true)
                try {
                  await ctx.rest(`/memory/${encodeURIComponent(item.id)}/correct`, { method: 'POST', body: { content } })
                  setCorrectionOpen(false)
                  onChanged()
                  host.notify({ kind: 'success', message: 'Memory corrected. The prior record was superseded and backed up.' })
                } catch (error) {
                  host.notifyError(error, 'Could not correct memory')
                } finally {
                  setSaving(false)
                }
              }}
            >{saving ? 'Saving…' : 'Save correction'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        confirmLabel="Forget memory"
        description="This creates a verified database backup, then expires the memory so it is no longer active. The row is not hard-deleted."
        destructive
        onClose={() => setForgetOpen(false)}
        onConfirm={async () => {
          try {
            await ctx.rest(`/memory/${encodeURIComponent(item.id)}/forget`, { method: 'POST', body: {} })
            onChanged()
            host.notify({ kind: 'success', message: 'Memory forgotten. A backup was created first.' })
          } catch (error) {
            host.notifyError(error, 'Could not forget memory')
            throw error
          }
        }}
        open={forgetOpen}
        title="Forget this memory?"
      />
    </>
  )
}

function NodeInspector({
  node,
  nodes,
  edges,
  ctx,
  capabilities,
  onSelect,
  onClose
}: {
  node: GraphNode
  nodes: GraphNode[]
  edges: GraphEdge[]
  ctx: PluginContext
  capabilities: OverviewPayload['capabilities']
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const relatedEdges = edges.filter(edge => edge.source === node.id || edge.target === node.id)
  const byId = new Map(nodes.map(item => [item.id, item]))
  const memory = useQuery<{ item: MemoryItem; read_only: boolean }, Error>({
    queryKey: [PLUGIN_ID, 'memory', node.memory_id],
    queryFn: () => ctx.rest(`/memory/${encodeURIComponent(node.memory_id || '')}`),
    enabled: Boolean(node.memory_id),
    staleTime: 30_000
  })

  return (
    <aside className="mnem-inspector">
      <div className="mnem-inspector-head">
        <span>Node inspector</span>
        <Tip label="Close inspector"><Button aria-label="Close inspector" onClick={onClose} size="icon-xs" variant="ghost"><icons.X /></Button></Tip>
      </div>
      <h2>{node.kind === 'memory' ? node.preview || node.label : node.label}</h2>
      <div className="mnem-badges">
        <TypeBadge type={node.kind} />
        {node.category && <Badge variant="outline">{node.category}</Badge>}
      </div>
      {memory.data?.item && (
        <>
          <p className="mnem-inspector-content">{memory.data.item.content}</p>
          <dl className="mnem-meta">
            <div><dt>Source</dt><dd>{memory.data.item.source || 'Unknown'}</dd></div>
            <div><dt>Trust</dt><dd>{memory.data.item.veracity || 'Unknown'}</dd></div>
            <div><dt>Importance</dt><dd>{Number(memory.data.item.importance || 0).toFixed(2)}</dd></div>
            <div><dt>Last seen</dt><dd>{relativeTime(timestampMs(memoryTime(memory.data.item)))}</dd></div>
          </dl>
          <MemoryMaintenance
            capabilities={capabilities}
            ctx={ctx}
            item={memory.data.item}
            onChanged={() => {
              void queryClient.invalidateQueries({ queryKey: [PLUGIN_ID] })
            }}
          />
        </>
      )}
      <div className="mnem-linked">
        <h3>Linked nodes <span>{relatedEdges.length}</span></h3>
        {relatedEdges.slice(0, 18).map(edge => {
          const otherId = edge.source === node.id ? edge.target : edge.source
          const other = byId.get(otherId)
          if (!other) return null
          return (
            <button key={edge.id} onClick={() => onSelect(other.id)} type="button">
              <span>{other.kind === 'memory' ? other.preview || other.label : other.label}</span>
              <small>{edge.label || edge.kind || 'linked'}</small>
            </button>
          )
        })}
        {relatedEdges.length === 0 && <p>No linked nodes in this snapshot.</p>}
      </div>
    </aside>
  )
}

interface ProjectedNode extends PositionedNode {
  screenX: number
  screenY: number
  screenRadius: number
  depth: number
  depthOpacity: number
}

function projectNode(node: PositionedNode, rotation: { x: number; y: number }, dimension: '2d' | '3d'): ProjectedNode {
  if (dimension === '2d') {
    return { ...node, screenX: node.x, screenY: node.y, screenRadius: node.radius, depth: 0, depthOpacity: 1 }
  }
  const x = node.x - 500
  const y = node.y - 310
  const cosY = Math.cos(rotation.y)
  const sinY = Math.sin(rotation.y)
  const rotatedX = x * cosY + node.z * sinY
  const rotatedZ = -x * sinY + node.z * cosY
  const cosX = Math.cos(rotation.x)
  const sinX = Math.sin(rotation.x)
  const rotatedY = y * cosX - rotatedZ * sinX
  const depth = y * sinX + rotatedZ * cosX
  const perspective = Math.max(0.55, Math.min(1.75, 720 / (720 + depth)))
  return {
    ...node,
    screenX: 500 + rotatedX * perspective,
    screenY: 310 + rotatedY * perspective,
    screenRadius: node.radius * perspective,
    depth,
    depthOpacity: Math.max(0.42, Math.min(1, 0.76 - depth / 950))
  }
}

function MemoryMap({
  capabilities,
  knowledgeGraph,
  memoryMap,
  ctx,
  immersive = false
}: {
  capabilities: OverviewPayload['capabilities']
  knowledgeGraph: OverviewPayload['knowledge_graph']
  memoryMap: OverviewPayload['memory_map']
  ctx: PluginContext
  immersive?: boolean
}) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [labels, setLabels] = useState<'key' | 'all'>('key')
  const [mapKind, setMapKind] = useState<'memory' | 'knowledge'>('memory')
  const [colorMode, setColorMode] = useState<'type' | 'category'>('type')
  const [dimension, setDimension] = useState<'2d' | '3d'>('3d')
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [rotation, setRotation] = useState({ x: -0.16, y: 0.28 })
  const [fullscreen, setFullscreen] = useState(false)
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 })
  const [drag, setDrag] = useState<{
    x: number
    y: number
    originX: number
    originY: number
    rotationX: number
    rotationY: number
  } | null>(null)
  const graph = mapKind === 'knowledge' ? knowledgeGraph : memoryMap
  const positioned = useMemo(() => layoutGraph(graph.nodes, graph.edges), [graph])
  const projected = useMemo(
    () => positioned.map(node => projectNode(node, rotation, dimension)),
    [dimension, positioned, rotation]
  )
  const byId = useMemo(() => new Map(projected.map(node => [node.id, node])), [projected])
  const connected = useMemo(() => connectedIds(selectedId, graph.edges), [selectedId, graph.edges])
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const matches = useMemo(
    () => new Set(projected.filter(node => `${node.label} ${node.preview || ''} ${node.category || ''}`.toLocaleLowerCase().includes(normalizedSearch)).map(node => node.id)),
    [normalizedSearch, projected]
  )
  const selected = selectedId ? byId.get(selectedId) || null : null
  const major = useMemo(() => new Set([...projected].sort((a, b) => b.radius - a.radius).slice(0, 20).map(node => node.id)), [projected])
  const categoryColors = useMemo(() => {
    const categories = [...new Set(graph.nodes.map(node => node.category || 'Other'))].sort()
    return new Map(categories.map((category, index) => [category, MAP_COLORS[index % MAP_COLORS.length]]))
  }, [graph.nodes])

  useEffect(() => {
    if (dimension !== '3d' || paused || drag) return
    let frame = 0
    let last = performance.now()
    const animate = (now: number) => {
      const elapsed = Math.min(50, now - last)
      last = now
      setRotation(current => ({ ...current, y: current.y + elapsed * 0.000075 }))
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [dimension, drag, paused])

  const opacity = (id: string) => {
    if (normalizedSearch) return matches.has(id) ? 1 : 0.12
    if (selectedId) return connected.has(id) ? 1 : 0.22
    return 1
  }
  const showLabel = (node: PositionedNode) => {
    if (normalizedSearch) return matches.has(node.id)
    if (selectedId) return connected.has(node.id)
    return labels === 'all' || major.has(node.id)
  }
  const onWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const next = Math.max(0.55, Math.min(3.6, view.scale * (event.deltaY > 0 ? 0.9 : 1.1)))
    setView(current => ({ ...current, scale: next }))
  }
  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.target !== event.currentTarget) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelectedId(null)
    setDrag({
      x: event.clientX,
      y: event.clientY,
      originX: view.x,
      originY: view.y,
      rotationX: rotation.x,
      rotationY: rotation.y
    })
  }
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag) return
    if (dimension === '3d' && !event.shiftKey) {
      setRotation({
        x: Math.max(-1.25, Math.min(1.25, drag.rotationX + (event.clientY - drag.y) * 0.006)),
        y: drag.rotationY - (event.clientX - drag.x) * 0.006
      })
    } else {
      setView(current => ({ ...current, x: drag.originX + event.clientX - drag.x, y: drag.originY + event.clientY - drag.y }))
    }
  }
  const onPointerUp = () => setDrag(null)
  const reset = () => {
    setView({ x: 0, y: 0, scale: 1 })
    setRotation({ x: -0.16, y: 0.28 })
    setSelectedId(null)
  }

  return (
    <section className={`mnem-map-shell${fullscreen ? ' is-fullscreen' : ''}${immersive ? ' is-immersive' : ''}`}>
      <div className="mnem-map-layout">
        <div className="mnem-map-canvas">
          <div className="mnem-map-modes">
            <SegmentedControl onChange={value => { setDimension(value); reset() }} options={[{ id: '2d', label: '2D', icon: Starmap }, { id: '3d', label: '3D', icon: icons.Box }]} value={dimension} />
            <SegmentedControl
              onChange={value => { setMapKind(value); reset() }}
              options={[
                { id: 'memory', label: 'Memory map', icon: Brain },
                { id: 'knowledge', label: 'Knowledge graph', icon: icons.Link }
              ]}
              value={mapKind}
            />
          </div>
          <div className="mnem-map-actions">
            <SearchField aria-label={mapKind === 'knowledge' ? 'Search knowledge graph' : 'Search memory map'} containerClassName="mnem-map-search" onChange={setSearch} placeholder="Search nodes…" value={search} />
            {dimension === '3d' && <Tip label={paused ? 'Resume rotation' : 'Pause rotation'}><Button aria-label={paused ? 'Resume rotation' : 'Pause rotation'} onClick={() => setPaused(value => !value)} size="icon-sm" variant="ghost">{paused ? <icons.Play /> : <icons.Pause />}</Button></Tip>}
            <Tip label={labels === 'all' ? 'Show key labels' : 'Show all labels'}><Button aria-label="Toggle node labels" onClick={() => setLabels(value => value === 'all' ? 'key' : 'all')} size="icon-sm" variant={labels === 'all' ? 'secondary' : 'ghost'}><Eye /></Button></Tip>
            <Tip label="Reset map view"><Button aria-label="Reset map view" onClick={reset} size="icon-sm" variant="ghost"><RefreshCw /></Button></Tip>
            <Tip label={fullscreen ? 'Exit fullscreen' : 'Open fullscreen'}><Button aria-label={fullscreen ? 'Exit fullscreen' : 'Open fullscreen'} onClick={() => setFullscreen(value => !value)} size="icon-sm" variant="ghost"><icons.Maximize /></Button></Tip>
          </div>
          <svg
            aria-label={mapKind === 'knowledge' ? 'Interactive Mnemosyne knowledge graph' : 'Interactive Mnemosyne memory map'}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
            role="img"
            viewBox="0 0 1000 620"
          >
            <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
              {graph.edges.map(edge => {
                const source = byId.get(edge.source)
                const target = byId.get(edge.target)
                if (!source || !target) return null
                const highlighted = selectedId ? edge.source === selectedId || edge.target === selectedId : false
                return (
                  <g key={edge.id} opacity={Math.min(opacity(source.id), opacity(target.id))}>
                    <line className={highlighted ? 'mnem-edge is-highlighted' : 'mnem-edge'} x1={source.screenX} x2={target.screenX} y1={source.screenY} y2={target.screenY} />
                    {(
                      normalizedSearch
                        ? matches.has(source.id) || matches.has(target.id)
                        : highlighted || (mapKind === 'knowledge' && labels === 'all')
                    ) && edge.label && (
                      <text className="mnem-edge-label" x={(source.screenX + target.screenX) / 2} y={(source.screenY + target.screenY) / 2}>{edge.label}</text>
                    )}
                  </g>
                )
              })}
              {[...projected].sort((a, b) => b.depth - a.depth).map(node => (
                <g
                  className={`mnem-node${selectedId === node.id ? ' is-selected' : selectedId && connected.has(node.id) ? ' is-connected' : ''}`}
                  key={node.id}
                  onClick={event => { event.stopPropagation(); setSelectedId(node.id) }}
                  opacity={opacity(node.id) * node.depthOpacity}
                  role="button"
                  tabIndex={0}
                  transform={`translate(${node.screenX} ${node.screenY})`}
                >
                  <title>{node.kind === 'memory' ? node.preview || node.label : node.label}</title>
                  <circle
                    className={node.kind === 'memory' ? 'mnem-node-memory' : 'mnem-node-entity'}
                    r={node.screenRadius}
                    style={colorMode === 'category' ? { fill: categoryColors.get(node.category || 'Other') } : undefined}
                  />
                  {showLabel(node) && <text className="mnem-node-label" x={node.screenRadius + 4} y="4">{node.kind === 'memory' ? node.preview || node.label : node.label}</text>}
                </g>
              ))}
            </g>
          </svg>
          <MapLegend categoryColors={categoryColors} mapKind={mapKind} mode={colorMode} nodes={graph.nodes} onModeChange={setColorMode} />
          <span className="mnem-map-help">{dimension === '3d' ? 'Drag to orbit · Shift-drag to pan' : 'Drag to pan'} · scroll to zoom · select a node to inspect</span>
        </div>
        {selected && <NodeInspector capabilities={capabilities} ctx={ctx} edges={graph.edges} node={selected} nodes={graph.nodes} onClose={() => setSelectedId(null)} onSelect={setSelectedId} />}
      </div>
    </section>
  )
}

function ExplorerView({ data, ctx }: { data: OverviewPayload; ctx: PluginContext }) {
  if (!data.database.available) {
    return <EmptyState description={`No Mnemosyne database was found for the ${data.profile} profile. Create memory in that profile, then refresh this view.`} title="This profile has no memory database yet" />
  }
  return <MemoryMap capabilities={data.capabilities} ctx={ctx} immersive knowledgeGraph={data.knowledge_graph} memoryMap={data.memory_map} />
}

function StatsView({ data }: { data: OverviewPayload }) {
  const counts = data.stats.counts
  const trust = data.stats.by_veracity.map(item => ({ label: item.veracity.replace(/^./, value => value.toUpperCase()), value: item.count }))
  const lifecycle = data.stats.by_degradation.map(item => ({ label: item.degradation_label.replace(/^./, value => value.toUpperCase()), value: item.count }))
  return (
    <div className="mnem-stack">
      <div className="mnem-stats">
        <Stat hint="Working memories currently retained for active recall." label="Working active" value={counts.working_memory || 0} />
        <Stat hint="Longer-lived episodic memories created by consolidation." label="Episodic" value={counts.episodic_memory || 0} />
        <Stat hint="Active non-stated memories above the review importance threshold." label="Review candidates" value={data.stats.review.active_candidates || 0} />
        <Stat hint="Episodic memories that have moved to a lower lifecycle tier." label="Degraded" value={data.stats.degradation.degraded || 0} />
      </div>
      <ActivityChart points={data.activity.series} />
      <div className="mnem-chart-grid">
        <DistributionChart
          description="Current retained records by Mnemosyne storage function."
          items={[
            { label: 'Working', value: counts.working_memory || 0 },
            { label: 'Episodic', value: counts.episodic_memory || 0 },
            { label: 'Knowledge relations', value: counts.triples || 0 },
            { label: 'Consolidations', value: counts.consolidation_log || 0 }
          ]}
          title="System inventory"
        />
        <DistributionChart
          description="Records surfaced for optional trust or lifecycle attention."
          items={[
            { label: 'Review', value: data.stats.review.active_candidates || 0 },
            { label: 'Degraded', value: data.stats.degradation.degraded || 0 },
            { label: 'Due warm', value: data.stats.degradation.due_tier2 || 0 },
            { label: 'Due cold', value: data.stats.degradation.due_tier3 || 0 }
          ]}
          title="Attention queues"
        />
        <DistributionChart description="How retained memories describe confidence in their origin." items={trust.length ? trust : [{ label: 'Unknown', value: 0 }]} title="Trust provenance" />
        <DistributionChart description="Episodic memories across hot, warm, and cold lifecycle tiers." items={lifecycle.length ? lifecycle : [{ label: 'Hot', value: 0 }, { label: 'Warm', value: 0 }, { label: 'Cold', value: 0 }]} title="Lifecycle tiers" />
      </div>
    </div>
  )
}

function MemoryRow({ item, selected, onClick }: { item: MemoryItem; selected: boolean; onClick: () => void }) {
  return (
    <button className={`mnem-memory-row${selected ? ' is-selected' : ''}`} onClick={onClick} type="button">
      <div className="mnem-memory-copy">
        <div className="mnem-badges"><TypeBadge type={item.memory_kind || item.tier || 'memory'} /><TrustBadge trust={item.veracity} /></div>
        <p>{item.content}</p>
        <small>{item.source || 'Unknown source'} · {relativeTime(timestampMs(memoryTime(item)))} · recalled {(item.recall_count || 0).toLocaleString()} times</small>
      </div>
      <Strength value={item.importance} />
    </button>
  )
}

function MemoryDetail({
  capabilities,
  ctx,
  item,
  onChanged,
  onClose
}: {
  capabilities: OverviewPayload['capabilities']
  ctx: PluginContext
  item: MemoryItem
  onChanged: () => void
  onClose: () => void
}) {
  return (
    <aside className="mnem-detail">
      <div className="mnem-inspector-head"><span>Memory details</span><Button aria-label="Close details" onClick={onClose} size="icon-xs" variant="ghost"><icons.X /></Button></div>
      <h2>{item.memory_kind === 'episodic' ? 'Episodic memory' : 'Working memory'}</h2>
      <p className="mnem-detail-content">{item.content}</p>
      <dl className="mnem-meta">
        <div><dt>ID</dt><dd>{item.id}</dd></div>
        <div><dt>Source</dt><dd>{item.source || 'Unknown'}</dd></div>
        <div><dt>Session</dt><dd>{item.session_id || 'Default'}</dd></div>
        <div><dt>Scope</dt><dd>{item.scope || 'Unknown'}</dd></div>
        <div><dt>Trust</dt><dd>{item.veracity || 'Unknown'}</dd></div>
        <div><dt>Importance</dt><dd>{Number(item.importance || 0).toFixed(2)}</dd></div>
        <div><dt>Created</dt><dd>{fmtDateTime.format(timestampMs(memoryTime(item)))}</dd></div>
      </dl>
      <MemoryMaintenance capabilities={capabilities} ctx={ctx} item={item} onChanged={onChanged} />
    </aside>
  )
}

function MemoriesView({ capabilities, ctx, profile }: { capabilities: OverviewPayload['capabilities']; ctx: PluginContext; profile: string }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<'all' | 'working' | 'episodic'>('all')
  const [sort, setSort] = useState<'importance' | 'recent' | 'recall'>('importance')
  const [selected, setSelected] = useState<MemoryItem | null>(null)
  const memories = useQuery<MemoriesPayload, Error>({
    queryKey: [PLUGIN_ID, profile, 'memories', search, kind, sort],
    queryFn: () => ctx.rest(query('/memories', { q: search, kind, sort, limit: 150 })),
    staleTime: 10_000
  })

  return (
    <div className="mnem-browser">
      <div className="mnem-browser-toolbar">
        <SearchField containerClassName="mnem-browser-search" loading={memories.isFetching} onChange={setSearch} placeholder="Search retained memories…" value={search} />
        <SegmentedControl onChange={setKind} options={[{ id: 'all', label: 'All' }, { id: 'working', label: 'Working' }, { id: 'episodic', label: 'Episodic' }]} value={kind} />
        <SegmentedControl onChange={setSort} options={[{ id: 'importance', label: 'Importance' }, { id: 'recent', label: 'Recent' }, { id: 'recall', label: 'Most recalled' }]} value={sort} />
      </div>
      <p className="mnem-browser-context">Memories are retained records; this view ranks them by {sort === 'importance' ? 'stored importance' : sort === 'recall' ? 'recall count' : 'creation time'}. Timeline preserves the chronology of memory, relationship, and consolidation events.</p>
      {memories.isError ? <ErrorState description={errorMessage(memories.error)} title="Could not load memories" /> : (
        <div className={`mnem-browser-layout${selected ? ' has-detail' : ''}`}>
          <div className="mnem-memory-list">
            {memories.isLoading && Array.from({ length: 8 }).map((_, index) => <Skeleton className="mnem-row-skeleton" key={index} />)}
            {memories.data?.items.map(item => <MemoryRow item={item} key={item.id} onClick={() => setSelected(item)} selected={selected?.id === item.id} />)}
            {memories.data?.items.length === 0 && <EmptyState description="Try a different term or memory type." title="No memories found" />}
          </div>
          {selected && <MemoryDetail capabilities={capabilities} ctx={ctx} item={selected} onChanged={() => { setSelected(null); void queryClient.invalidateQueries({ queryKey: [PLUGIN_ID] }) }} onClose={() => setSelected(null)} />}
        </div>
      )}
    </div>
  )
}

function TimelineRow({ event }: { event: TimelineEvent }) {
  return (
    <div className="mnem-timeline-row">
      <i className={`mnem-timeline-icon is-${event.type}`}>{event.type === 'memory' ? <Brain /> : event.type === 'triple' ? <icons.Link /> : <RefreshCw />}</i>
      <div>
        <div><span className="mnem-timeline-title"><strong>{event.title}</strong><TypeBadge type={event.type === 'memory' ? event.item.memory_kind || 'memory' : event.type === 'triple' ? 'relationship' : 'consolidation'} /></span><span>{relativeTime(timestampMs(event.timestamp))}</span></div>
        <p>{event.preview}</p>
      </div>
    </div>
  )
}

function TimelineView({ ctx, profile }: { ctx: PluginContext; profile: string }) {
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<'day' | 'session'>('day')
  const timeline = useQuery<TimelinePayload, Error>({
    queryKey: [PLUGIN_ID, profile, 'timeline', search, group],
    queryFn: () => ctx.rest(query('/timeline', { q: search, group, limit: 300 })),
    staleTime: 10_000
  })
  return (
    <div className="mnem-browser">
      <div className="mnem-browser-toolbar">
        <SearchField containerClassName="mnem-browser-search" loading={timeline.isFetching} onChange={setSearch} placeholder="Search memory activity…" value={search} />
        <SegmentedControl onChange={setGroup} options={[{ id: 'day', label: 'By day' }, { id: 'session', label: 'By session' }]} value={group} />
      </div>
      {timeline.isError ? <ErrorState description={errorMessage(timeline.error)} title="Could not load the timeline" /> : (
        <div className="mnem-timeline">
          {timeline.isLoading && Array.from({ length: 8 }).map((_, index) => <Skeleton className="mnem-row-skeleton" key={index} />)}
          {timeline.data?.groups.map(section => (
            <section key={section.key}>
              <header><h2>{section.key}</h2><Badge variant="outline">{section.count}</Badge></header>
              {section.events.map((event, index) => <TimelineRow event={event} key={`${event.type}-${event.timestamp}-${index}`} />)}
            </section>
          ))}
          {timeline.data?.groups.length === 0 && <EmptyState description="No retained activity matches this view." title="No timeline activity" />}
        </div>
      )}
    </div>
  )
}

function Styles() {
  return <style>{`
    .mnem-page{height:100%;min-height:0;display:flex;flex-direction:column;background:var(--background);color:var(--foreground)}
    .mnem-page *{box-sizing:border-box}.mnem-header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:12px 28px 10px;border-bottom:1px solid var(--border)}
    .mnem-eyebrow,.mnem-inspector-head>span{display:block;color:var(--ui-accent);font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
    .mnem-header h1{font-size:20px;line-height:1.05;font-weight:690;letter-spacing:-.025em;margin:3px 0 0}.mnem-header p,.mnem-section p{margin:0;color:var(--muted-foreground);font-size:12px}
    .mnem-profile{display:flex;align-items:center;gap:8px;color:var(--muted-foreground);font-size:11px;outline:none}.mnem-profile strong{color:var(--foreground)}
    .mnem-tabs{padding:0 28px;border-bottom:1px solid var(--border)}.mnem-tabs [role=tablist]{background:transparent;padding:0;height:38px;gap:18px}.mnem-tabs [role=tab]{height:38px;padding:0 1px;border-radius:0;box-shadow:none}.mnem-tabs [data-state=active]{border-bottom:2px solid var(--foreground);background:transparent!important;box-shadow:none!important}
    .mnem-content{flex:1;min-height:0;overflow:auto;padding:24px 28px 40px}.mnem-content.is-explore{display:flex;overflow:hidden;padding:16px 28px 22px}.mnem-content.is-explore>*{flex:1;min-height:0}.mnem-stack{display:flex;flex-direction:column;gap:28px}
    .mnem-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid var(--border);border-bottom:1px solid var(--border)}.mnem-stat{padding:18px 20px;border-right:1px solid var(--border);outline:none}.mnem-stat:last-child{border-right:0}.mnem-stat strong{display:block;font-size:25px;line-height:1}.mnem-stat span{display:block;margin-top:8px;color:var(--muted-foreground);font-size:9px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}
    .mnem-overview-grid,.mnem-chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px}.mnem-section{min-width:0;border-top:1px solid var(--border);padding-top:16px}.mnem-section-title{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px}.mnem-section-title h2{margin:0 0 4px;font-size:14px}.mnem-section-title>svg{color:var(--muted-foreground)}
    .mnem-activity{display:block;width:100%;height:180px;overflow:visible}.mnem-gridline{stroke:var(--border);stroke-width:1}.mnem-line{fill:none;stroke:var(--ui-accent);stroke-width:2.4}.mnem-area{fill:var(--ui-accent);opacity:.07}.mnem-chart-axis{display:flex;justify-content:space-between;color:var(--muted-foreground);font-size:9px}
    .mnem-bars{display:flex;flex-direction:column;gap:11px}.mnem-bar{display:grid;grid-template-columns:92px minmax(0,1fr) auto;align-items:center;gap:10px;outline:none}.mnem-bar>span,.mnem-bar>strong{font-size:10px}.mnem-bar>span{color:var(--muted-foreground)}.mnem-bar>strong{min-width:30px;text-align:right}.mnem-bar>i{display:block;height:6px;overflow:hidden;background:var(--accent)}.mnem-bar>i>b{display:block;height:100%;min-width:2px;background:var(--ui-accent)}
    .mnem-map-shell{border-top:1px solid var(--border);padding-top:16px}.mnem-map-shell.is-immersive{display:flex;min-height:0;border-top:0;padding-top:0}.mnem-map-shell.is-immersive .mnem-map-layout{flex:1;min-height:0}.mnem-map-shell.is-fullscreen{position:fixed;inset:0;z-index:999;display:flex;flex-direction:column;padding:12px;background:var(--background)}.mnem-map-shell.is-fullscreen .mnem-map-layout{flex:1;min-height:0}.mnem-map-shell.is-fullscreen .mnem-map-canvas>svg{min-height:0;height:100%}.mnem-map-layout{position:relative;display:grid;grid-template-columns:minmax(0,1fr);min-height:520px;border:1px solid var(--border);overflow:hidden}.mnem-map-canvas{position:relative;min-width:0;min-height:0;background:var(--background)}.mnem-map-canvas>svg{display:block;width:100%;height:100%;min-height:520px;touch-action:none;cursor:grab}.mnem-map-shell.is-immersive .mnem-map-canvas>svg{min-height:0}.mnem-map-canvas>svg:active{cursor:grabbing}.mnem-map-modes,.mnem-map-actions{position:absolute;top:12px;z-index:4;display:flex;align-items:center;gap:8px;padding:4px;border:1px solid var(--border);background:color-mix(in srgb,var(--background) 92%,transparent);box-shadow:0 8px 24px rgba(0,0,0,.08);backdrop-filter:blur(12px)}.mnem-map-modes{left:12px;flex-direction:column;align-items:flex-start}.mnem-map-actions{right:12px}.mnem-map-search{width:190px}
    .mnem-edge{stroke:var(--border);stroke-width:1;vector-effect:non-scaling-stroke}.mnem-edge.is-highlighted{stroke:var(--ui-accent);stroke-width:1.8}.mnem-edge-label{fill:var(--ui-accent);font-size:8px;text-anchor:middle;paint-order:stroke;stroke:var(--background);stroke-width:3px}.mnem-node{cursor:pointer;outline:none;transition:opacity .16s}.mnem-node circle{stroke:var(--background);stroke-width:1.5;vector-effect:non-scaling-stroke}.mnem-node.is-connected circle{stroke:var(--ui-accent);stroke-width:2}.mnem-node.is-selected circle{stroke:var(--ui-accent);stroke-width:3}.mnem-node-entity{fill:var(--ui-accent)}.mnem-node-memory{fill:var(--foreground);opacity:.72}.mnem-node-label{fill:var(--foreground);font-size:9px;font-weight:600;paint-order:stroke;stroke:var(--background);stroke-width:4px;stroke-linejoin:round;max-width:160px}
    .mnem-legend{position:absolute;left:12px;bottom:12px;display:flex;align-items:center;gap:8px;padding:5px 7px;border:1px solid var(--border);background:color-mix(in srgb,var(--background) 94%,transparent);font-size:9px;color:var(--muted-foreground);box-shadow:0 8px 24px rgba(0,0,0,.08);backdrop-filter:blur(12px)}.mnem-legend [role=group]{height:24px}.mnem-legend [role=group] button{height:22px;padding:0 7px;font-size:9px}.mnem-legend-items{display:flex;align-items:center;gap:9px}.mnem-legend-row{display:flex;align-items:center;gap:5px;white-space:nowrap}.mnem-legend-row span{color:var(--muted-foreground);opacity:.75}.mnem-dot{width:7px;height:7px;border-radius:50%;flex:none}.mnem-dot-entity{background:var(--ui-accent)}.mnem-dot-memory{background:var(--foreground);opacity:.72}.mnem-line-key{width:12px;height:1px;background:var(--border)}.mnem-map-help{position:absolute;right:12px;bottom:14px;font-size:9px;color:var(--muted-foreground)}
    .mnem-inspector{position:absolute;z-index:6;top:62px;right:12px;bottom:12px;width:min(340px,calc(100% - 24px));min-width:0;border:1px solid var(--border);padding:18px;overflow:auto;background:color-mix(in srgb,var(--background) 97%,transparent);box-shadow:0 18px 48px rgba(0,0,0,.18);backdrop-filter:blur(16px)}.mnem-detail{min-width:0;border-left:1px solid var(--border);padding:18px;overflow:auto;background:var(--background)}.mnem-inspector-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.mnem-inspector h2,.mnem-detail h2{font-size:18px;line-height:1.25;margin:12px 0}.mnem-inspector-content{font-size:11px;line-height:1.55;color:var(--muted-foreground)}.mnem-badges{display:flex;gap:6px;flex-wrap:wrap}.mnem-badge.is-working{border-color:color-mix(in srgb,#38bdf8 42%,var(--border));background:color-mix(in srgb,#38bdf8 12%,transparent);color:color-mix(in srgb,#38bdf8 78%,var(--foreground))}.mnem-badge.is-episodic{border-color:color-mix(in srgb,#a78bfa 45%,var(--border));background:color-mix(in srgb,#a78bfa 12%,transparent);color:color-mix(in srgb,#a78bfa 78%,var(--foreground))}.mnem-badge.is-relationship{border-color:color-mix(in srgb,#34d399 42%,var(--border));background:color-mix(in srgb,#34d399 12%,transparent);color:color-mix(in srgb,#34d399 78%,var(--foreground))}.mnem-badge.is-consolidation{border-color:color-mix(in srgb,#f59e0b 42%,var(--border));background:color-mix(in srgb,#f59e0b 12%,transparent);color:color-mix(in srgb,#f59e0b 78%,var(--foreground))}.mnem-badge.is-trust-stated{border-color:color-mix(in srgb,#22c55e 38%,var(--border));color:color-mix(in srgb,#22c55e 72%,var(--foreground))}.mnem-badge.is-trust-unknown{color:var(--muted-foreground)}.mnem-badge.is-trust-inferred,.mnem-badge.is-trust-imported,.mnem-badge.is-trust-tool{border-color:color-mix(in srgb,#f59e0b 38%,var(--border));color:color-mix(in srgb,#f59e0b 72%,var(--foreground))}.mnem-meta{margin:20px 0}.mnem-meta>div{display:grid;grid-template-columns:86px minmax(0,1fr);gap:12px;padding:8px 0;border-bottom:1px solid var(--border);font-size:11px}.mnem-meta dt{color:var(--muted-foreground)}.mnem-meta dd{margin:0;text-align:right;overflow-wrap:anywhere}.mnem-linked h3{display:flex;justify-content:space-between;margin:20px 0 6px;font-size:11px}.mnem-linked button{display:block;width:100%;padding:9px 0;border:0;border-top:1px solid var(--border);background:transparent;color:var(--foreground);text-align:left;cursor:pointer}.mnem-linked button span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px}.mnem-linked button small{color:var(--ui-accent);font-size:9px}.mnem-linked p{color:var(--muted-foreground);font-size:11px}.mnem-maintenance{display:flex;gap:8px;margin:14px 0}
    .mnem-browser{min-height:100%;display:flex;flex-direction:column}.mnem-browser-toolbar{display:flex;align-items:center;gap:12px;padding-bottom:12px;border-bottom:1px solid var(--border)}.mnem-browser-search{flex:1;max-width:520px}.mnem-browser-context{margin:10px 0 0;color:var(--muted-foreground);font-size:10px;line-height:1.45}.mnem-browser-layout{display:grid;grid-template-columns:minmax(0,1fr);min-height:0}.mnem-browser-layout.has-detail{grid-template-columns:minmax(0,1fr) 320px}.mnem-memory-list{min-width:0}.mnem-memory-row{display:grid;grid-template-columns:minmax(0,1fr) 112px;align-items:center;gap:20px;width:100%;padding:15px 8px;border:0;border-bottom:1px solid var(--border);background:transparent;color:var(--foreground);text-align:left;cursor:pointer}.mnem-memory-row:hover,.mnem-memory-row.is-selected{background:var(--accent)}.mnem-memory-row p{margin:8px 0 6px;font-size:12px;line-height:1.5}.mnem-memory-row small{color:var(--muted-foreground);font-size:10px}.mnem-strength{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;outline:none}.mnem-strength>span{grid-column:1;display:block;height:5px;overflow:hidden;background:var(--accent)}.mnem-strength>span>i{display:block;height:100%;background:var(--ui-accent)}.mnem-strength>strong{grid-column:2;grid-row:1 / span 2;font-size:18px;font-variant-numeric:tabular-nums}.mnem-strength>small{grid-column:1;font-size:8px;letter-spacing:.1em;text-transform:uppercase}.mnem-row-skeleton{height:72px;margin:10px 0}.mnem-detail{position:sticky;top:0;height:calc(100vh - 190px)}.mnem-detail-content{font-size:12px;line-height:1.6}.mnem-readonly-note{display:flex;align-items:center;gap:7px;padding:9px;border:1px solid var(--border);color:var(--muted-foreground);font-size:10px}
    .mnem-timeline{max-width:980px;padding-top:8px}.mnem-timeline section>header{display:flex;align-items:center;gap:8px;padding:16px 0 8px}.mnem-timeline section>header h2{font-size:11px;margin:0;color:var(--muted-foreground);text-transform:uppercase;letter-spacing:.11em}.mnem-timeline-row{display:grid;grid-template-columns:30px minmax(0,1fr);gap:12px;padding:11px 0;border-bottom:1px solid var(--border)}.mnem-timeline-icon{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border:1px solid var(--border);border-radius:50%;color:var(--ui-accent)}.mnem-timeline-icon.is-triple{color:#34d399}.mnem-timeline-icon.is-consolidation{color:#f59e0b}.mnem-timeline-icon svg{width:13px}.mnem-timeline-row>div>div{display:flex;align-items:center;justify-content:space-between;gap:16px}.mnem-timeline-title{display:flex;align-items:center;gap:7px;min-width:0}.mnem-timeline-row strong{font-size:11px}.mnem-timeline-row span,.mnem-timeline-row p{color:var(--muted-foreground);font-size:10px}.mnem-timeline-row p{margin:4px 0 0;line-height:1.5}
    @media(max-width:900px){.mnem-header{padding:12px 18px}.mnem-content{padding:18px}.mnem-content.is-explore{padding:12px 18px 18px}.mnem-tabs{padding:0 18px}.mnem-overview-grid,.mnem-chart-grid{grid-template-columns:1fr}.mnem-stats{grid-template-columns:repeat(2,1fr)}.mnem-stat:nth-child(2){border-right:0}.mnem-stat:nth-child(-n+2){border-bottom:1px solid var(--border)}.mnem-detail{border-left:0;border-top:1px solid var(--border)}.mnem-browser-toolbar{align-items:stretch;flex-wrap:wrap}.mnem-browser-search{max-width:none;min-width:240px}.mnem-browser-layout.has-detail{grid-template-columns:1fr}.mnem-detail{position:relative;height:auto}.mnem-memory-row{grid-template-columns:minmax(0,1fr) 94px}.mnem-map-help{display:none}.mnem-map-search{width:130px}.mnem-map-modes{gap:4px}.mnem-profile span{display:none}}
  `}</style>
}

function MemoryPage({ ctx }: { ctx: PluginContext }) {
  const profile = useValue(host.state.profile)
  const [tab, setTab] = useState<'explore' | 'timeline' | 'memories' | 'stats'>('explore')
  const overview = useQuery<OverviewPayload, Error>({
    queryKey: [PLUGIN_ID, profile, 'overview'],
    queryFn: () => ctx.rest('/overview?days=30&map_limit=240'),
    refetchInterval: 15_000,
    staleTime: 8_000
  })

  return (
    <div className="mnem-page">
      <Styles />
      <header className="mnem-header">
        <div><span className="mnem-eyebrow">Mnemosyne</span><h1>Memory</h1></div>
        <Tip label="Memory follows Hermes' active profile. Switch profiles from the lower-left profile rail.">
          <div className="mnem-profile" tabIndex={0}><Database size={15} /><span>Active profile</span><strong>{overview.data?.profile || profile || 'coordinator'}</strong>{overview.isFetching && <RefreshCw className="animate-spin" size={13} />}</div>
        </Tip>
      </header>
      <Tabs className="mnem-tabs" onValueChange={value => setTab(value as typeof tab)} value={tab}>
        <TabsList>
          <TabsTrigger value="explore"><Starmap />Explore</TabsTrigger>
          <TabsTrigger value="timeline"><Clock />Timeline</TabsTrigger>
          <TabsTrigger value="memories"><Brain />Memories</TabsTrigger>
          <TabsTrigger value="stats"><Activity />Stats</TabsTrigger>
        </TabsList>
      </Tabs>
      <main className={`mnem-content${tab === 'explore' ? ' is-explore' : ''}`}>
        {(tab === 'explore' || tab === 'stats') && overview.isLoading && <div className="mnem-stack"><Skeleton className="h-24" /><Skeleton className="h-72" /><Skeleton className="h-96" /></div>}
        {(tab === 'explore' || tab === 'stats') && overview.isError && <ErrorState description={`${errorMessage(overview.error)} The native backend may need to be installed or restarted for this profile.`} title="Memory backend unavailable" />}
        {tab === 'explore' && overview.data && <ExplorerView ctx={ctx} data={overview.data} />}
        {tab === 'stats' && overview.data && <StatsView data={overview.data} />}
        {tab === 'timeline' && <TimelineView ctx={ctx} profile={profile} />}
        {tab === 'memories' && <MemoriesView capabilities={overview.data?.capabilities || { read: true, manage: false, forget: false }} ctx={ctx} profile={profile} />}
      </main>
    </div>
  )
}

const plugin: HermesPlugin = {
  id: PLUGIN_ID,
  name: 'Mnemosyne Memory',
  defaultEnabled: true,
  register(ctx) {
    ctx.registerMany([
      {
        id: 'route',
        area: ROUTES_AREA,
        title: 'Memory',
        data: { path: ROUTE },
        render: () => <MemoryPage ctx={ctx} />
      },
      {
        id: 'sidebar',
        area: SIDEBAR_NAV_AREA,
        order: 45,
        data: { path: ROUTE, label: 'Memory', codicon: 'graph' }
      },
      {
        id: 'open',
        area: PALETTE_AREA,
        data: {
          id: `${PLUGIN_ID}.open`,
          label: 'Open Mnemosyne memory',
          icon: Brain,
          keywords: ['memory', 'mnemosyne', 'graph', 'timeline', 'recall'],
          run: () => host.navigate(ROUTE)
        }
      }
    ])
  }
}

export default plugin
