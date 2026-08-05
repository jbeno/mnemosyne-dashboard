import { ArrowUpRight } from "lucide-react"

import { pageTitles, type PageId } from "@/components/app-sidebar"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"

const descriptions: Partial<Record<PageId, string>> = {
  memories: "Search, filter, and inspect working and episodic memories.",
  review: "Review uncertain provenance, trust signals, and candidate memories.",
  lifecycle: "Understand retention, consolidation, degradation, and expiry.",
  history: "Trace memory events and changes over time.",
  context: "Inspect the context signals available to Hermes agents.",
  graph: "Explore relationships between facts, entities, and memories.",
  memoria: "Inspect higher-order memory intelligence and associations.",
  profile: "Review inferred persona signals and canonical facts.",
  visualizer: "Explore memory structures and relationships visually.",
  settings: "Configure the dashboard, database access, and runtime behavior.",
}

const legacyTabs: Partial<Record<PageId, string>> = {
  memories: "memories",
  review: "review",
  lifecycle: "lifecycle",
  history: "history",
  context: "context",
  graph: "graph",
  memoria: "memoria",
  profile: "profile",
  visualizer: "visualizer",
  settings: "settings",
}

export function PlaceholderPage({ page }: { page: PageId }) {
  const legacyTab = legacyTabs[page]
  return (
    <div className="space-y-8">
      <PageHeader description={descriptions[page]} eyebrow="Candidate migration" title={pageTitles[page]} />
      <section className="max-w-2xl border-l-2 border-primary/45 py-2 pl-5">
        <h2 className="text-lg font-semibold">This workspace is next in the migration.</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The new shell and information architecture are active. This page still uses the established dashboard while its controls and data views are moved into the shared component system.
        </p>
        {legacyTab ? (
          <Button asChild className="mt-5" variant="outline">
            <a href={`/?tab=${legacyTab}`}>
              Open current page <ArrowUpRight className="size-4" />
            </a>
          </Button>
        ) : null}
      </section>
    </div>
  )
}
