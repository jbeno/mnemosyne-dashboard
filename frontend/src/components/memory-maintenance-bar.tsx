import { DatabaseBackup, ShieldCheck, Trash2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { dashboardApi } from "@/lib/api"

type BulkAction = "stated" | "tool" | "unknown" | "importance" | "expiry" | "expire"

export function MemoryMaintenanceBar({ adminEnabled, ids, onChanged, onClear }: { adminEnabled: boolean; ids: string[]; onChanged: () => void | Promise<void>; onClear: () => void }) {
  const [action, setAction] = useState<BulkAction>("stated")
  const [value, setValue] = useState("")
  const [backup, setBackup] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!adminEnabled) return null

  const apply = async () => {
    if (!ids.length || busy) return
    if (action === "expire" && !confirming) { setConfirming(true); return }
    if (action === "importance" && (value === "" || Number(value) < 0 || Number(value) > 1)) { setError("Enter an importance from 0.00 to 1.00."); return }
    if (action === "expiry" && !value) { setError("Choose an expiry date and time."); return }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      for (const id of ids) {
        if (action === "stated" || action === "tool" || action === "unknown") await dashboardApi.setMemoryVeracity(id, action, backup)
        else if (action === "importance") await dashboardApi.setMemoryImportance(id, Number(value), backup)
        else if (action === "expiry") await dashboardApi.setMemoryExpiry(id, value, backup)
        else await dashboardApi.invalidateMemory(id, backup)
      }
      setMessage(`${ids.length} memor${ids.length === 1 ? "y" : "ies"} updated.`)
      setConfirming(false)
      onClear()
      await onChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Bulk maintenance failed.")
    } finally {
      setBusy(false)
    }
  }

  return <section className="border-l-2 border-primary/45 bg-primary/5 px-4 py-4" aria-label="Selected memory maintenance"><div className="flex flex-col gap-3 xl:flex-row xl:items-end"><div className="mr-auto"><p className="text-sm font-semibold">{ids.length} selected</p><p className="mt-1 text-xs text-muted-foreground">Audited maintenance; active memories only.</p></div><label className="grid gap-1.5 text-xs font-medium"><span>Action</span><Select onValueChange={(next) => { setAction(next as BulkAction); setConfirming(false); setValue("") }} value={action}><SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="stated">Mark stated</SelectItem><SelectItem value="tool">Mark tool-derived</SelectItem><SelectItem value="unknown">Mark unknown</SelectItem><SelectItem value="importance">Set importance</SelectItem><SelectItem value="expiry">Set expiry</SelectItem><SelectItem value="expire">Expire memories</SelectItem></SelectContent></Select></label>{action === "importance" ? <label className="grid gap-1.5 text-xs font-medium"><span>Importance</span><Input className="sm:w-36" max="1" min="0" onChange={(event) => setValue(event.target.value)} placeholder="0.50" step="0.01" type="number" value={value} /></label> : null}{action === "expiry" ? <label className="grid gap-1.5 text-xs font-medium"><span>Expiry</span><Input className="sm:w-56" onChange={(event) => setValue(event.target.value)} type="datetime-local" value={value} /></label> : null}<label className="flex h-9 items-center gap-2 text-xs text-muted-foreground"><input checked={backup} className="size-4 accent-[var(--primary)]" onChange={(event) => setBackup(event.target.checked)} type="checkbox" /><DatabaseBackup className="size-4" />Backup</label><Button disabled={!ids.length || busy} onClick={() => void apply()} variant={action === "expire" ? "destructive" : "default"}>{action === "expire" ? <Trash2 /> : <ShieldCheck />}{busy ? "Applying…" : confirming ? "Confirm expiry" : "Apply"}</Button><Button disabled={busy} onClick={onClear} variant="ghost">Clear</Button></div>{message ? <p className="mt-3 text-sm text-primary" role="status">{message}</p> : null}{error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}</section>
}
