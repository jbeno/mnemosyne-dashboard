import { useState, type ComponentType, type FocusEvent, type SVGProps } from "react"
import {
  Activity,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CircleUserRound,
  Clock3,
  GitBranch,
  History,
  Info,
  LayoutDashboard,
  ListTree,
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

const groups: Array<{ label: string; icon: Icon; items: Array<{ id: PageId; label: string; icon: Icon }> }> = [
  {
    label: "Home",
    icon: LayoutDashboard,
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "today", label: "Today", icon: CalendarDays },
    ],
  },
  {
    label: "Memory",
    icon: BookOpen,
    items: [
      { id: "memories", label: "Browse memories", icon: BookOpen },
      { id: "review", label: "Trust review", icon: ShieldCheck },
      { id: "lifecycle", label: "Lifecycle", icon: Activity },
      { id: "history", label: "History", icon: History },
    ],
  },
  {
    label: "Knowledge",
    icon: BrainCircuit,
    items: [
      { id: "context", label: "Context bank", icon: ListTree },
      { id: "graph", label: "Knowledge graph", icon: GitBranch },
      { id: "memoria", label: "MEMORIA", icon: BrainCircuit },
      { id: "profile", label: "Persona & facts", icon: CircleUserRound },
    ],
  },
  {
    label: "Explore",
    icon: Sparkles,
    items: [{ id: "visualizer", label: "Visualizer", icon: Sparkles }],
  },
  {
    label: "System",
    icon: Settings,
    items: [
      { id: "settings", label: "Settings", icon: Settings },
      { id: "about", label: "About", icon: Info },
    ],
  },
]

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 py-1", collapsed ? "justify-center" : "px-3")}>
      <img
        alt="Mnemosyne"
        className="size-10 shrink-0 rounded-full border border-primary/25 object-cover shadow-sm"
        src="/static/mnemosyne-avatar-64.png"
      />
      {collapsed ? null : (
        <div>
          <p className="font-display text-xl font-semibold leading-none tracking-tight">Mnemosyne</p>
          <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Hermes memory</p>
        </div>
      )}
    </div>
  )
}

export function AppSidebar({
  page,
  onNavigate,
  collapsed = false,
  mobile = false,
  onToggleCollapsed,
}: {
  page: PageId
  onNavigate: (page: PageId) => void
  collapsed?: boolean
  mobile?: boolean
  onToggleCollapsed?: () => void
}) {
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  const navigate = (nextPage: PageId) => {
    setOpenGroup(null)
    onNavigate(nextPage)
  }

  const expandedNavigation = (
    <nav aria-label="Primary" className="mt-7 flex-1 space-y-6 overflow-y-auto pr-1">
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
                    "h-9 w-full justify-start gap-3 px-3 font-normal text-muted-foreground hover:bg-muted/55 hover:text-foreground",
                    page === item.id && "bg-accent font-medium text-foreground shadow-none hover:bg-accent",
                  )}
                  onClick={() => navigate(item.id)}
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
  )

  const collapsedNavigation = (
    <nav aria-label="Primary" className="mt-7 flex flex-1 flex-col items-center gap-2">
      {groups.map((group) => {
        const GroupIcon = group.icon
        const active = group.items.some((item) => item.id === page)
        const open = openGroup === group.label
        const closeOnBlur = (event: FocusEvent<HTMLDivElement>) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenGroup(null)
        }
        return (
          <div
            className="relative"
            key={group.label}
            onBlur={closeOnBlur}
            onMouseEnter={() => setOpenGroup(group.label)}
          >
            <Button
              aria-expanded={open}
              aria-haspopup="menu"
              aria-label={`${group.label} navigation`}
              className={cn(
                "hover:bg-muted/45 hover:text-foreground",
                active && "bg-accent text-foreground hover:bg-accent",
              )}
              onClick={() => navigate(group.items[0].id)}
              size="icon"
              title={group.label}
              variant="ghost"
            >
              <GroupIcon />
            </Button>
            {open ? (
              <div className="absolute left-[calc(100%+0.75rem)] top-0 z-50 w-56 rounded-md border bg-popover p-2 text-popover-foreground shadow-xl before:absolute before:-left-3 before:top-0 before:h-full before:w-3 before:content-['']" role="menu">
                <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">{group.label}</p>
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <Button
                      aria-current={page === item.id ? "page" : undefined}
                      className={cn(
                        "w-full justify-start font-normal text-muted-foreground hover:bg-muted/55 hover:text-foreground",
                        page === item.id && "bg-accent text-foreground hover:bg-accent",
                      )}
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      role="menuitem"
                      variant="ghost"
                    >
                      <Icon />{item.label}
                    </Button>
                  )
                })}
              </div>
            ) : null}
          </div>
        )
      })}
    </nav>
  )

  if (mobile) {
    return <div className="flex min-h-0 flex-1 flex-col px-4 pb-5 pt-5"><Brand />{expandedNavigation}</div>
  }

  return (
    <aside
      className={cn("fixed inset-y-0 left-0 z-50 hidden flex-col border-r bg-background/88 py-5 backdrop-blur-xl transition-[width] lg:flex", collapsed ? "w-16 px-3" : "w-64 px-4")}
      onMouseLeave={() => setOpenGroup(null)}
    >
      <Brand collapsed={collapsed} />
      <button
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="group/rail absolute inset-y-0 -right-2 z-40 w-4 cursor-col-resize outline-none after:absolute after:inset-y-3 after:left-1/2 after:w-px after:bg-primary/0 after:transition-colors hover:after:bg-primary/55 focus-visible:after:bg-primary"
        onClick={onToggleCollapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className="sr-only">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
      </button>
      {collapsed ? collapsedNavigation : expandedNavigation}
    </aside>
  )
}

export function TimeMark() {
  return <Clock3 aria-hidden="true" className="size-4 text-muted-foreground" />
}
