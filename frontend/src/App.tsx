import { useCallback, useEffect, useState } from "react"

import { AppShell } from "@/components/app-shell"
import { pageTitles, type PageId } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { useDashboard } from "@/hooks/use-dashboard"
import { useTheme } from "@/hooks/use-theme"
import { AboutPage } from "@/pages/about-page"
import { HistoryPage } from "@/pages/history-page"
import { LifecyclePage } from "@/pages/lifecycle-page"
import { MemoriesPage } from "@/pages/memories-page"
import { OverviewPage } from "@/pages/overview-page"
import { PlaceholderPage } from "@/pages/placeholder-page"
import { ReviewPage } from "@/pages/review-page"
import { TodayPage } from "@/pages/today-page"

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
  const { theme, toggleTheme } = useTheme()
  const dashboard = useDashboard()

  useEffect(() => {
    const onPopState = () => setPage(pageFromLocation())
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  useEffect(() => {
    document.title = `${pageTitles[page]} — Mnemosyne`
  }, [page])

  const navigate = useCallback((nextPage: PageId) => {
    const url = new URL(window.location.href)
    url.searchParams.set("page", nextPage)
    window.history.pushState({}, "", url)
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  let content
  if (page === "overview") content = <OverviewPage loading={dashboard.loading} stats={dashboard.stats} />
  else if (page === "today") content = <TodayPage digest={dashboard.today} loading={dashboard.loading} />
  else if (page === "memories") content = <MemoriesPage databaseKey={dashboard.activeDatabase} stats={dashboard.stats} />
  else if (page === "review") content = <ReviewPage databaseKey={dashboard.activeDatabase} />
  else if (page === "lifecycle") content = <LifecyclePage databaseKey={dashboard.activeDatabase} />
  else if (page === "history") content = <HistoryPage databaseKey={dashboard.activeDatabase} />
  else if (page === "about") content = <AboutPage />
  else content = <PlaceholderPage page={page} />

  return (
    <AppShell
      activeDatabase={dashboard.activeDatabase}
      databases={dashboard.databases}
      onNavigate={navigate}
      onReload={() => void dashboard.reload()}
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
      {content}
    </AppShell>
  )
}
