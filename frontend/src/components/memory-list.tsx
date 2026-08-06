import { Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Memory } from "@/lib/types"
import { formatDate, shortId } from "@/lib/utils"

export function MemoryList({
  title,
  items,
  empty,
  limit = 12,
  onSelect,
  onToggleSelected,
  selectedIds,
  selectable = false,
}: {
  title: string
  items?: Memory[]
  empty: string
  limit?: number
  onSelect?: (memory: Memory) => void
  onToggleSelected?: (memory: Memory, checked: boolean) => void
  selectedIds?: Set<string>
  selectable?: boolean
}) {
  return (
    <section aria-labelledby={`memory-${title.replaceAll(" ", "-")}`}>
      <div className="mb-3 flex items-center justify-between border-b pb-3">
        <h2 className="text-lg font-semibold" id={`memory-${title.replaceAll(" ", "-")}`}>
          {title}
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">{items?.length || 0}</span>
      </div>
      {items?.length ? (
        <div className="divide-y">
          {items.slice(0, limit).map((memory) => (
            <article className="flex gap-3 py-4 first:pt-1" key={memory.id}>
              {selectable ? <input aria-label={`Select memory ${memory.id}`} checked={selectedIds?.has(memory.id) || false} className="mt-1 size-4 shrink-0 accent-[var(--primary)]" onChange={(event) => onToggleSelected?.(memory, event.target.checked)} type="checkbox" /> : null}
              <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-primary">{memory.memory_kind || memory.source || memory.type || "memory"}</span>
                {memory.source && memory.memory_kind ? <span>{memory.source}</span> : null}
                {memory.scope ? <span>{memory.scope}</span> : null}
                {memory.veracity ? <span>{memory.veracity}</span> : null}
                {memory.degradation_label ? <span>{memory.degradation_label}</span> : null}
                {memory.status && memory.status !== "active" ? <span>{memory.status}</span> : null}
                {memory.session_id ? <span title={memory.session_id}>{shortId(memory.session_id, 22)}</span> : null}
                <time>{formatDate(memory.timestamp || memory.created_at)}</time>
                {onSelect ? <Button aria-label={`Inspect memory ${memory.id}`} className="ml-auto" onClick={() => onSelect(memory)} size="sm" variant="ghost"><Eye />Inspect</Button> : null}
              </div>
              <p className="line-clamp-3 text-sm leading-6 text-foreground/90">{memory.content || "No content"}</p>
              {memory.importance !== undefined ? (
                <p className="mt-2 text-xs tabular-nums text-muted-foreground">Importance {Number(memory.importance).toFixed(2)}</p>
              ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="py-6 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  )
}
