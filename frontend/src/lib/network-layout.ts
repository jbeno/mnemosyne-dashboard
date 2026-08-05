import type { GraphEdge, GraphNode } from "@/lib/types"

export type NetworkMode = "graph" | "constellation" | "neural"

export type SpatialNode = GraphNode & {
  degree: number
  radius: number
  x: number
  y: number
  z: number
}

export type ProjectedNode = SpatialNode & {
  depth: number
  screenRadius: number
  screenX: number
  screenY: number
}

export function layoutNetwork(nodes: GraphNode[], edges: GraphEdge[], mode: NetworkMode): SpatialNode[] {
  const limited = nodes.slice(0, mode === "graph" ? 220 : 180).map((node) => ({ ...node }))
  const ids = new Set(limited.map((node) => node.id))
  const visibleEdges = edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target))
  const degree = new Map<string, number>()
  for (const edge of visibleEdges) {
    degree.set(edge.source, (degree.get(edge.source) || 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) || 0) + 1)
  }

  if (mode === "neural") return layoutNeural(limited, visibleEdges, degree)
  if (mode === "constellation") return layoutConstellation(limited, degree)
  return layoutGraph(limited, visibleEdges, degree)
}

export function projectNetwork(
  nodes: SpatialNode[],
  { yaw = 0.62, pitch = 0.38, perspective = 900 }: { yaw?: number; pitch?: number; perspective?: number } = {},
): ProjectedNode[] {
  const sinYaw = Math.sin(yaw)
  const cosYaw = Math.cos(yaw)
  const sinPitch = Math.sin(pitch)
  const cosPitch = Math.cos(pitch)

  return nodes.map((node) => {
    const yawX = node.x * cosYaw - node.z * sinYaw
    const yawZ = node.x * sinYaw + node.z * cosYaw
    const pitchY = node.y * cosPitch - yawZ * sinPitch
    const pitchZ = node.y * sinPitch + yawZ * cosPitch
    const scale = perspective / Math.max(380, perspective + pitchZ)
    return {
      ...node,
      depth: pitchZ,
      screenRadius: Math.max(2.8, node.radius * scale),
      screenX: 500 + yawX * scale,
      screenY: 310 + pitchY * scale,
    }
  })
}

export function limitNetworkEdges(edges: GraphEdge[], nodes: SpatialNode[], mode: NetworkMode) {
  const byId = new Set(nodes.map((node) => node.id))
  const degree = new Map<string, number>()
  const output: GraphEdge[] = []
  const edgeLimit = mode === "graph" ? 300 : mode === "neural" ? 170 : 150
  const degreeLimit = mode === "graph" ? 12 : mode === "neural" ? 6 : 5
  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue
    const sourceDegree = degree.get(edge.source) || 0
    const targetDegree = degree.get(edge.target) || 0
    if (sourceDegree >= degreeLimit || targetDegree >= degreeLimit) continue
    degree.set(edge.source, sourceDegree + 1)
    degree.set(edge.target, targetDegree + 1)
    output.push(edge)
    if (output.length >= edgeLimit) break
  }
  return output
}

function layoutConstellation(nodes: GraphNode[], degree: Map<string, number>): SpatialNode[] {
  const categories = [...new Set(nodes.map((node) => node.category || "Other"))]
  const categoryIndex = new Map(categories.map((category, index) => [category, index]))
  return nodes.map((node, index) => {
    const category = node.category || "Other"
    const cluster = categoryIndex.get(category) || 0
    const weight = Math.max(1, Number(node.weight || node.count || 1))
    const shell = node.kind === "memory" ? 1.08 : 0.72 + (cluster % 3) * 0.1
    const distance = 250 * shell + (index % 7) * 15 + Math.min(42, Math.sqrt(weight) * 5)
    const longitude = ((index * 137.508 + cluster * 23) % 360) * Math.PI / 180
    const latitudeSeed = (((index * 53 + cluster * 29) % 101) + 0.5) / 101
    const latitude = Math.acos(1 - 2 * latitudeSeed) - Math.PI / 2
    const radial = Math.cos(latitude)
    const orbitBias = Math.sin((index / Math.max(nodes.length, 1)) * Math.PI * 2 + cluster * 0.62) * 20
    const nodeDegree = degree.get(node.id) || 0
    return {
      ...node,
      degree: nodeDegree,
      radius: Math.min(13, 3.8 + Math.sqrt(weight + nodeDegree) * 1.75),
      x: Math.cos(longitude) * radial * distance,
      y: Math.sin(latitude) * distance * 0.9 + orbitBias,
      z: Math.sin(longitude) * radial * distance * 1.08 + Math.cos(longitude * 1.7 + cluster) * 46,
    }
  })
}

function layoutNeural(nodes: GraphNode[], edges: GraphEdge[], degree: Map<string, number>): SpatialNode[] {
  const categories = [...new Set(nodes.map((node) => node.category || "Other"))]
  const categoryIndex = new Map(categories.map((category, index) => [category, index]))
  const regionCount = Math.max(1, categories.length)
  const regions = new Map(categories.map((category, index) => {
    const angle = -Math.PI / 2 + (index / regionCount) * Math.PI * 2
    const distance = regionCount <= 2 ? 80 : 132 + (index % 2) * 18
    return [category, {
      angle,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * 0.94,
      z: (((index * 41) % 89) - 44) * 0.7,
    }]
  }))
  const byId = new Map<string, SpatialNode>()
  const entityRank = new Map<string, number>()
  const entities = nodes.filter((node) => node.kind !== "memory").sort((a, b) => score(b, degree) - score(a, degree))

  for (const node of entities) {
    const category = node.category || "Other"
    const cluster = categoryIndex.get(category) || 0
    const region = regions.get(category) || { angle: 0, x: 0, y: 0, z: 0 }
    const rank = entityRank.get(category) || 0
    entityRank.set(category, rank + 1)
    const orbit = rank === 0 ? 0 : 28 + Math.sqrt(rank) * 19
    const angle = region.angle + rank * 2.399963 + (cluster % 3) * 0.24
    const vertical = rank === 0 ? 0 : ((((rank * 37 + cluster * 11) % 89) + 0.5) / 89) * 2 - 1
    const radial = Math.sqrt(Math.max(0, 1 - vertical * vertical))
    const weight = Math.max(1, Number(node.weight || node.count || 1))
    const nodeDegree = degree.get(node.id) || 0
    byId.set(node.id, {
      ...node,
      degree: nodeDegree,
      radius: Math.min(13, 3.8 + Math.sqrt(weight + nodeDegree) * 1.7),
      x: region.x + Math.cos(angle) * radial * orbit,
      y: region.y + vertical * orbit * 0.86,
      z: region.z + Math.sin(angle) * radial * orbit * 0.8,
    })
  }

  nodes.filter((node) => node.kind === "memory").forEach((node, index) => {
    const category = node.category || "Other"
    const cluster = categoryIndex.get(category) || 0
    const region = regions.get(category) || { x: 0, y: 0, z: 0 }
    const link = edges.find((edge) => edge.source === node.id || edge.target === node.id)
    const parent = link ? byId.get(link.source === node.id ? link.target : link.source) : undefined
    const angle = ((index * 137.508 + cluster * 19) % 360) * Math.PI / 180
    const vertical = ((((index * 43 + cluster * 17) % 97) + 0.5) / 97) * 2 - 1
    const radial = Math.sqrt(Math.max(0, 1 - vertical * vertical))
    const weight = Math.max(1, Number(node.weight || node.count || 1))
    const distance = 44 + (index % 6) * 12 + Math.min(44, Math.sqrt(weight) * 9)
    const nodeDegree = degree.get(node.id) || 0
    byId.set(node.id, {
      ...node,
      degree: nodeDegree,
      radius: Math.min(12, 3.6 + Math.sqrt(weight + nodeDegree) * 1.55),
      x: (parent?.x ?? region.x) + Math.cos(angle) * radial * distance,
      y: (parent?.y ?? region.y) + vertical * distance * 0.82,
      z: (parent?.z ?? region.z) + Math.sin(angle) * radial * distance * 0.86,
    })
  })

  return nodes.map((node) => byId.get(node.id)).filter((node): node is SpatialNode => Boolean(node))
}

function layoutGraph(nodes: GraphNode[], edges: GraphEdge[], degree: Map<string, number>): SpatialNode[] {
  const ordered = [...nodes].sort((a, b) => score(b, degree) - score(a, degree))
  const components = connectedComponents(ordered, edges)
  const clusterKeys = [...new Set(ordered.map((node) => `${components.get(node.id) || 0}:${node.category || "Knowledge"}`))]
  const clusterIndex = new Map(clusterKeys.map((key, index) => [key, index]))
  const clusterCenters = new Map(clusterKeys.map((key, index) => {
    if (clusterKeys.length === 1) return [key, { x: 0, y: 0, z: 0 }]
    const latitude = Math.acos(1 - 2 * ((index + 0.5) / clusterKeys.length))
    const longitude = index * 2.399963
    const radius = 122 + Math.floor(index / 12) * 44
    return [key, {
      x: Math.cos(longitude) * Math.sin(latitude) * radius,
      y: Math.cos(latitude) * radius * 0.78,
      z: Math.sin(longitude) * Math.sin(latitude) * radius,
    }]
  }))
  const rankByCluster = new Map<string, number>()
  const positions = new Map(ordered.map((node) => {
    const key = `${components.get(node.id) || 0}:${node.category || "Knowledge"}`
    const center = clusterCenters.get(key) || { x: 0, y: 0, z: 0 }
    const rank = rankByCluster.get(key) || 0
    rankByCluster.set(key, rank + 1)
    const angle = rank * 2.399963 + (clusterIndex.get(key) || 0) * 0.31
    const distance = 12 + Math.sqrt(rank) * 24
    const vertical = ((((rank * 47) + (clusterIndex.get(key) || 0) * 13) % 101) + 0.5) / 101 * 2 - 1
    const radial = Math.sqrt(Math.max(0, 1 - vertical * vertical))
    return [node.id, {
      x: center.x + Math.cos(angle) * radial * distance,
      y: center.y + vertical * distance * 0.78,
      z: center.z + Math.sin(angle) * radial * distance,
    }]
  }))
  const visible = edges.filter((edge) => positions.has(edge.source) && positions.has(edge.target)).slice(0, 320)

  for (let iteration = 0; iteration < 90; iteration += 1) {
    const cooling = 1 - iteration / 110
    const force = new Map(ordered.map((node) => [node.id, { x: 0, y: 0 }]))
    for (let left = 0; left < ordered.length; left += 1) {
      for (let right = left + 1; right < ordered.length; right += 1) {
        const a = positions.get(ordered[left].id)!
        const b = positions.get(ordered[right].id)!
        const dx = a.x - b.x || 0.01
        const dy = a.y - b.y || 0.01
        const distanceSquared = Math.max(120, dx * dx + dy * dy)
        const strength = 5200 / distanceSquared
        const distance = Math.sqrt(distanceSquared)
        force.get(ordered[left].id)!.x += dx / distance * strength
        force.get(ordered[left].id)!.y += dy / distance * strength
        force.get(ordered[right].id)!.x -= dx / distance * strength
        force.get(ordered[right].id)!.y -= dy / distance * strength
      }
    }
    for (const edge of visible) {
      const a = positions.get(edge.source)!
      const b = positions.get(edge.target)!
      const dx = b.x - a.x
      const dy = b.y - a.y
      const distance = Math.max(1, Math.hypot(dx, dy))
      const strength = (distance - 92) * 0.008
      force.get(edge.source)!.x += dx / distance * strength
      force.get(edge.source)!.y += dy / distance * strength
      force.get(edge.target)!.x -= dx / distance * strength
      force.get(edge.target)!.y -= dy / distance * strength
    }
    for (const node of ordered) {
      const position = positions.get(node.id)!
      const delta = force.get(node.id)!
      const key = `${components.get(node.id) || 0}:${node.category || "Knowledge"}`
      const center = clusterCenters.get(key) || { x: 0, y: 0, z: 0 }
      delta.x += (center.x - position.x) * 0.004
      delta.y += (center.y - position.y) * 0.004
      position.x = clamp(position.x * 0.996 + delta.x * cooling, -405, 405)
      position.y = clamp(position.y * 0.996 + delta.y * cooling, -245, 245)
    }
  }

  return ordered.map((node) => {
    const position = positions.get(node.id)!
    const nodeDegree = degree.get(node.id) || 0
    const weight = Math.max(1, Number(node.count || node.weight || 1))
    return {
      ...node,
      degree: nodeDegree,
      radius: Math.min(14, 4 + Math.sqrt(weight + nodeDegree) * 1.8),
      x: position.x,
      y: position.y,
      z: position.z,
    }
  })
}

function connectedComponents(nodes: GraphNode[], edges: GraphEdge[]) {
  const parent = new Map(nodes.map((node) => [node.id, node.id]))
  const find = (id: string): string => {
    const current = parent.get(id) || id
    if (current === id) return id
    const root = find(current)
    parent.set(id, root)
    return root
  }
  const join = (left: string, right: string) => {
    const leftRoot = find(left)
    const rightRoot = find(right)
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot)
  }
  for (const edge of edges) if (parent.has(edge.source) && parent.has(edge.target)) join(edge.source, edge.target)
  const roots = [...new Set(nodes.map((node) => find(node.id)))]
  const rootIndex = new Map(roots.map((root, index) => [root, index]))
  return new Map(nodes.map((node) => [node.id, rootIndex.get(find(node.id)) || 0]))
}

function score(node: GraphNode, degree: Map<string, number>) {
  return Number(node.weight || node.count || 1) + (degree.get(node.id) || 0) * 1.4
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}
