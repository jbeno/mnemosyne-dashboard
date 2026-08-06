import type { GraphNode } from "@/lib/types"
import type { NetworkMode } from "@/lib/network-layout"

export type NetworkLegendItem = { color: string; description: string; label: string; line?: boolean }
export type NetworkColorMode = "category" | "type"

const CATEGORY_COLORS: Record<string, string> = {
  "Preferences": "#f472b6",
  "People": "#7dd3fc",
  "Home setup": "#facc15",
  "Work / business": "#60a5fa",
  "Health / wearables": "#4ade80",
  "Devices": "#a3e635",
  "Agent memory": "#a78bfa",
  "Dashboard / visualisers": "#22d3ee",
  "Messaging / WhatsApp": "#34d399",
  "Travel / leisure": "#f59e0b",
  "Creative / media": "#fb7185",
  "Finance / assets": "#2dd4bf",
  "Projects": "#f97316",
  "Privacy rules": "#ef4444",
  "Other": "#94a3b8",
  "Temporal triples": "#57c4ff",
  "Episodic graph": "#9d91d4",
  "MEMORIA": "#e6a54a",
  "Knowledge": "#94a3b8",
}

const FALLBACK_CATEGORY_COLORS = ["#76b8d8", "#78c8ad", "#9d91d4", "#d39b78", "#82a6d8", "#b9a66f", "#79b8b4", "#d989b5", "#a8c66c", "#d77a61", "#65b9a6"]

export function networkCategoryColor(category = "Knowledge") {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category]
  let hash = 0
  for (const character of category) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0
  return FALLBACK_CATEGORY_COLORS[Math.abs(hash) % FALLBACK_CATEGORY_COLORS.length]
}

export function networkNodeColor(node: GraphNode, mode: NetworkMode, colorMode: NetworkColorMode) {
  if (colorMode === "category") return networkCategoryColor(node.category)
  if (mode === "constellation") return node.kind === "memory" ? "#e6a54a" : "#57c4ff"
  if (mode === "neural") return node.kind === "memory" ? "#ff6b5d" : "#60e2c0"
  return node.kind === "memory" ? "#e6a54a" : "#57c4ff"
}

export function networkLegendItems(mode: NetworkMode, nodes: GraphNode[], colorMode: NetworkColorMode): NetworkLegendItem[] {
  if (colorMode === "category") {
    const counts = new Map<string, number>()
    for (const node of nodes) counts.set(node.category || "Other", (counts.get(node.category || "Other") || 0) + 1)
    const categories: NetworkLegendItem[] = [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([category, count]) => ({ color: networkCategoryColor(category), description: mode === "graph" ? `${count.toLocaleString()} loaded node${count === 1 ? "" : "s"} from this knowledge store.` : `${count.toLocaleString()} loaded node${count === 1 ? "" : "s"} assigned to this dashboard category.`, label: category }))
    return [...categories, { color: "#6f88a8", description: mode === "graph" ? "A subject-predicate-object relationship; its label names the predicate." : "A relationship between two loaded nodes.", label: mode === "neural" ? "Synapse" : "Relationship", line: true }]
  }
  if (mode === "constellation") return [
    { color: "#57c4ff", description: "Entity or topic referenced by retained memory.", label: "Entity / topic" },
    { color: "#e6a54a", description: "A retained working or episodic memory record.", label: "Memory" },
    { color: "#6f88a8", description: "A stored or inferred connection between nodes.", label: "Relationship", line: true },
  ]
  if (mode === "neural") return [
    { color: "#60e2c0", description: "Entity or topic acting as a neural hub.", label: "Neuron hub" },
    { color: "#ff6b5d", description: "A retained memory represented as a soma.", label: "Memory soma" },
    { color: "#6f88a8", description: "A relationship between two loaded nodes.", label: "Synapse", line: true },
  ]
  return [
    { color: "#57c4ff", description: "Entity represented in the structured knowledge graph.", label: "Entity" },
    { color: "#e6a54a", description: "Memory-backed node represented in the graph.", label: "Memory" },
    { color: "#6f88a8", description: "A subject-predicate-object relationship; its label names the predicate.", label: "Relationship / predicate", line: true },
  ]
}

export function networkColorModeLabel(mode: NetworkMode, colorMode: NetworkColorMode) {
  if (colorMode === "type") return "Type"
  return mode === "graph" ? "Source" : "Category"
}
