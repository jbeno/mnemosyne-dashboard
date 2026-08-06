import type { GraphNode } from "@/lib/types"

export function networkNodeMatchesSearch(node: GraphNode, query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return true
  const haystack = [node.label, node.preview, node.id, node.kind, node.category]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase()
  return terms.every((term) => haystack.includes(term))
}
