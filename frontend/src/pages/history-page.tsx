import { useCallback, useEffect, useState } from "react"
import { Search } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { dashboardApi } from "@/lib/api"
import type { TimelineData } from "@/lib/types"
import { formatDate, shortId } from "@/lib/utils"

export function HistoryPage({ databaseKey }: { databaseKey: string }) {
  const [query, setQuery] = useState("")
  const [group, setGroup] = useState("day")
  const [data, setData] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (search: string, grouping: string) => {
    setLoading(true)
    setError(null)
    try {
      setData(await dashboardApi.timeline({ q: search, group: grouping, limit: "300" }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "History could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setQuery("")
    setGroup("day")
    void load("", "day")
  }, [databaseKey, load])

  return (
    <div className="space-y-8">
      <PageHeader
        description="Trace memory, fact, and consolidation events across days or sessions."
        eyebrow="Memory"
        title="History"
      />
      <form className="grid gap-3 border-b pb-6 md:grid-cols-[minmax(16rem,1fr)_12rem_auto]" onSubmit={(event) => { event.preventDefault(); void load(query, group) }}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search history" className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Search events…" value={query} />
        </div>
        <Select onValueChange={setGroup} value={group}>
          <SelectTrigger aria-label="Group history"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="day">Group by day</SelectItem><SelectItem value="session">Group by session</SelectItem></SelectContent>
        </Select>
        <Button disabled={loading} type="submit">Apply</Button>
      </form>
      {error ? <p className="border-l-2 border-destructive px-4 py-2 text-sm" role="alert">{error}</p> : null}
      <div className="space-y-10" aria-busy={loading}>
        {(data?.groups || []).map((eventGroup) => (
          <section key={eventGroup.key} aria-labelledby={`history-${eventGroup.key}`}>
            <div className="mb-4 flex items-baseline justify-between border-b pb-3">
              <h2 className="text-lg font-semibold" id={`history-${eventGroup.key}`}>{group === "day" ? formatDate(`${eventGroup.key}T00:00:00`)?.split(",")[0] || eventGroup.key : shortId(eventGroup.key, 28)}</h2>
              <span className="text-xs tabular-nums text-muted-foreground">{eventGroup.count} events</span>
            </div>
            <ol className="relative ml-2 border-l">
              {eventGroup.events.map((event, index) => (
                <li className="relative pb-6 pl-6 last:pb-0" key={`${event.type}-${event.timestamp}-${index}`}>
                  <span className="absolute -left-1.5 top-1.5 size-3 rounded-full border-2 border-background bg-primary" aria-hidden="true" />
                  <div className="mb-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-semibold uppercase tracking-[0.12em] text-primary">{event.type}</span>
                    <time>{formatDate(event.timestamp)}</time>
                    {event.session_id ? <span title={event.session_id}>{shortId(event.session_id, 22)}</span> : null}
                  </div>
                  <h3 className="text-sm font-semibold">{event.title}</h3>
                  {event.preview ? <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">{event.preview}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        ))}
        {!loading && !data?.groups.length ? <p className="text-sm text-muted-foreground">No history events match this search.</p> : null}
        {loading && !data ? <p className="text-sm text-muted-foreground">Loading history…</p> : null}
      </div>
    </div>
  )
}
