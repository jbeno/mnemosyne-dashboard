import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("group/tabs flex flex-col", className)} {...props} />
}

function TabsList({
  className,
  size = "default",
  variant = "line",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { size?: "default" | "sm"; variant?: "default" | "line" }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-size={size}
      data-variant={variant}
      className={cn(
        "group/tabs-list inline-flex w-fit max-w-full items-center justify-start overflow-x-auto text-muted-foreground",
        size === "sm" ? "h-6 p-0.5" : "h-9 p-[3px]",
        variant === "default" ? "rounded-lg bg-muted" : "gap-1 rounded-none bg-transparent",
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] shrink-0 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground group-data-[size=sm]/tabs-list:gap-0 group-data-[size=sm]/tabs-list:rounded group-data-[size=sm]/tabs-list:px-1.5 group-data-[size=sm]/tabs-list:py-0 group-data-[size=sm]/tabs-list:!text-[10px] group-data-[size=sm]/tabs-list:leading-none group-data-[variant=default]/tabs-list:data-[state=active]:bg-background group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:after:absolute group-data-[variant=line]/tabs-list:after:inset-x-0 group-data-[variant=line]/tabs-list:after:-bottom-[3px] group-data-[variant=line]/tabs-list:after:h-0.5 group-data-[variant=line]/tabs-list:after:bg-foreground group-data-[variant=line]/tabs-list:after:opacity-0 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
