import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import type { JsonRecord } from "@/lib/types"

const hiddenKeys = new Set(["id", "event_id", "message_idx", "updated_msg_idx", "valid_from_msg_idx", "valid_to_msg_idx", "version_id", "previous_value", "context_snippet"])
const contentKeys = ["content", "value", "description", "instruction", "preference", "body", "context_snippet"]

export function StructuredRecordList({ empty = "No entries found.", items }: { empty?: string; items: JsonRecord[] | undefined }) {
  if (!items?.length) return <p className="py-8 text-sm text-muted-foreground">{empty}</p>
  return (
    <div className="divide-y">
      {items.map((item, index) => {
        const title = textValue(item.key) || textValue(item.topic) || textValue(item.name) || textValue(item.subject) || "Entry"
        const contentKey = contentKeys.find((key) => textValue(item[key]))
        const content = contentKey ? textValue(item[contentKey]) : ""
        const context = contentKey !== "context_snippet" ? textValue(item.context_snippet) : ""
        const timestamp = textValue(item.created_at) || textValue(item.date) || textValue(item.timestamp)
        const metadata = Object.entries(item).filter(([key, value]) => !hiddenKeys.has(key) && key !== contentKey && !["key", "topic", "name", "subject"].includes(key) && displayable(value)).slice(0, 6)
        return (
          <article className="py-5 first:pt-1" key={textValue(item.id) || textValue(item.event_id) || `${title}-${index}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="font-semibold leading-6">{title}</h3>
              {timestamp ? <time className="text-xs text-muted-foreground">{formatDate(timestamp)}</time> : null}
            </div>
            {content ? <p className="mt-2 max-w-5xl whitespace-pre-wrap text-sm leading-6 text-foreground/90">{content}</p> : null}
            {context ? <p className="mt-2 max-w-5xl text-sm leading-6 text-muted-foreground">{context}</p> : null}
            {metadata.length ? <div className="mt-3 flex flex-wrap gap-1.5">{metadata.map(([key, value]) => <Badge key={key} variant="outline">{labelFor(key)}: {shortValue(value)}</Badge>)}</div> : null}
          </article>
        )
      })}
    </div>
  )
}

function textValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : ""
}

function displayable(value: unknown) {
  return value !== null && value !== undefined && value !== "" && (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
}

function shortValue(value: unknown) {
  const text = String(value)
  return text.length > 42 ? `${text.slice(0, 39)}…` : text
}

function labelFor(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase())
}
