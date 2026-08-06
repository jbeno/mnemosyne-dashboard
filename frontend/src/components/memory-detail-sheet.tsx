import { CalendarClock, DatabaseBackup, RefreshCw, ShieldAlert, Sparkles, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

import { KeyValueList } from "@/components/key-value-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { dashboardApi } from "@/lib/api"
import type { Memory } from "@/lib/types"
import { formatDate } from "@/lib/utils"

export function MemoryDetailSheet({ adminEnabled, memory, onChanged, onOpenChange }: {
  adminEnabled: boolean
  memory: Memory | null
  onChanged: () => void | Promise<void>
  onOpenChange: (open: boolean) => void
}) {
  const [item, setItem] = useState<Memory | null>(memory)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [backup, setBackup] = useState(true)
  const [importance, setImportance] = useState("0.50")
  const [veracity, setVeracity] = useState("unknown")
  const [expiry, setExpiry] = useState("")
  const [replacement, setReplacement] = useState("")
  const [confirmExpire, setConfirmExpire] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setItem(memory)
    setMessage(null)
    setError(null)
    setConfirmExpire(false)
    if (!memory) return
    setImportance(Number(memory.importance ?? 0.5).toFixed(2))
    setVeracity(memory.veracity || "unknown")
    setExpiry(toLocalInput(memory.valid_until))
    setReplacement(memory.content || "")
    let active = true
    setLoading(true)
    void dashboardApi.memory(memory.id).then((response) => {
      if (!active) return
      setItem(response.item)
      setImportance(Number(response.item.importance ?? 0.5).toFixed(2))
      setVeracity(response.item.veracity || "unknown")
      setExpiry(toLocalInput(response.item.valid_until))
      setReplacement(response.item.content || "")
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Memory details could not be loaded.") }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [memory])

  const mutate = async (action: () => Promise<unknown>, success: string) => {
    if (!item || busy) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await action()
      const refreshed = await dashboardApi.memory(item.id).catch(() => ({ item }))
      setItem(refreshed.item)
      setMessage(success)
      await onChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Memory maintenance failed.")
    } finally {
      setBusy(false)
      setConfirmExpire(false)
    }
  }

  const mutable = item && (!item.status || item.status === "active")

  return (
    <Sheet onOpenChange={onOpenChange} open={Boolean(memory)}>
      <SheetContent closeLabel="Close memory details" className="left-auto right-0 w-[min(42rem,96vw)] border-l border-r-0">
        <div className="flex-1 overflow-y-auto px-6 py-7 sm:px-8">
          <p className="eyebrow">Memory inspector</p>
          <SheetTitle className="mt-2 break-all text-2xl font-semibold">{item?.id || "Memory"}</SheetTitle>
          <SheetDescription className="mt-2 text-sm leading-6 text-muted-foreground">Inspect source metadata and use audited Mnemosyne maintenance operations when admin mode is enabled.</SheetDescription>
          {loading ? <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><RefreshCw className="size-4 animate-spin" />Loading full record…</p> : null}
          {item ? <>
            <div className="mt-6 flex flex-wrap gap-2"><Badge>{item.memory_kind || item.type || "memory"}</Badge>{item.status ? <Badge variant="secondary">{item.status}</Badge> : null}{item.veracity ? <Badge variant="outline">{item.veracity}</Badge> : null}{item.degradation_label ? <Badge variant="outline">{item.degradation_label}</Badge> : null}</div>
            <p className="mt-6 whitespace-pre-wrap break-words text-sm leading-7">{item.content || "No memory content."}</p>
            <KeyValueList className="mt-6" rows={[{ label: "Source", value: item.source || "—" }, { label: "Scope", value: item.scope || "—" }, { label: "Session", value: item.session_id || "—" }, { label: "Created", value: formatDate(item.timestamp || item.created_at) }, { label: "Importance", value: Number(item.importance ?? 0).toFixed(2) }, { label: "Recall count", value: Number(item.recall_count || 0).toLocaleString() }, { label: "Valid until", value: formatDate(item.valid_until) }, { label: "Superseded by", value: item.superseded_by || "—" }]} />
          </> : null}

          <section className="mt-10 border-t pt-7" aria-labelledby="memory-maintenance-title">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold" id="memory-maintenance-title">Memory maintenance</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Mutations are audited. Backups remain enabled by default.</p></div><label className="flex items-center gap-2 text-xs text-muted-foreground"><input checked={backup} className="size-4 accent-[var(--primary)]" onChange={(event) => setBackup(event.target.checked)} type="checkbox" /><DatabaseBackup className="size-4" />Backup</label></div>
            {!adminEnabled ? <p className="mt-5 border-l-2 border-primary/45 bg-primary/5 px-4 py-3 text-sm">Enable Settings → Memory admin mode to modify records. Normal browsing remains read-only.</p> : !mutable ? <p className="mt-5 border-l-2 border-border px-4 py-3 text-sm text-muted-foreground">This memory is {item?.status || "not active"}; maintenance actions are disabled.</p> : null}
            <fieldset className="mt-6 space-y-6" disabled={!adminEnabled || !mutable || busy}>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><label className="grid gap-2 text-sm font-medium"><span>Importance</span><Input max="1" min="0" onChange={(event) => setImportance(event.target.value)} step="0.01" type="number" value={importance} /></label><Button className="self-end" onClick={() => void mutate(() => dashboardApi.setMemoryImportance(item!.id, Number(importance), backup), `Importance updated to ${Number(importance).toFixed(2)}.`)} type="button" variant="outline">Save importance</Button></div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><label className="grid gap-2 text-sm font-medium"><span>Trust provenance</span><Select onValueChange={setVeracity} value={veracity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="stated">Stated</SelectItem><SelectItem value="tool">Tool</SelectItem><SelectItem value="inferred">Inferred</SelectItem><SelectItem value="unknown">Unknown</SelectItem></SelectContent></Select></label><Button className="self-end" onClick={() => void mutate(() => dashboardApi.setMemoryVeracity(item!.id, veracity, backup), `Trust updated to ${veracity}.`)} type="button" variant="outline">Save trust</Button></div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><label className="grid gap-2 text-sm font-medium"><span>Expiry</span><Input onChange={(event) => setExpiry(event.target.value)} type="datetime-local" value={expiry} /></label><Button className="self-end" onClick={() => void mutate(() => dashboardApi.setMemoryExpiry(item!.id, expiry, backup), expiry ? "Expiry updated." : "Expiry cleared.")} type="button" variant="outline"><CalendarClock />Save</Button><Button className="self-end" onClick={() => { setExpiry(""); void mutate(() => dashboardApi.setMemoryExpiry(item!.id, "", backup), "Expiry cleared.") }} type="button" variant="ghost">Clear</Button></div>
              <div className="grid gap-3"><label className="grid gap-2 text-sm font-medium"><span>Correct and supersede</span><Textarea onChange={(event) => setReplacement(event.target.value)} value={replacement} /></label><Button className="justify-self-start" disabled={!replacement.trim() || replacement.trim() === item?.content?.trim()} onClick={() => void mutate(() => dashboardApi.supersedeMemory(item!.id, replacement.trim(), Number(importance), backup), "A corrected replacement was created and the original was superseded.")} type="button"><Sparkles />Supersede memory</Button></div>
              <div className="border-t pt-5">{confirmExpire ? <div className="flex flex-wrap items-center gap-3"><p className="mr-auto text-sm text-destructive">Expire this memory now? The record remains in history.</p><Button onClick={() => setConfirmExpire(false)} type="button" variant="ghost">Cancel</Button><Button onClick={() => void mutate(() => dashboardApi.invalidateMemory(item!.id, backup), "Memory expired.")} type="button" variant="destructive"><Trash2 />Confirm expiry</Button></div> : <Button onClick={() => setConfirmExpire(true)} type="button" variant="destructive"><Trash2 />Expire memory</Button>}</div>
            </fieldset>
            {message ? <p className="mt-5 border-l-2 border-primary bg-primary/5 px-4 py-3 text-sm" role="status">{message}</p> : null}
            {error ? <p className="mt-5 flex gap-2 border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm" role="alert"><ShieldAlert className="mt-0.5 size-4 shrink-0" />{error}</p> : null}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function toLocalInput(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 16)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
