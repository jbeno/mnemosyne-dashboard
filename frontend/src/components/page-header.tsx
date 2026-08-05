import type { ReactNode } from "react"

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  divided = false,
}: {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
  divided?: boolean
}) {
  return (
    <header className={`flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between ${divided ? "border-b pb-7" : ""}`}>
      <div className="max-w-3xl">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="display-title text-4xl leading-[1.05] text-foreground sm:text-5xl">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  )
}
