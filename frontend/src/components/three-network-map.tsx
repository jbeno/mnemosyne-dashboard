import { useEffect, useMemo, useRef, useState } from "react"
import { Maximize2, Minimize2, Pause, Play, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { layoutNetwork, limitNetworkEdges, type NetworkMode, type SpatialNode } from "@/lib/network-layout"
import type { GraphEdge, GraphNode } from "@/lib/types"

type RendererControls = { reset: () => void }

export function ThreeNetworkMap({
  edges,
  mode,
  nodes,
  onSelect,
  selectedId,
}: {
  edges: GraphEdge[]
  mode: Exclude<NetworkMode, "graph">
  nodes: GraphNode[]
  onSelect?: (node: GraphNode) => void
  selectedId?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<RendererControls | null>(null)
  const onSelectRef = useRef(onSelect)
  const selectedIdRef = useRef(selectedId)
  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const [error, setError] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [paused, setPaused] = useState(reducedMotion)
  const pausedRef = useRef(paused)
  const spatial = useMemo(() => layoutNetwork(nodes, edges, mode), [edges, mode, nodes])
  const visibleEdges = useMemo(() => limitNetworkEdges(edges, spatial, mode), [edges, mode, spatial])
  const selectedNode = selectedId ? spatial.find((node) => node.id === selectedId) : undefined

  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])
  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener("fullscreenchange", update)
    return () => document.removeEventListener("fullscreenchange", update)
  }, [])

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
        renderer.domElement.style.height = "100%"
        renderer.domElement.style.width = "100%"
        host.replaceChildren(renderer.domElement)

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
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x6f88a8, opacity: mode === "neural" ? 0.34 : 0.24, transparent: true })
        group.add(new THREE.LineSegments(lineGeometry, lineMaterial))

        const sphereGeometry = new THREE.SphereGeometry(1, 14, 10)
        const meshes: Array<{ baseScale: number; mesh: any; node: SpatialNode }> = []
        const categories = [...new Set(spatial.map((node) => node.category || "Other"))]
        for (const node of spatial) {
          const color = node.kind === "memory" ? 0xe6a54a : clusterColor(categories.indexOf(node.category || "Other"))
          const material = new THREE.MeshBasicMaterial({ color, opacity: node.kind === "memory" ? 0.96 : 0.86, transparent: true })
          const mesh = new THREE.Mesh(sphereGeometry, material)
          const baseScale = Math.max(3.4, node.radius * 1.25)
          mesh.position.set(node.x, node.y, node.z)
          mesh.scale.setScalar(baseScale)
          mesh.userData.node = node
          group.add(mesh)
          meshes.push({ baseScale, mesh, node })
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

        let yaw = mode === "neural" ? 0.12 : 0.7
        let pitch = mode === "neural" ? 0.1 : 0.55
        let cameraZ = mode === "neural" ? 560 : 720
        let dragging: { moved: boolean; pitch: number; pointerId: number; x: number; y: number; yaw: number } | null = null
        const reset = () => {
          yaw = mode === "neural" ? 0.12 : 0.7
          pitch = mode === "neural" ? 0.1 : 0.55
          cameraZ = mode === "neural" ? 560 : 720
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
        const pick = (event: PointerEvent) => {
          const rect = renderer.domElement.getBoundingClientRect()
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
          raycaster.setFromCamera(pointer, camera)
          const hit = raycaster.intersectObjects(meshes.map((item) => item.mesh), false)[0]
          const node = hit?.object?.userData?.node as GraphNode | undefined
          if (node) onSelectRef.current?.(node)
        }
        const pointerDown = (event: PointerEvent) => {
          dragging = { moved: false, pitch, pointerId: event.pointerId, x: event.clientX, y: event.clientY, yaw }
          renderer.domElement.setPointerCapture(event.pointerId)
        }
        const pointerMove = (event: PointerEvent) => {
          if (!dragging || dragging.pointerId !== event.pointerId) return
          const dx = event.clientX - dragging.x
          const dy = event.clientY - dragging.y
          if (Math.abs(dx) + Math.abs(dy) > 3) dragging.moved = true
          yaw = dragging.yaw + dx * 0.006
          pitch = Math.max(-1.15, Math.min(1.15, dragging.pitch + dy * 0.004))
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
          cameraZ = Math.max(180, Math.min(1500, cameraZ * Math.exp(event.deltaY * 0.001)))
        }
        renderer.domElement.addEventListener("pointerdown", pointerDown)
        renderer.domElement.addEventListener("pointermove", pointerMove)
        renderer.domElement.addEventListener("pointerup", pointerUp)
        renderer.domElement.addEventListener("pointercancel", pointerUp)
        renderer.domElement.addEventListener("wheel", wheel, { passive: false })

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
          for (const item of meshes) {
            const target = item.node.id === selectedIdRef.current ? item.baseScale * 1.55 : item.baseScale
            const next = item.mesh.scale.x + (target - item.mesh.scale.x) * 0.16
            item.mesh.scale.setScalar(next)
          }
          renderer.render(scene, camera)
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
          renderer.domElement.removeEventListener("wheel", wheel)
          sphereGeometry.dispose()
          lineGeometry.dispose()
          lineMaterial.dispose()
          starGeometry.dispose()
          starMaterial.dispose()
          for (const item of meshes) item.mesh.material.dispose()
          renderer.dispose()
          renderer.domElement.remove()
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
  }, [mode, spatial, visibleEdges])

  const toggleFullscreen = async () => {
    if (!containerRef.current || !document.fullscreenEnabled) return
    if (document.fullscreenElement === containerRef.current) await document.exitFullscreen()
    else await containerRef.current.requestFullscreen()
  }

  return (
    <div className="relative min-h-[34rem] overflow-hidden rounded-lg border bg-[radial-gradient(circle_at_center,color-mix(in_oklch,var(--primary)_8%,transparent),transparent_62%)] fullscreen:min-h-screen fullscreen:rounded-none fullscreen:border-0" ref={containerRef}>
      <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-md border bg-background/90 p-1 shadow-sm backdrop-blur">
        <Button aria-label={paused ? "Resume rotation" : "Pause rotation"} onClick={() => setPaused((value) => !value)} size="icon" variant="ghost">{paused ? <Play /> : <Pause />}</Button>
        <Button aria-label="Reset 3D view" onClick={() => controlsRef.current?.reset()} size="icon" variant="ghost"><RotateCcw /></Button>
        {document.fullscreenEnabled ? <Button aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} onClick={() => void toggleFullscreen()} size="icon" variant="ghost">{fullscreen ? <Minimize2 /> : <Maximize2 />}</Button> : null}
      </div>
      <div className={fullscreen ? "h-screen" : "h-[34rem]"} ref={hostRef} />
      {loading ? <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">Preparing the 3D map…</div> : null}
      {error ? <div className="absolute inset-0 grid place-items-center px-8 text-center"><p className="max-w-md text-sm leading-6 text-muted-foreground">3D view unavailable: {error}. The 2D view remains available.</p></div> : null}
      {selectedNode ? <div className="pointer-events-none absolute bottom-4 left-4 max-w-sm border-l-2 border-primary bg-background/90 px-4 py-3 text-sm shadow-lg backdrop-blur"><p className="font-semibold">{selectedNode.label}</p><p className="mt-1 text-xs text-muted-foreground">{selectedNode.kind || "entity"}{selectedNode.category ? ` · ${selectedNode.category}` : ""} · {selectedNode.degree} connections</p></div> : null}
      <p className="pointer-events-none absolute bottom-3 right-3 hidden text-xs text-muted-foreground sm:block">Drag to orbit · scroll to zoom · select a node to inspect</p>
    </div>
  )
}

function clusterColor(index: number) {
  const colors = [0x76b8d8, 0x78c8ad, 0x9d91d4, 0xd39b78, 0x82a6d8, 0xb9a66f, 0x79b8b4]
  return colors[Math.abs(index) % colors.length]
}
