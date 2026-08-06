import { lazy, Suspense, useCallback, useEffect, useState } from "react"

import { AppShell } from "@/components/app-shell"
import { pageTitles, type PageId } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useDashboard } from "@/hooks/use-dashboard"
import { useTheme } from "@/hooks/use-theme"
import { dashboardApi } from "@/lib/api"
import type { AuthStatus, GraphNode } from "@/lib/types"
import { AboutPage } from "@/pages/about-page"
import { HistoryPage } from "@/pages/history-page"
import { MemoriesPage } from "@/pages/memories-page"
import { LoginPage } from "@/pages/login-page"
import { TodayPage } from "@/pages/today-page"

const OverviewPage = lazy(() => import("@/pages/overview-page").then((module) => ({ default: module.OverviewPage })))
const ReviewPage = lazy(() => import("@/pages/review-page").then((module) => ({ default: module.ReviewPage })))
const LifecyclePage = lazy(() => import("@/pages/lifecycle-page").then((module) => ({ default: module.LifecyclePage })))
const ContextBankPage = lazy(() => import("@/pages/context-bank-page").then((module) => ({ default: module.ContextBankPage })))
const KnowledgeGraphPage = lazy(() => import("@/pages/knowledge-graph-page").then((module) => ({ default: module.KnowledgeGraphPage })))
const MemoriaPage = lazy(() => import("@/pages/memoria-page").then((module) => ({ default: module.MemoriaPage })))
const PersonaFactsPage = lazy(() => import("@/pages/persona-facts-page").then((module) => ({ default: module.PersonaFactsPage })))
const VisualizerPage = lazy(() => import("@/pages/visualizer-page").then((module) => ({ default: module.VisualizerPage })))
const SettingsPage = lazy(() => import("@/pages/settings-page").then((module) => ({ default: module.SettingsPage })))

const validPages = new Set<PageId>([
  "overview",
  "today",
  "memories",
  "review",
  "lifecycle",
  "history",
  "context",
  "graph",
  "memoria",
  "profile",
  "visualizer",
  "settings",
  "about",
])

function pageFromLocation(): PageId {
  const params = new URLSearchParams(window.location.search)
  const candidate = params.get("page") as PageId | null
  if (!candidate) {
    const legacy = params.get("tab")
    const aliases: Record<string, PageId> = { overview: "overview", today: "today", visualiser: "visualizer", visualizer: "visualizer", review: "review", memories: "memories", profile: "context", lifecycle: "lifecycle", graph: "graph", memoria: "memoria", personafacts: "profile", activity: "history", history: "history", settings: "settings", about: "about" }
    if (legacy && aliases[legacy]) return aliases[legacy]
  }
  return candidate && validPages.has(candidate) ? candidate : "overview"
}

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const [auth, setAuth] = useState<AuthStatus | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const refreshAuth = useCallback(async () => {
    setAuthError(null)
    try {
      setAuth(await dashboardApi.authStatus())
    } catch (cause) {
      setAuthError(cause instanceof Error ? cause.message : "Authentication status could not be loaded.")
    }
  }, [])

  useEffect(() => { void refreshAuth() }, [refreshAuth])

  const login = useCallback(async (password: string) => { setAuth(await dashboardApi.login(password)) }, [])
  const logout = useCallback(async () => { await dashboardApi.logout(); await refreshAuth() }, [refreshAuth])

  return (
    <TooltipProvider delayDuration={200}>
      {auth ? auth.auth_enabled && !auth.authenticated
        ? <LoginPage auth={auth} onLogin={login} onRetry={refreshAuth} onToggleTheme={toggleTheme} theme={theme} />
        : <DashboardApp auth={auth} onAuthChange={refreshAuth} onLogout={auth.auth_enabled ? logout : undefined} onToggleTheme={toggleTheme} theme={theme} />
        : <main className="grid min-h-screen place-items-center px-6"><div className="max-w-md text-center"><img alt="Mnemosyne" className="mx-auto size-20 rounded-lg" src="/static/mnemosyne-avatar-256.png" /><h1 className="mt-5 text-2xl font-semibold">Opening Mnemosyne</h1><p className="mt-2 text-sm text-muted-foreground">Checking local dashboard access…</p>{authError ? <><p className="mt-5 border-l-2 border-destructive px-4 py-3 text-left text-sm" role="alert">{authError}</p><Button className="mt-4" onClick={() => void refreshAuth()} variant="outline">Try again</Button></> : null}</div></main>}
    </TooltipProvider>
  )
}

function DashboardApp({ auth, onAuthChange, onLogout, onToggleTheme, theme }: { auth: AuthStatus; onAuthChange: () => Promise<void>; onLogout?: () => Promise<void>; onToggleTheme: () => void; theme: ReturnType<typeof useTheme>["theme"] }) {
  const [page, setPage] = useState<PageId>(pageFromLocation)
  const [memorySearch, setMemorySearch] = useState(() => new URLSearchParams(window.location.search).get("q") || "")
  const dashboard = useDashboard()

  useEffect(() => {
    const onPopState = () => {
      setPage(pageFromLocation())
      setMemorySearch(new URLSearchParams(window.location.search).get("q") || "")
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  useEffect(() => {
    document.title = `${pageTitles[page]} — Mnemosyne`
  }, [page])

  const navigate = useCallback((nextPage: PageId) => {
    const url = new URL(window.location.href)
    url.searchParams.set("page", nextPage)
    url.searchParams.delete("tab")
    url.searchParams.delete("node")
    url.searchParams.delete("nodeLabel")
    url.searchParams.delete("nodeKind")
    url.searchParams.delete("nodeCategory")
    if (nextPage === "memories") {
      url.searchParams.delete("q")
      setMemorySearch("")
    }
    window.history.pushState({}, "", url)
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const openVisualizer = useCallback((node?: Pick<GraphNode, "id" | "label" | "kind" | "category">) => {
    const url = new URL(window.location.href)
    url.searchParams.set("page", "visualizer")
    url.searchParams.delete("tab")
    if (node) {
      url.searchParams.set("node", node.id)
      url.searchParams.set("nodeLabel", node.label)
      if (node.kind) url.searchParams.set("nodeKind", node.kind)
      else url.searchParams.delete("nodeKind")
      if (node.category) url.searchParams.set("nodeCategory", node.category)
      else url.searchParams.delete("nodeCategory")
    } else {
      url.searchParams.delete("node")
      url.searchParams.delete("nodeLabel")
      url.searchParams.delete("nodeKind")
      url.searchParams.delete("nodeCategory")
    }
    window.history.pushState({}, "", url)
    setPage("visualizer")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const searchMemories = useCallback((query: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set("page", "memories")
    url.searchParams.delete("tab")
    url.searchParams.set("q", query)
    window.history.pushState({}, "", url)
    setMemorySearch(query)
    setPage("memories")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const locationParams = new URLSearchParams(window.location.search)
  let content
  if (page === "overview") content = <OverviewPage databaseKey={dashboard.activeDatabase} loading={dashboard.loading} onOpenVisualizer={openVisualizer} stats={dashboard.stats} />
  else if (page === "today") content = <TodayPage digest={dashboard.today} loading={dashboard.loading} />
  else if (page === "memories") content = <MemoriesPage adminEnabled={auth.config.memory_admin_enabled} databaseKey={dashboard.activeDatabase} searchRequest={memorySearch} stats={dashboard.stats} />
  else if (page === "review") content = <ReviewPage adminEnabled={auth.config.memory_admin_enabled} databaseKey={dashboard.activeDatabase} />
  else if (page === "lifecycle") content = <LifecyclePage databaseKey={dashboard.activeDatabase} />
  else if (page === "history") content = <HistoryPage databaseKey={dashboard.activeDatabase} />
  else if (page === "context") content = <ContextBankPage databaseKey={dashboard.activeDatabase} />
  else if (page === "graph") content = <KnowledgeGraphPage databaseKey={dashboard.activeDatabase} />
  else if (page === "memoria") content = <MemoriaPage databaseKey={dashboard.activeDatabase} />
  else if (page === "profile") content = <PersonaFactsPage databaseKey={dashboard.activeDatabase} />
  else if (page === "visualizer") content = <VisualizerPage databaseKey={dashboard.activeDatabase} initialSelectedCategory={locationParams.get("nodeCategory") || undefined} initialSelectedId={locationParams.get("node") || undefined} initialSelectedKind={locationParams.get("nodeKind") || undefined} initialSelectedLabel={locationParams.get("nodeLabel") || undefined} />
  else if (page === "settings") content = <SettingsPage backupAllowed={auth.can_backup} configureAllowed={auth.can_configure} databaseKey={dashboard.activeDatabase} onAuthStatusChange={onAuthChange} />
  else if (page === "about") content = <AboutPage />

  return (
      <AppShell
      activeDatabase={dashboard.activeDatabase}
      databaseSelectionAllowed={auth.can_select_database}
      databases={dashboard.databases}
      onNavigate={navigate}
      onReload={dashboard.reload}
      onLogout={onLogout}
      onSearch={searchMemories}
      onSelectDatabase={(path) => void dashboard.selectDatabase(path)}
      onToggleTheme={onToggleTheme}
      page={page}
      switching={dashboard.switching}
      theme={theme}
    >
      {dashboard.error ? (
        <div className="mb-6 flex flex-col gap-3 border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>{dashboard.error}</span>
          <Button onClick={() => void dashboard.reload()} size="sm" variant="outline">
            Try again
          </Button>
        </div>
      ) : null}
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading workspace…</p>}>{content}</Suspense>
      </AppShell>
  )
}
