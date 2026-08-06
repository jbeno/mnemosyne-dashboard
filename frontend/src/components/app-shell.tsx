import { useEffect, useState, type ReactNode } from "react"
import { Database, LogOut, Menu, Moon, RefreshCw, Search, Sun, X } from "lucide-react"

import { AppSidebar, type PageId } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { Theme } from "@/hooks/use-theme"
import type { Database as DatabaseRecord } from "@/lib/types"
import { cn } from "@/lib/utils"

const SIDEBAR_STORAGE_KEY = "mnemosyne:sidebar-collapsed"

export function AppShell({
  page,
  onNavigate,
  onSearch,
  theme,
  onToggleTheme,
  databases,
  activeDatabase,
  databaseSelectionAllowed,
  switching,
  onSelectDatabase,
  onReload,
  onLogout,
  children,
}: {
  page: PageId
  onNavigate: (page: PageId) => void
  onSearch: (query: string) => void
  theme: Theme
  onToggleTheme: () => void
  databases: DatabaseRecord[]
  activeDatabase: string
  databaseSelectionAllowed: boolean
  switching: boolean
  onSelectDatabase: (path: string) => void
  onReload: () => void | Promise<void>
  onLogout?: () => void | Promise<void>
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true")
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
  }, [collapsed])

  const activeRecord = databases.find((database) => database.path === activeDatabase)
    ?? databases.find((database) => database.active)
  const submitSearch = () => {
    if (searchQuery.trim()) onSearch(searchQuery.trim())
    setSearchOpen(false)
  }
  const reload = async () => {
    if (refreshing) return
    setRefreshing(true)
    const minimumFeedback = new Promise((resolve) => window.setTimeout(resolve, 650))
    try {
      await Promise.all([Promise.resolve(onReload()), minimumFeedback])
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="min-h-screen">
      <AppSidebar collapsed={collapsed} onNavigate={onNavigate} onToggleCollapsed={() => setCollapsed((value) => !value)} page={page} />
      <div className={cn("transition-[padding]", collapsed ? "lg:pl-16" : "lg:pl-64")}>
        <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <Sheet>
            <SheetTrigger asChild>
              <Button aria-label="Open navigation" className="lg:hidden" size="icon" variant="ghost">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SheetDescription className="sr-only">Navigate the Mnemosyne dashboard.</SheetDescription>
              <AppSidebar mobile onNavigate={onNavigate} page={page} />
            </SheetContent>
          </Sheet>

          {databases.length ? (
            <Select disabled={switching || !databaseSelectionAllowed} onValueChange={onSelectDatabase} value={activeDatabase}>
              <SelectTrigger
                aria-label="Active memory database"
                className="w-32 shrink-0 gap-1.5 px-2 font-medium min-[380px]:w-48 sm:w-60"
                title={databaseSelectionAllowed ? `Memory database: ${activeRecord?.label || "select"}` : "Database selection requires localhost or password authentication"}
              >
                <Database className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-left">
                  {activeRecord?.label || (switching ? "Switching memory…" : "Loading memory…")}
                </span>
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                {databases.map((database) => <SelectItem key={database.path} value={database.path}>{database.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex h-9 w-32 shrink-0 items-center gap-2 rounded-md border px-2.5 text-sm text-muted-foreground min-[380px]:w-44 sm:w-60">
              <Database className="size-4 shrink-0" />
              <span className="truncate">Loading memory…</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <div className="relative">
              <Button aria-expanded={searchOpen} aria-label="Search memories" onClick={() => setSearchOpen((value) => !value)} size="icon" title="Search memories" variant="ghost">
                <Search />
              </Button>
              {searchOpen ? (
                <SearchField autoFocus className="fixed left-4 right-4 top-16 w-auto rounded-md border bg-popover p-2 shadow-xl sm:left-auto sm:w-[28rem]" onChange={setSearchQuery} onSubmit={submitSearch} query={searchQuery} />
              ) : null}
            </div>

            <Button aria-label="Refresh dashboard data" disabled={switching || refreshing} onClick={() => void reload()} size="icon" title="Refresh dashboard data" variant="ghost">
              <RefreshCw className={switching || refreshing ? "animate-spin" : ""} />
            </Button>
            <Button
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              onClick={onToggleTheme}
              size="icon"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              variant="ghost"
            >
              {theme === "dark" ? <Moon /> : <Sun />}
            </Button>
            {onLogout ? <Button aria-label="Sign out" onClick={() => void onLogout()} size="icon" title="Sign out" variant="ghost"><LogOut /></Button> : null}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[100rem] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  )
}

function SearchField({
  autoFocus = false,
  className,
  onChange,
  onSubmit,
  query,
}: {
  autoFocus?: boolean
  className?: string
  onChange: (value: string) => void
  onSubmit: () => void
  query: string
}) {
  return (
    <form className={cn("relative", className)} onSubmit={(event) => { event.preventDefault(); onSubmit() }} role="search">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input aria-label="Search all memories" autoFocus={autoFocus} className="bg-background/35 pl-9 pr-9" onChange={(event) => onChange(event.target.value)} placeholder="Search all memories…" value={query} />
      {query ? (
        <button
          aria-label="Clear search"
          className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onChange("")}
          type="button"
        >
          <X className="size-4" />
        </button>
      ) : null}
      <button className="sr-only" type="submit">Search</button>
    </form>
  )
}
