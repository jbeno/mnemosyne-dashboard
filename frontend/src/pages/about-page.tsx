import { ExternalLink } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"

export function AboutPage() {
  return (
    <div className="space-y-8">
      <PageHeader description="A local interface for understanding and maintaining Hermes memory." eyebrow="Mnemosyne" title="About" />
      <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,32rem)_1fr]">
        <img
          alt="Mnemosyne holding the thread of memory"
          className="aspect-square w-full max-w-lg rounded-lg border object-cover object-top shadow-2xl shadow-black/20"
          src="/static/mnemosyne-portrait-512.png"
        />
        <div className="max-w-xl space-y-6 py-2">
          <div>
            <p className="eyebrow mb-2">Version</p>
            <p className="text-2xl font-semibold">0.15.0</p>
          </div>
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold">Maintained fork</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This project continues the original mnemosyne-dashboard work with current Hermes compatibility, local-first operation, and a maintained interface.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href="https://github.com/jbeno/mnemosyne-dashboard" rel="noreferrer" target="_blank">
                Maintained repository <ExternalLink className="size-4" />
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="https://github.com/wysie/mnemosyne-dashboard" rel="noreferrer" target="_blank">
                Historical upstream <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
