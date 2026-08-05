import type { Memory } from "@/lib/types"
import { formatDate, shortId } from "@/lib/utils"

export function MemoryList({ title, items, empty }: { title: string; items?: Memory[]; empty: string }) {
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
          {items.slice(0, 12).map((memory) => (
            <article className="py-4 first:pt-1" key={memory.id}>
              <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-primary">{memory.source || memory.type || "memory"}</span>
                {memory.scope ? <span>{memory.scope}</span> : null}
                {memory.session_id ? <span title={memory.session_id}>{shortId(memory.session_id, 22)}</span> : null}
                <time>{formatDate(memory.timestamp || memory.created_at)}</time>
              </div>
              <p className="line-clamp-3 text-sm leading-6 text-foreground/90">{memory.content || "No content"}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="py-6 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  )
}
