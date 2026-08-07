import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from "react"
import { Maximize2, Minimize2, Pause, Play, RotateCcw, Tags } from "lucide-react"

import { CanvasTooltip, FullscreenInspectorPanel, NetworkDimensionTabs, NetworkSearchControl, type NetworkDimension } from "@/components/network-canvas-controls"
import { NetworkLegend } from "@/components/network-legend"
import { Button } from "@/components/ui/button"
import { networkNodeColor, type NetworkColorMode } from "@/lib/network-appearance"
import { layoutNetwork, limitNetworkEdges, type NetworkMode, type SpatialNode } from "@/lib/network-layout"
import { networkNodeMatchesSearch } from "@/lib/network-search"
import type { GraphEdge, GraphNode } from "@/lib/types"

type RendererControls = { reset: () => void }
type HoverTip = { detail: string; label: string; x: number; y: number }

export function ThreeNetworkMap({
  colorMode,
  edges,
  fullscreenPanel,
  fullscreenTargetRef,
  mode,
  nodes,
  onClearSelection,
  onColorModeChange,
  onDimensionChange,
  onSearchQueryChange,
  onSelect,
  dimension = "3d",
  searchQuery = "",
  selectedId,
  showEdgeLabels = false,
}: {
  colorMode: NetworkColorMode
  edges: GraphEdge[]
  fullscreenPanel?: ReactNode
  fullscreenTargetRef?: RefObject<HTMLElement | null>
  mode: NetworkMode
  nodes: GraphNode[]
  onClearSelection?: () => void
  onColorModeChange: (mode: NetworkColorMode) => void
  onDimensionChange?: (dimension: NetworkDimension) => void
  onSearchQueryChange?: (query: string) => void
  onSelect?: (node: GraphNode) => void
  dimension?: NetworkDimension
  searchQuery?: string
  selectedId?: string
  showEdgeLabels?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<RendererControls | null>(null)
  const onClearSelectionRef = useRef(onClearSelection)
  const onSelectRef = useRef(onSelect)
  const selectedIdRef = useRef(selectedId)
  const labelsVisibleRef = useRef(true)
  const searchQueryRef = useRef(searchQuery)
  const searchMatchIdsRef = useRef<Set<string>>(new Set())
  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const [error, setError] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [hoverTip, setHoverTip] = useState<HoverTip | null>(null)
  const [labelsVisible, setLabelsVisible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [paused, setPaused] = useState(reducedMotion)
  const pausedRef = useRef(paused)
  const spatial = useMemo(() => layoutNetwork(nodes, edges, mode), [edges, mode, nodes])
  const visibleEdges = useMemo(() => limitNetworkEdges(edges, spatial, mode), [edges, mode, spatial])
  const searchMatchIds = useMemo(() => new Set(spatial.filter((node) => networkNodeMatchesSearch(node, searchQuery)).map((node) => node.id)), [searchQuery, spatial])
  const selectedNode = selectedId ? spatial.find((node) => node.id === selectedId) : undefined

  useEffect(() => { onClearSelectionRef.current = onClearSelection }, [onClearSelection])
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])
  useEffect(() => { labelsVisibleRef.current = labelsVisible }, [labelsVisible])
  useEffect(() => { searchQueryRef.current = searchQuery; searchMatchIdsRef.current = searchMatchIds }, [searchMatchIds, searchQuery])
  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === (fullscreenTargetRef?.current || containerRef.current))
    update()
    document.addEventListener("fullscreenchange", update)
    return () => document.removeEventListener("fullscreenchange", update)
  }, [fullscreenTargetRef])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !spatial.length) {
      setLoading(false)
      return
    }
    let disposed = false
    let frame = 0
    const cleanupRef = { current: null as null | (() => void) }
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const threeModulePath = "/static/vendor/three.module.min.js"
        const THREE = await import(/* @vite-ignore */ threeModulePath)
        if (disposed) return

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.setClearColor(0x000000, 0)
        renderer.domElement.setAttribute("aria-label", `${mode} interactive 3D relationship map`)
        renderer.domElement.setAttribute("role", "img")
        renderer.domElement.style.display = "block"
        renderer.domElement.style.backgroundColor = "var(--background)"
        renderer.domElement.style.height = "100%"
        renderer.domElement.style.width = "100%"
        host.replaceChildren(renderer.domElement)
        host.style.backgroundColor = "var(--background)"

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(48, 1, 1, 5000)
        const group = new THREE.Group()
        scene.add(group)
        const byId = new Map(spatial.map((node) => [node.id, node]))

        const linePositions: number[] = []
        for (const edge of visibleEdges) {
          const source = byId.get(edge.source)
          const target = byId.get(edge.target)
          if (!source || !target) continue
          linePositions.push(source.x, source.y, source.z, target.x, target.y, target.z)
        }
        const lineGeometry = new THREE.BufferGeometry()
        lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3))
        const baseLineOpacity = mode === "neural" ? 0.34 : 0.24
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x6f88a8, opacity: baseLineOpacity, transparent: true })
        group.add(new THREE.LineSegments(lineGeometry, lineMaterial))
        const highlightGeometry = new THREE.BufferGeometry()
        const highlightMaterial = new THREE.LineBasicMaterial({ color: 0xe6a54a, depthTest: false, opacity: 0.98, transparent: true })
        const highlightLines = new THREE.LineSegments(highlightGeometry, highlightMaterial)
        highlightLines.renderOrder = 10
        highlightLines.visible = false
        group.add(highlightLines)

        const sphereGeometry = new THREE.SphereGeometry(1, 18, 12)
        const meshes: Array<{ baseOpacity: number; baseScale: number; color: string; mesh: any; node: SpatialNode }> = []
        for (const node of spatial) {
          const color = networkNodeColor(node, mode, colorMode)
          const baseOpacity = node.kind === "memory" ? 0.96 : 0.86
          const material = new THREE.MeshBasicMaterial({ color, opacity: baseOpacity, transparent: true })
          const mesh = new THREE.Mesh(sphereGeometry, material)
          const baseScale = Math.max(3.4, node.radius * 1.25)
          mesh.position.set(node.x, node.y, node.z)
          mesh.scale.setScalar(baseScale)
          mesh.userData.node = node
          group.add(mesh)
          meshes.push({ baseOpacity, baseScale, color, mesh, node })
        }
        const meshById = new Map(meshes.map((item) => [item.node.id, item.mesh]))
        host.style.position = "relative"
        const labelLayer = document.createElement("div")
        labelLayer.setAttribute("aria-hidden", "true")
        labelLayer.style.inset = "0"
        labelLayer.style.overflow = "hidden"
        labelLayer.style.pointerEvents = "none"
        labelLayer.style.position = "absolute"
        labelLayer.style.zIndex = "4"
        host.append(labelLayer)
        const largestNodeRadius = Math.max(0, ...spatial.map((node) => node.radius))
        const labelRadiusThreshold = Math.max(7.2, largestNodeRadius * 0.6)
        const importantNodeIds = new Set(spatial
          .filter((node) => node.radius >= labelRadiusThreshold)
          .map((node) => node.id))
        const importantEdgeIds = new Set(visibleEdges
          .filter((edge) => edge.predicate || edge.label)
          .sort((left, right) => {
            const leftScore = (byId.get(left.source)?.degree || 0) + (byId.get(left.target)?.degree || 0)
            const rightScore = (byId.get(right.source)?.degree || 0) + (byId.get(right.target)?.degree || 0)
            return rightScore - leftScore
          })
          .slice(0, mode === "graph" ? 28 : 16)
          .map((edge) => edge.id))
        const nodeLabels = new Map<string, { element: HTMLSpanElement; node: SpatialNode }>(spatial.map((node) => {
          const element = createMapLabel(shortNodeLabel(node.label), "node")
          labelLayer.append(element)
          return [node.id, { element, node }] as const
        }))
        const edgeLabels = new Map<string, { edge: GraphEdge; element: HTMLSpanElement }>()
        if (showEdgeLabels) for (const edge of visibleEdges.filter((item) => item.predicate || item.label)) {
          const element = createMapLabel(shortEdgeLabel(edge.predicate || edge.label || "related"), "edge")
          labelLayer.append(element)
          edgeLabels.set(edge.id, { edge, element })
        }

        const starCount = 280
        const starPositions = new Float32Array(starCount * 3)
        for (let index = 0; index < starCount; index += 1) {
          const distance = 520 + (index * 37) % 430
          const angle = index * 2.17
          const latitude = (((index * 53) % 180) - 90) * Math.PI / 180
          starPositions.set([
            Math.cos(angle) * Math.cos(latitude) * distance,
            Math.sin(latitude) * distance,
            Math.sin(angle) * Math.cos(latitude) * distance,
          ], index * 3)
        }
        const starGeometry = new THREE.BufferGeometry()
        starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3))
        const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, opacity: 0.26, size: 1.25, transparent: true })
        scene.add(new THREE.Points(starGeometry, starMaterial))

        let yaw = mode === "neural" ? 0.12 : mode === "graph" ? 0.18 : 0.7
        let pitch = mode === "neural" ? 0.1 : mode === "graph" ? 0.2 : 0.55
        let cameraZ = mode === "neural" ? 560 : mode === "graph" ? 760 : 720
        let dragging: { moved: boolean; pitch: number; pointerId: number; x: number; y: number; yaw: number } | null = null
        const reset = () => {
          yaw = mode === "neural" ? 0.12 : mode === "graph" ? 0.18 : 0.7
          pitch = mode === "neural" ? 0.1 : mode === "graph" ? 0.2 : 0.55
          cameraZ = mode === "neural" ? 560 : mode === "graph" ? 760 : 720
        }
        controlsRef.current = { reset }

        const resize = () => {
          const rect = host.getBoundingClientRect()
          const width = Math.max(320, rect.width)
          const height = Math.max(360, rect.height)
          renderer.setSize(width, height, false)
          camera.aspect = width / height
          camera.updateProjectionMatrix()
        }
        const resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(host)
        resize()

        const raycaster = new THREE.Raycaster()
        const pointer = new THREE.Vector2()
        const hitAt = (event: PointerEvent) => {
          const rect = renderer.domElement.getBoundingClientRect()
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
          raycaster.setFromCamera(pointer, camera)
          return raycaster.intersectObjects(meshes.map((item) => item.mesh), false)[0]?.object?.userData?.node as SpatialNode | undefined
        }
        const pick = (event: PointerEvent) => {
          const node = hitAt(event)
          if (node) onSelectRef.current?.(node)
          else onClearSelectionRef.current?.()
        }
        const pointerDown = (event: PointerEvent) => {
          dragging = { moved: false, pitch, pointerId: event.pointerId, x: event.clientX, y: event.clientY, yaw }
          renderer.domElement.setPointerCapture(event.pointerId)
        }
        const pointerMove = (event: PointerEvent) => {
          if (dragging && dragging.pointerId === event.pointerId) {
            const dx = event.clientX - dragging.x
            const dy = event.clientY - dragging.y
            if (Math.abs(dx) + Math.abs(dy) > 3) dragging.moved = true
            yaw = dragging.yaw + dx * 0.006
            pitch = Math.max(-1.15, Math.min(1.15, dragging.pitch + dy * 0.004))
            setHoverTip(null)
            return
          }
          const node = hitAt(event)
          renderer.domElement.style.cursor = node ? "pointer" : "grab"
          if (node) {
            const rect = host.getBoundingClientRect()
            setHoverTip({ detail: `${node.degree} connection${node.degree === 1 ? "" : "s"}${node.category ? ` · ${node.category}` : ""}`, label: node.label, x: event.clientX - rect.left + 12, y: event.clientY - rect.top + 12 })
          } else setHoverTip(null)
        }
        const pointerUp = (event: PointerEvent) => {
          if (!dragging || dragging.pointerId !== event.pointerId) return
          const moved = dragging.moved
          dragging = null
          renderer.domElement.releasePointerCapture(event.pointerId)
          if (!moved) pick(event)
        }
        const wheel = (event: WheelEvent) => {
          event.preventDefault()
          cameraZ = Math.max(180, Math.min(2600, cameraZ * Math.exp(event.deltaY * 0.001)))
        }
        const pointerLeave = () => setHoverTip(null)
        renderer.domElement.addEventListener("pointerdown", pointerDown)
        renderer.domElement.addEventListener("pointermove", pointerMove)
        renderer.domElement.addEventListener("pointerup", pointerUp)
        renderer.domElement.addEventListener("pointercancel", pointerUp)
        renderer.domElement.addEventListener("pointerleave", pointerLeave)
        renderer.domElement.addEventListener("wheel", wheel, { passive: false })

        const worldPosition = new THREE.Vector3()
        let styledFor = ""
        let connectedIds = new Set<string>()
        const updateSelection = (selection: string | undefined) => {
          connectedIds = new Set(selection ? [selection] : [])
          const positions: number[] = []
          if (selection) {
            for (const edge of visibleEdges) {
              if (edge.source !== selection && edge.target !== selection) continue
              const source = byId.get(edge.source)
              const target = byId.get(edge.target)
              if (!source || !target) continue
              connectedIds.add(edge.source)
              connectedIds.add(edge.target)
              positions.push(source.x, source.y, source.z, target.x, target.y, target.z)
            }
          }
          highlightGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
          if (positions.length) highlightGeometry.computeBoundingSphere()
          highlightLines.visible = positions.length > 0
          const searchActive = Boolean(searchQueryRef.current.trim())
          lineMaterial.opacity = selection || searchActive ? baseLineOpacity * 0.5 : baseLineOpacity
          for (const item of meshes) {
            const searchMatch = !searchActive || searchMatchIdsRef.current.has(item.node.id)
            const associated = (!selection || connectedIds.has(item.node.id)) && searchMatch
            item.mesh.material.color.set(item.color)
            item.mesh.material.opacity = associated ? item.baseOpacity : searchActive ? Math.max(0.14, item.baseOpacity * 0.2) : Math.max(0.34, item.baseOpacity * 0.46)
          }
          styledFor = `${selection || ""}\n${searchQueryRef.current}`
        }
        const positionLabels = () => {
          const width = Math.max(1, host.clientWidth)
          const height = Math.max(1, host.clientHeight)
          group.updateMatrixWorld(true)
          for (const { element, node } of nodeLabels.values()) {
            const neighborhood = connectedIds.has(node.id)
            const searchActive = Boolean(searchQueryRef.current.trim())
            const searchMatch = searchActive && searchMatchIdsRef.current.has(node.id)
            const visible = searchActive ? searchMatch : neighborhood || (labelsVisibleRef.current && importantNodeIds.has(node.id))
            if (!visible) {
              element.style.display = "none"
              continue
            }
            const mesh = meshById.get(node.id)
            if (!mesh) continue
            mesh.getWorldPosition(worldPosition)
            worldPosition.project(camera)
            if (worldPosition.z < -1 || worldPosition.z > 1) {
              element.style.display = "none"
              continue
            }
            element.style.display = "block"
            element.style.fontWeight = node.id === selectedIdRef.current ? "700" : neighborhood || searchMatch ? "600" : "500"
            element.style.opacity = neighborhood || searchMatch ? "1" : "0.82"
            element.style.transform = `translate(-50%, -50%) translate(${(worldPosition.x * 0.5 + 0.5) * width}px, ${(-worldPosition.y * 0.5 + 0.5) * height}px)`
          }
          for (const { edge, element } of edgeLabels.values()) {
            const neighborhood = Boolean(selectedIdRef.current && (edge.source === selectedIdRef.current || edge.target === selectedIdRef.current))
            const visible = !searchQueryRef.current.trim() && (neighborhood || (labelsVisibleRef.current && importantEdgeIds.has(edge.id)))
            const source = byId.get(edge.source)
            const target = byId.get(edge.target)
            if (!visible || !source || !target) {
              element.style.display = "none"
              continue
            }
            worldPosition.set((source.x + target.x) / 2, (source.y + target.y) / 2, (source.z + target.z) / 2)
            group.localToWorld(worldPosition)
            worldPosition.project(camera)
            if (worldPosition.z < -1 || worldPosition.z > 1) {
              element.style.display = "none"
              continue
            }
            element.style.display = "block"
            element.style.opacity = neighborhood ? "1" : "0.72"
            element.style.transform = `translate(-50%, -50%) translate(${(worldPosition.x * 0.5 + 0.5) * width}px, ${(-worldPosition.y * 0.5 + 0.5) * height}px)`
          }
        }

        let previous = 0
        const animate = (time: number) => {
          if (disposed) return
          const delta = previous ? Math.min(48, time - previous) : 16
          previous = time
          if (!pausedRef.current && !dragging) yaw += delta * (mode === "neural" ? 0.00009 : 0.000055)
          group.rotation.y = yaw
          group.rotation.x = pitch
          camera.position.set(0, mode === "neural" ? -8 : -42, cameraZ)
          camera.lookAt(0, 0, 0)
          const nextStyleKey = `${selectedIdRef.current || ""}\n${searchQueryRef.current}`
          if (styledFor !== nextStyleKey) updateSelection(selectedIdRef.current)
          for (const item of meshes) {
            const searchMatch = Boolean(searchQueryRef.current.trim()) && searchMatchIdsRef.current.has(item.node.id)
            const target = item.node.id === selectedIdRef.current ? item.baseScale * 1.55 : connectedIds.has(item.node.id) || searchMatch ? item.baseScale * 1.18 : item.baseScale
            const next = item.mesh.scale.x + (target - item.mesh.scale.x) * 0.16
            item.mesh.scale.setScalar(next)
          }
          renderer.render(scene, camera)
          positionLabels()
          frame = requestAnimationFrame(animate)
        }
        frame = requestAnimationFrame(animate)
        setLoading(false)

        const dispose = () => {
          resizeObserver.disconnect()
          renderer.domElement.removeEventListener("pointerdown", pointerDown)
          renderer.domElement.removeEventListener("pointermove", pointerMove)
          renderer.domElement.removeEventListener("pointerup", pointerUp)
          renderer.domElement.removeEventListener("pointercancel", pointerUp)
          renderer.domElement.removeEventListener("pointerleave", pointerLeave)
          renderer.domElement.removeEventListener("wheel", wheel)
          sphereGeometry.dispose()
          lineGeometry.dispose()
          lineMaterial.dispose()
          highlightGeometry.dispose()
          highlightMaterial.dispose()
          starGeometry.dispose()
          starMaterial.dispose()
          for (const item of meshes) {
            item.mesh.material.dispose()
          }
          renderer.dispose()
          renderer.domElement.remove()
          labelLayer.remove()
        }
        if (disposed) dispose()
        else cleanupRef.current = dispose
      } catch (cause) {
        if (!disposed) {
          setError(cause instanceof Error ? cause.message : "The 3D renderer could not be started.")
          setLoading(false)
        }
      }
    })()

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      cleanupRef.current?.()
      controlsRef.current = null
    }
  }, [colorMode, mode, showEdgeLabels, spatial, visibleEdges])

  const toggleFullscreen = async () => {
    const target = fullscreenTargetRef?.current || containerRef.current
    if (!target || !document.fullscreenEnabled) return
    if (document.fullscreenElement === target) await document.exitFullscreen()
    else await target.requestFullscreen()
  }

  return (
    <div className={`relative min-h-[34rem] overflow-hidden rounded-lg border bg-background/35 fullscreen:min-h-screen fullscreen:rounded-none fullscreen:border-0 fullscreen:bg-background ${fullscreen ? "min-h-screen rounded-none border-0 bg-background" : ""}`} ref={containerRef}>
      {onDimensionChange ? <div className="absolute left-3 top-3 z-40"><NetworkDimensionTabs dimension={dimension} onChange={onDimensionChange} /></div> : null}
      <div className="absolute right-3 top-3 z-40 flex gap-1 rounded-md border bg-background/90 p-1 shadow-sm backdrop-blur">
        {onSearchQueryChange ? <NetworkSearchControl matchCount={searchMatchIds.size} onChange={onSearchQueryChange} query={searchQuery} /> : null}
        <CanvasTooltip label={paused ? "Resume rotation" : "Pause rotation"}><Button aria-label={paused ? "Resume rotation" : "Pause rotation"} onClick={() => setPaused((value) => !value)} size="icon" variant="ghost">{paused ? <Play /> : <Pause />}</Button></CanvasTooltip>
        <CanvasTooltip label="Reset 3D view"><Button aria-label="Reset 3D view" onClick={() => controlsRef.current?.reset()} size="icon" variant="ghost"><RotateCcw /></Button></CanvasTooltip>
        <CanvasTooltip label={labelsVisible ? "Hide priority labels" : "Show priority labels"}><Button aria-label={labelsVisible ? "Hide priority labels" : "Show priority labels"} aria-pressed={labelsVisible} onClick={() => setLabelsVisible((value) => !value)} size="icon" variant={labelsVisible ? "secondary" : "ghost"}><Tags /></Button></CanvasTooltip>
        {document.fullscreenEnabled ? <CanvasTooltip label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}><Button aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} onClick={() => void toggleFullscreen()} size="icon" variant="ghost">{fullscreen ? <Minimize2 /> : <Maximize2 />}</Button></CanvasTooltip> : null}
      </div>
      <div className={fullscreen ? "h-screen" : "h-[34rem]"} ref={hostRef} />
      {loading ? <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">Preparing the 3D map…</div> : null}
      {error ? <div className="absolute inset-0 grid place-items-center px-8 text-center"><p className="max-w-md text-sm leading-6 text-muted-foreground">3D view unavailable: {error}. The 2D view remains available.</p></div> : null}
      {hoverTip ? <div className="pointer-events-none absolute z-20 max-w-64 rounded-md border bg-popover/95 px-2.5 py-2 text-xs shadow-lg backdrop-blur" style={{ left: Math.max(8, Math.min(hoverTip.x, (containerRef.current?.clientWidth || 320) - 270)), top: Math.max(8, Math.min(hoverTip.y, (containerRef.current?.clientHeight || 320) - 72)) }}><p className="truncate font-medium text-popover-foreground">{hoverTip.label}</p><p className="mt-0.5 truncate text-muted-foreground">{hoverTip.detail}</p></div> : null}
      {fullscreen && selectedNode && fullscreenPanel ? <FullscreenInspectorPanel onClose={() => onClearSelection?.()}>{fullscreenPanel}</FullscreenInspectorPanel> : null}
      {selectedNode && !fullscreenPanel ? <div className="pointer-events-none absolute bottom-4 left-4 max-w-sm border-l-2 border-primary bg-background/90 px-4 py-3 text-sm shadow-lg backdrop-blur"><p className="font-semibold">{selectedNode.label}</p><p className="mt-1 text-xs text-muted-foreground">{selectedNode.kind || "entity"}{selectedNode.category ? ` · ${selectedNode.category}` : ""} · {selectedNode.degree} connections</p></div> : null}
      <NetworkLegend colorMode={colorMode} mode={mode} nodes={nodes} onColorModeChange={onColorModeChange} />
      <p className="pointer-events-none absolute bottom-3 right-3 hidden text-xs text-muted-foreground sm:block">Drag to orbit · scroll to zoom · select a node to inspect</p>
    </div>
  )
}

function createMapLabel(text: string, kind: "edge" | "node") {
  const element = document.createElement("span")
  element.textContent = text
  element.style.background = kind === "edge" ? "color-mix(in oklch, var(--background) 82%, transparent)" : "color-mix(in oklch, var(--background) 90%, transparent)"
  element.style.border = kind === "node" ? "1px solid color-mix(in oklch, var(--border) 75%, transparent)" : "0"
  element.style.borderRadius = "999px"
  element.style.color = kind === "edge" ? "var(--primary)" : "var(--foreground)"
  element.style.fontSize = kind === "edge" ? "10px" : "11px"
  element.style.left = "0"
  element.style.lineHeight = "1"
  element.style.maxWidth = kind === "edge" ? "9rem" : "12rem"
  element.style.overflow = "hidden"
  element.style.padding = kind === "edge" ? "2px 4px" : "4px 7px"
  element.style.position = "absolute"
  element.style.textOverflow = "ellipsis"
  element.style.top = "0"
  element.style.whiteSpace = "nowrap"
  element.style.willChange = "transform"
  return element
}

function shortNodeLabel(value: string) {
  const clean = value.replace(/^memory:/, "Memory ")
  return clean.length > 28 ? `${clean.slice(0, 25)}…` : clean
}

function shortEdgeLabel(value: string) {
  return value.length > 18 ? `${value.slice(0, 16)}…` : value
}
