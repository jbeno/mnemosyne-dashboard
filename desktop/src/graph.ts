import type { GraphEdge, GraphNode } from './types'

export interface PositionedNode extends GraphNode {
  x: number
  y: number
  z: number
  radius: number
}

function hash(value: string): number {
  let result = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

function seededUnit(value: string): number {
  return (hash(value) % 100_000) / 100_000
}

export function layoutGraph(nodes: GraphNode[], edges: GraphEdge[]): PositionedNode[] {
  const degree = new Map<string, number>()
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
  }

  const ordered = [...nodes].sort((a, b) => {
    const degreeDelta = (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0)
    return degreeDelta || (b.weight ?? 0) - (a.weight ?? 0) || a.id.localeCompare(b.id)
  })
  const golden = Math.PI * (3 - Math.sqrt(5))

  return ordered.map((node, index) => {
    const normalized = ordered.length <= 1 ? 0 : Math.sqrt(index / (ordered.length - 1))
    const angle = index * golden + seededUnit(node.id) * 0.7
    const eccentricity = 0.74 + seededUnit(`${node.id}:e`) * 0.24
    const distance = 48 + normalized * 350 * eccentricity
    const connections = degree.get(node.id) ?? 0
    const weight = Math.max(0, Number(node.weight ?? 0))
    return {
      ...node,
      x: 500 + Math.cos(angle) * distance,
      y: 310 + Math.sin(angle) * distance * 0.68,
      z: (seededUnit(`${node.id}:z`) - 0.5) * 420,
      radius: Math.max(4.5, Math.min(15, 4 + Math.sqrt(weight + connections) * 2.1))
    }
  })
}

export function connectedIds(selectedId: string | null, edges: GraphEdge[]): Set<string> {
  const result = new Set<string>()
  if (!selectedId) return result
  result.add(selectedId)
  for (const edge of edges) {
    if (edge.source === selectedId) result.add(edge.target)
    if (edge.target === selectedId) result.add(edge.source)
  }
  return result
}

export function categoryCounts(nodes: GraphNode[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>()
  for (const node of nodes) {
    const category = node.category || 'Other'
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}
