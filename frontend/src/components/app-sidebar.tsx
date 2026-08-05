import type { ComponentType, SVGProps } from "react"
import {
  Activity,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CircleUserRound,
  Clock3,
  Database,
  GitBranch,
  History,
  Info,
  LayoutDashboard,
  ListTree,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { SheetClose } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type Icon = ComponentType<SVGProps<SVGSVGElement>>

export type PageId =
  | "overview"
  | "today"
  | "memories"
  | "review"
  | "lifecycle"
  | "history"
  | "context"
  | "graph"
  | "memoria"
  | "profile"
  | "visualizer"
  | "settings"
  | "about"

export const pageTitles: Record<PageId, string> = {
  overview: "Overview",
  today: "Today",
  memories: "Browse memories",
  review: "Trust review",
  lifecycle: "Lifecycle",
  history: "History",
  context: "Context bank",
  graph: "Knowledge graph",
  memoria: "MEMORIA",
  profile: "Persona & facts",
  visualizer: "Visualizer",
  settings: "Settings",
  about: "About",
}

const groups: Array<{ label: string; items: Array<{ id: PageId; label: string; icon: Icon }> }> = [
  {
    label: "Home",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "today", label: "Today", icon: CalendarDays },
    ],
  },
  {
    label: "Memory",
    items: [
      { id: "memories", label: "Browse memories", icon: BookOpen },
      { id: "review", label: "Trust review", icon: ShieldCheck },
      { id: "lifecycle", label: "Lifecycle", icon: Activity },
      { id: "history", label: "History", icon: History },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { id: "context", label: "Context bank", icon: ListTree },
      { id: "graph", label: "Knowledge graph", icon: GitBranch },
      { id: "memoria", label: "MEMORIA", icon: BrainCircuit },
      { id: "profile", label: "Persona & facts", icon: CircleUserRound },
    ],
  },
  {
    label: "Explore",
    items: [{ id: "visualizer", label: "Visualizer", icon: Sparkles }],
  },
  {
    label: "System",
    items: [
      { id: "settings", label: "Settings", icon: Settings },
      { id: "about", label: "About", icon: Info },
    ],
  },
]

function Brand() {
  return (
    <div className="flex items-center gap-3 px-3 py-1">
      <img
        alt="Mnemosyne"
        className="size-10 rounded-full border border-primary/25 object-cover shadow-sm"
        src="/static/mnemosyne-avatar-64.png"
      />
      <div>
        <p className="font-display text-xl font-semibold leading-none tracking-tight">Mnemosyne</p>
        <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Hermes memory</p>
      </div>
    </div>
  )
}

export function AppSidebar({
  page,
  onNavigate,
  mobile = false,
}: {
  page: PageId
  onNavigate: (page: PageId) => void
  mobile?: boolean
}) {
  const navigation = (
    <>
      <Brand />
      <form
        action="/"
        className="relative mt-6"
        onSubmit={(event) => {
          event.preventDefault()
          onNavigate("memories")
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <button
          className="flex h-9 w-full items-center rounded-md border bg-background/35 pl-9 pr-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="submit"
        >
          Search memory…
        </button>
      </form>
      <nav aria-label="Primary" className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className="mb-1.5 px-3 text-[0.67rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground/75">
              {group.label}
            </h2>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const button = (
                  <Button
                    aria-current={page === item.id ? "page" : undefined}
                    className={cn(
                      "h-9 w-full justify-start gap-3 px-3 font-normal text-muted-foreground",
                      page === item.id && "bg-accent font-medium text-foreground shadow-none",
                    )}
                    onClick={() => onNavigate(item.id)}
                    variant="ghost"
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    {item.label}
                  </Button>
                )
                return <li key={item.id}>{mobile ? <SheetClose asChild>{button}</SheetClose> : button}</li>
              })}
            </ul>
          </section>
        ))}
      </nav>
    </>
  )

  return mobile ? (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-5 pt-5">{navigation}</div>
  ) : (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-background/80 px-4 py-5 backdrop-blur-xl lg:flex">
      {navigation}
    </aside>
  )
}

export function DatabaseMark() {
  return <Database aria-hidden="true" className="size-4 text-muted-foreground" />
}

export function TimeMark() {
  return <Clock3 aria-hidden="true" className="size-4 text-muted-foreground" />
}
