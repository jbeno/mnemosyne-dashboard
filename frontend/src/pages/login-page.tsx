import { Database, Moon, RefreshCw, ShieldCheck, Sun } from "lucide-react"
import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Theme } from "@/hooks/use-theme"
import type { AuthStatus } from "@/lib/types"

export function LoginPage({ auth, onLogin, onRetry, onToggleTheme, theme }: {
  auth: AuthStatus
  onLogin: (password: string) => Promise<void>
  onRetry: () => Promise<void>
  onToggleTheme: () => void
  theme: Theme
}) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!password || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onLogin(password)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed.")
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="grid w-full max-w-5xl overflow-hidden border bg-background/82 shadow-2xl backdrop-blur-xl lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
        <div className="relative hidden min-h-[38rem] lg:block">
          <img alt="Mnemosyne holding the thread of memory" className="absolute inset-0 size-full object-cover object-top" src="/static/mnemosyne-portrait-512.png" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background/85" />
        </div>
        <div className="flex min-h-[34rem] flex-col justify-center p-8 sm:p-12">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Private memory console</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Sign in to Mnemosyne</h1>
            </div>
            <Button aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} onClick={onToggleTheme} size="icon" variant="ghost">{theme === "dark" ? <Moon /> : <Sun />}</Button>
          </div>
          <p className="mt-5 max-w-lg text-sm leading-6 text-muted-foreground">This dashboard is password protected. Credentials stay on this local Mnemosyne server and the session cookie is HTTP-only.</p>
          <form className="mt-8 space-y-4" onSubmit={submit}>
            <label className="grid gap-2 text-sm font-medium"><span>Password</span><Input autoComplete="current-password" autoFocus onChange={(event) => setPassword(event.target.value)} placeholder="Dashboard password" type="password" value={password} /></label>
            {error ? <p className="border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm" role="alert">{error}</p> : null}
            <Button className="w-full" disabled={!password || submitting} type="submit">{submitting ? <><RefreshCw className="animate-spin" />Signing in…</> : <><ShieldCheck />Sign in</>}</Button>
          </form>
          <div className="mt-8 border-t pt-5 text-xs leading-5 text-muted-foreground">
            <p className="flex items-center gap-2"><Database className="size-4" />{auth.config.local_url || "Local Mnemosyne dashboard"}</p>
            <button className="mt-3 text-primary underline-offset-4 hover:underline" onClick={() => void onRetry()} type="button">Refresh authentication status</button>
          </div>
        </div>
      </section>
    </main>
  )
}
