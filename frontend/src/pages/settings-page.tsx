import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, DatabaseBackup, RefreshCw, ShieldAlert } from "lucide-react"

import { KeyValueList } from "@/components/key-value-list"
import { MetricStrip } from "@/components/metric-strip"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dashboardApi } from "@/lib/api"
import type { AuditEntry, DashboardConfig, Diagnostics, RealtimeStatus, RuntimeStatus } from "@/lib/types"
import { formatDate } from "@/lib/utils"

type ConfigForm = Pick<DashboardConfig, "host" | "port" | "db_path" | "auth_enabled" | "memory_admin_enabled"> & { password: string }

export function SettingsPage({ backupAllowed, configureAllowed, databaseKey, onAuthStatusChange }: { backupAllowed: boolean; configureAllowed: boolean; databaseKey: string; onAuthStatusChange: () => Promise<void> }) {
  const [config, setConfig] = useState<DashboardConfig | null>(null)
  const [form, setForm] = useState<ConfigForm | null>(null)
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null)
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null)
  const [realtime, setRealtime] = useState<RealtimeStatus | null>(null)
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmClearPassword, setConfirmClearPassword] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [configResponse, nextDiagnostics, nextRuntime, nextRealtime] = await Promise.all([dashboardApi.config(), dashboardApi.diagnostics(), dashboardApi.runtimeStatus(), dashboardApi.realtimeStatus()])
      setConfig(configResponse.config)
      setForm(configForm(configResponse.config))
      setDiagnostics(nextDiagnostics)
      setRuntime(nextRuntime)
      setRealtime(nextRealtime)
      if (backupAllowed || configResponse.config.memory_admin_enabled) {
        const auditResponse = await dashboardApi.audit().catch(() => ({ items: [] as AuditEntry[] }))
        setAudit(auditResponse.items)
      } else setAudit([])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Dashboard settings could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [backupAllowed])

  useEffect(() => { void load() }, [databaseKey, load])

  const save = async () => {
    if (!form) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const updates: Record<string, unknown> = { host: form.host, port: form.port, db_path: form.db_path, auth_enabled: form.auth_enabled, memory_admin_enabled: form.memory_admin_enabled }
      if (form.password) updates.password = form.password
      const response = await dashboardApi.saveConfig(updates)
      setConfig(response.config)
      setForm(configForm(response.config))
      setConfirmClearPassword(false)
      setMessage(response.message)
      if (backupAllowed || response.config.memory_admin_enabled) setAudit((await dashboardApi.audit().catch(() => ({ items: [] as AuditEntry[] }))).items)
      else setAudit([])
      await onAuthStatusChange()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Settings could not be saved.")
    } finally {
      setSaving(false)
    }
  }

  const clearPassword = async () => {
    if (!confirmClearPassword) { setConfirmClearPassword(true); return }
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const response = await dashboardApi.saveConfig({ clear_password: true })
      setConfig(response.config)
      setForm(configForm(response.config))
      setConfirmClearPassword(false)
      setMessage("Password authentication was disabled and the stored password was cleared.")
      if (backupAllowed || response.config.memory_admin_enabled) setAudit((await dashboardApi.audit().catch(() => ({ items: [] as AuditEntry[] }))).items)
      await onAuthStatusChange()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The stored password could not be cleared.")
    } finally {
      setSaving(false)
    }
  }

  const backup = async () => {
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const response = await dashboardApi.backup()
      setMessage(`Backup created at ${response.backup.path}`)
      setAudit((await dashboardApi.audit().catch(() => ({ items: [] as AuditEntry[] }))).items)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The database backup could not be created.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-10" aria-busy={loading}>
      <PageHeader actions={<Button disabled={loading} onClick={() => void load()} variant="outline"><RefreshCw className={loading ? "animate-spin" : ""} />Refresh status</Button>} description="Configure the local dashboard and verify database, runtime, and realtime health." eyebrow="System" title="Settings" />
      <MetricStrip metrics={[
        { description: "Tables discovered in the selected SQLite database.", label: "Tables", value: diagnostics?.tables.length },
        { description: "Size of the selected SQLite database in megabytes.", label: "Database MB", value: diagnostics ? Math.round(diagnostics.size_bytes / 1024 / 1024) : undefined },
        { description: "Processes currently listening on the configured dashboard port.", label: "Runtime listeners", value: runtime?.listener_pids.length },
        { description: "Realtime snapshot events available to new dashboard subscribers.", label: "Snapshot events", value: realtime?.snapshot_event_count },
      ]} />
      {message ? <div className="flex items-start gap-3 border-l-2 border-primary bg-primary/5 px-4 py-3 text-sm" role="status"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /><span>{message}</span></div> : null}
      {error ? <div className="flex items-start gap-3 border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm" role="alert"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" /><span>{error}</span></div> : null}

      <Tabs defaultValue="general">
        <TabsList aria-label="Settings section"><TabsTrigger value="general">General</TabsTrigger><TabsTrigger value="maintenance">Maintenance</TabsTrigger><TabsTrigger value="diagnostics">Diagnostics</TabsTrigger><TabsTrigger value="realtime">Realtime</TabsTrigger></TabsList>
        <TabsContent className="pt-7" value="general">
          <form className="max-w-4xl space-y-9" onSubmit={(event) => { event.preventDefault(); void save() }}>
            {!configureAllowed ? <p className="border-l-2 border-primary/45 bg-primary/5 px-4 py-3 text-sm">Configuration changes require a localhost connection or password-authenticated access.</p> : null}
            <fieldset className="grid gap-5 sm:grid-cols-2" disabled={!configureAllowed || saving}>
              <legend className="mb-4 text-lg font-semibold">Server & database</legend>
              <Field label="Bind host"><Input onChange={(event) => setFormValue(setForm, "host", event.target.value)} required value={form?.host || ""} /></Field>
              <Field label="Port"><Input max={65535} min={1} onChange={(event) => setFormValue(setForm, "port", Number(event.target.value))} required type="number" value={form?.port || ""} /></Field>
              <Field className="sm:col-span-2" description="Changing this setting requires a dashboard restart. Use the profile selector in the header for a temporary switch." label="Default database path"><Input onChange={(event) => setFormValue(setForm, "db_path", event.target.value)} required value={form?.db_path || ""} /></Field>
            </fieldset>

            <fieldset className="space-y-4 border-t pt-7" disabled={!configureAllowed || saving}>
              <legend className="text-lg font-semibold">Access & maintenance</legend>
              <CheckField checked={Boolean(form?.auth_enabled)} description="Require the dashboard password before serving memory data." label="Password authentication" onChange={(checked) => setFormValue(setForm, "auth_enabled", checked)} />
              <Field description={config?.has_password ? "A password is already configured. Enter a value only to replace it." : "Set a dashboard password before exposing the server beyond localhost."} label="New password"><Input autoComplete="new-password" onChange={(event) => setFormValue(setForm, "password", event.target.value)} placeholder={config?.has_password ? "Leave blank to keep current password" : "Enter a strong local password"} type="password" value={form?.password || ""} /></Field>
              {config?.has_password ? <div className="flex flex-wrap items-center gap-3"><Button disabled={saving || !configureAllowed} onClick={() => void clearPassword()} type="button" variant={confirmClearPassword ? "destructive" : "outline"}>{confirmClearPassword ? "Confirm disable & clear" : "Disable auth & clear password"}</Button>{confirmClearPassword ? <Button disabled={saving} onClick={() => setConfirmClearPassword(false)} type="button" variant="ghost">Cancel</Button> : null}<span className="text-xs leading-5 text-muted-foreground">This removes the stored hash and invalidates the current authentication cookie.</span></div> : null}
              <CheckField checked={Boolean(form?.memory_admin_enabled)} description="Allows write operations that invalidate or alter memory. Keep this off for normal inspection." label="Memory admin mode" onChange={(checked) => setFormValue(setForm, "memory_admin_enabled", checked)} />
            </fieldset>

            <div className="flex flex-wrap items-center gap-3"><Button disabled={saving || !form || !configureAllowed} type="submit">{saving ? "Saving…" : "Save settings"}</Button><Button disabled={saving || !backupAllowed} onClick={() => void backup()} type="button" variant="outline"><DatabaseBackup />Create database backup</Button>{!backupAllowed ? <span className="text-xs text-muted-foreground">Backups require localhost or password-authenticated access.</span> : null}</div>
          </form>
        </TabsContent>
        <TabsContent className="pt-7" value="maintenance">
          <section className="max-w-5xl"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-semibold">Audited memory maintenance</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Configuration changes, database selection, backups, and every trust, importance, expiry, invalidation, and supersession action are appended to the local audit log. Memory mutations create one verified SQLite backup by default.</p></div><Button disabled={saving || !backupAllowed} onClick={() => void backup()} type="button" variant="outline"><DatabaseBackup />Create database backup</Button></div>{!config?.memory_admin_enabled ? <p className="mt-6 border-l-2 border-primary/45 bg-primary/5 px-4 py-3 text-sm">Memory admin mode is disabled. Backups remain available when authorized; enable admin mode under General only when record maintenance is intentional.</p> : null}{backupAllowed || config?.memory_admin_enabled ? <><div className="mt-8 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Recent audit activity</h3><span className="text-xs tabular-nums text-muted-foreground">{audit.length} entries</span></div><Table className="mt-3"><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Memory</TableHead><TableHead>Result</TableHead></TableRow></TableHeader><TableBody>{audit.map((entry, index) => <TableRow key={`${entry.timestamp || "audit"}-${index}`}><TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(entry.timestamp)}</TableCell><TableCell><Badge variant="outline">{entry.action || "record"}</Badge></TableCell><TableCell className="max-w-56 truncate font-mono text-xs">{entry.memory_id || "—"}</TableCell><TableCell className="max-w-lg truncate text-muted-foreground">{auditResult(entry)}</TableCell></TableRow>)}</TableBody></Table>{!audit.length ? <p className="border-t py-8 text-sm text-muted-foreground">No audited maintenance actions have been recorded.</p> : null}</> : null}</section>
        </TabsContent>
        <TabsContent className="pt-7" value="diagnostics">
          <div className="grid gap-10 xl:grid-cols-2">
            <section><div className="mb-4 flex items-center gap-2"><h2 className="text-lg font-semibold">Database</h2><Badge variant={diagnostics?.ok ? "secondary" : "destructive"}>{diagnostics?.ok ? "Healthy" : "Attention"}</Badge></div><KeyValueList rows={[{ label: "Path", value: diagnostics?.db_path || "—" }, { label: "Readable", value: yesNo(diagnostics?.readable) }, { label: "Read only", value: yesNo(diagnostics?.read_only) }, { label: "Size", value: diagnostics ? formatBytes(diagnostics.size_bytes) : "—" }, { label: "Modified", value: formatDate(diagnostics?.modified_at) }]} /></section>
            <section><div className="mb-4 flex items-center gap-2"><h2 className="text-lg font-semibold">Runtime</h2><Badge variant={runtime?.reachable ? "secondary" : "destructive"}>{runtime?.reachable ? "Reachable" : "Offline"}</Badge></div><KeyValueList rows={[{ label: "PID", value: runtime?.pid || "—" }, { label: "Source", value: runtime?.runtime_source || "—" }, { label: "Listeners", value: runtime?.listener_pids?.join(", ") || "—" }, { label: "Stale runtime", value: yesNo(runtime?.runtime_stale) }, { label: "Probe", value: runtime?.probe?.status || runtime?.probe?.error || "—" }]} /></section>
          </div>
          <section className="mt-10"><h2 className="mb-4 text-lg font-semibold">Table inventory</h2><Table><TableHeader><TableRow><TableHead>Table</TableHead><TableHead className="text-right">Rows</TableHead></TableRow></TableHeader><TableBody>{Object.entries(diagnostics?.table_counts || {}).map(([table, count]) => <TableRow key={table}><TableCell className="font-mono text-xs">{table}</TableCell><TableCell className="text-right tabular-nums">{count.toLocaleString()}</TableCell></TableRow>)}</TableBody></Table></section>
        </TabsContent>
        <TabsContent className="pt-7" value="realtime">
          <div className="grid gap-10 xl:grid-cols-2"><section><h2 className="mb-4 text-lg font-semibold">Transport</h2><KeyValueList rows={[{ label: "Generation", value: realtime?.realtime_generation || "—" }, { label: "Transport", value: realtime?.transport || "—" }, { label: "Payload policy", value: realtime?.payload_policy || "—" }, { label: "Streaming", value: yesNo(realtime?.streaming_supported) }, { label: "DeltaSync", value: yesNo(realtime?.deltasync_supported) }, { label: "Mnemosyne", value: realtime?.mnemosyne_version || "—" }]} /></section><section><h2 className="mb-4 text-lg font-semibold">Capabilities</h2><p className="mb-3 text-sm text-muted-foreground">Event types</p><div className="flex flex-wrap gap-2">{(realtime?.event_types || []).map((item) => <Badge key={item} variant="outline">{item}</Badge>)}</div><p className="mb-3 mt-6 text-sm text-muted-foreground">DeltaSync tables</p><div className="flex flex-wrap gap-2">{(realtime?.deltasync_tables || []).map((item) => <Badge key={item} variant="outline">{item}</Badge>)}</div></section></div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Field({ children, className = "", description, label }: { children: React.ReactNode; className?: string; description?: string; label: string }) {
  return <label className={`grid gap-2 text-sm font-medium ${className}`}><span>{label}</span>{children}{description ? <span className="text-xs font-normal leading-5 text-muted-foreground">{description}</span> : null}</label>
}

function CheckField({ checked, description, label, onChange }: { checked: boolean; description: string; label: string; onChange: (checked: boolean) => void }) {
  return <label className="flex max-w-2xl items-start gap-3 rounded-md border bg-background/35 px-4 py-3"><input checked={checked} className="mt-1 size-4 accent-[var(--primary)]" onChange={(event) => onChange(event.target.checked)} type="checkbox" /><span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span></label>
}

function setFormValue<K extends keyof ConfigForm>(setForm: React.Dispatch<React.SetStateAction<ConfigForm | null>>, key: K, value: ConfigForm[K]) {
  setForm((current) => current ? { ...current, [key]: value } : current)
}

function configForm(config: DashboardConfig): ConfigForm {
  return { host: config.host, port: config.port, db_path: config.db_path, auth_enabled: config.auth_enabled, memory_admin_enabled: config.memory_admin_enabled, password: "" }
}

function yesNo(value: boolean | undefined) { return value === undefined ? "—" : value ? "Yes" : "No" }
function formatBytes(value: number) { if (!value) return "0 B"; const units = ["B", "KB", "MB", "GB"]; const order = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1); return `${(value / 1024 ** order).toFixed(order ? 1 : 0)} ${units[order]}` }
function auditResult(entry: AuditEntry) { const extra = entry.extra || {}; if (entry.action === "database_select" && entry.after?.path) return `Selected ${String(entry.after.path)}`; if (Array.isArray(extra.changed_fields)) return `Changed ${extra.changed_fields.join(", ") || "no public fields"}`; if (extra.count !== undefined) return `${Number(extra.count).toLocaleString()} memories`; if (extra.replacement_id) return `Replacement ${String(extra.replacement_id)}`; if (extra.veracity) return `Trust ${String(extra.veracity)}`; if (extra.importance !== undefined) return `Importance ${Number(extra.importance).toFixed(2)}`; if (extra.valid_until !== undefined) return extra.valid_until ? `Expiry ${String(extra.valid_until)}` : "Expiry cleared"; const backup = extra.backup as { path?: string } | null | undefined; return backup?.path ? `Backup ${backup.path}` : entry.raw || "Completed" }
