import { useCallback, useEffect, useState } from "react"

import { dashboardApi } from "@/lib/api"
import type { Database, Stats, TodayDigest } from "@/lib/types"

type DashboardState = {
  stats: Stats | null
  today: TodayDigest | null
  databases: Database[]
  activeDatabase: string
  loading: boolean
  switching: boolean
  error: string | null
}

export function useDashboard() {
  const [state, setState] = useState<DashboardState>({
    stats: null,
    today: null,
    databases: [],
    activeDatabase: "",
    loading: true,
    switching: false,
    error: null,
  })

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }))
    try {
      const [stats, today, databases] = await Promise.all([
        dashboardApi.stats(),
        dashboardApi.today(),
        dashboardApi.databases(),
      ])
      setState({
        stats,
        today,
        databases: databases.databases,
        activeDatabase: databases.active,
        loading: false,
        switching: false,
        error: null,
      })
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        switching: false,
        error: error instanceof Error ? error.message : "Dashboard data could not be loaded.",
      }))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const selectDatabase = useCallback(
    async (path: string) => {
      setState((current) => ({ ...current, switching: true, error: null }))
      try {
        await dashboardApi.selectDatabase(path)
        await load()
      } catch (error) {
        setState((current) => ({
          ...current,
          switching: false,
          error: error instanceof Error ? error.message : "Database could not be switched.",
        }))
      }
    },
    [load],
  )

  return { ...state, reload: load, selectDatabase }
}
