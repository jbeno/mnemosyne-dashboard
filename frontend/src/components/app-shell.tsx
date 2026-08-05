import type { ReactNode } from "react"
import { Menu, Moon, RefreshCw, Sun } from "lucide-react"

import { AppSidebar, DatabaseMark, type PageId } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { Database } from "@/lib/types"
import type { Theme } from "@/hooks/use-theme"

export function AppShell({
  page,
  onNavigate,
  theme,
  onToggleTheme,
  databases,
  activeDatabase,
  switching,
  onSelectDatabase,
  onReload,
  children,
}: {
  page: PageId
  onNavigate: (page: PageId) => void
  theme: Theme
  onToggleTheme: () => void
  databases: Database[]
  activeDatabase: string
  switching: boolean
  onSelectDatabase: (path: string) => void
  onReload: () => void
  children: ReactNode
}) {
  return (
    <div className="min-h-screen">
      <AppSidebar onNavigate={onNavigate} page={page} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
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

          <div className="flex min-w-0 flex-1 items-center gap-2 lg:max-w-sm">
            <DatabaseMark />
            {databases.length ? (
              <Select disabled={switching} onValueChange={onSelectDatabase} value={activeDatabase}>
                <SelectTrigger aria-label="Active database" className="w-full border-0 bg-transparent px-1 shadow-none">
                  <SelectValue placeholder="Select database" />
                </SelectTrigger>
                <SelectContent>
                  {databases.map((database) => (
                    <SelectItem key={database.path} value={database.path}>
                      {database.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="truncate text-sm text-muted-foreground">Loading database…</span>
            )}
          </div>

          <Button aria-label="Refresh dashboard data" disabled={switching} onClick={onReload} size="icon" variant="ghost">
            <RefreshCw className={`size-4 ${switching ? "animate-spin" : ""}`} />
          </Button>
          <Button
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            onClick={onToggleTheme}
            size="icon"
            variant="ghost"
          >
            {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </Button>
        </header>
        <main className="mx-auto w-full max-w-[100rem] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  )
}
