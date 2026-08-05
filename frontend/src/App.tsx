import { lazy, Suspense, useCallback, useEffect, useState } from "react"

import { AppShell } from "@/components/app-shell"
import { pageTitles, type PageId } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useDashboard } from "@/hooks/use-dashboard"
import { useTheme } from "@/hooks/use-theme"
import { AboutPage } from "@/pages/about-page"
import { HistoryPage } from "@/pages/history-page"
import { MemoriesPage } from "@/pages/memories-page"
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
  const candidate = new URLSearchParams(window.location.search).get("page") as PageId | null
  return candidate && validPages.has(candidate) ? candidate : "overview"
}

export default function App() {
  const [page, setPage] = useState<PageId>(pageFromLocation)
  const [memorySearch, setMemorySearch] = useState(() => new URLSearchParams(window.location.search).get("q") || "")
  const { theme, toggleTheme } = useTheme()
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
    if (nextPage === "memories") {
      url.searchParams.delete("q")
      setMemorySearch("")
    }
    window.history.pushState({}, "", url)
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const searchMemories = useCallback((query: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set("page", "memories")
    url.searchParams.set("q", query)
    window.history.pushState({}, "", url)
    setMemorySearch(query)
    setPage("memories")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  let content
  if (page === "overview") content = <OverviewPage databaseKey={dashboard.activeDatabase} loading={dashboard.loading} stats={dashboard.stats} />
  else if (page === "today") content = <TodayPage digest={dashboard.today} loading={dashboard.loading} />
  else if (page === "memories") content = <MemoriesPage databaseKey={dashboard.activeDatabase} searchRequest={memorySearch} stats={dashboard.stats} />
  else if (page === "review") content = <ReviewPage databaseKey={dashboard.activeDatabase} />
  else if (page === "lifecycle") content = <LifecyclePage databaseKey={dashboard.activeDatabase} />
  else if (page === "history") content = <HistoryPage databaseKey={dashboard.activeDatabase} />
  else if (page === "context") content = <ContextBankPage databaseKey={dashboard.activeDatabase} />
  else if (page === "graph") content = <KnowledgeGraphPage databaseKey={dashboard.activeDatabase} />
  else if (page === "memoria") content = <MemoriaPage databaseKey={dashboard.activeDatabase} />
  else if (page === "profile") content = <PersonaFactsPage databaseKey={dashboard.activeDatabase} />
  else if (page === "visualizer") content = <VisualizerPage databaseKey={dashboard.activeDatabase} />
  else if (page === "settings") content = <SettingsPage databaseKey={dashboard.activeDatabase} />
  else if (page === "about") content = <AboutPage />

  return (
    <TooltipProvider delayDuration={200}>
      <AppShell
      activeDatabase={dashboard.activeDatabase}
      databases={dashboard.databases}
      onNavigate={navigate}
      onReload={dashboard.reload}
      onSearch={searchMemories}
      onSelectDatabase={(path) => void dashboard.selectDatabase(path)}
      onToggleTheme={toggleTheme}
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
    </TooltipProvider>
  )
}
