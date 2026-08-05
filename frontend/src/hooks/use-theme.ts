import { useCallback, useEffect, useState } from "react"

export type Theme = "light" | "dark"

const STORAGE_KEY = "mnemosyne-dashboard-theme"

function initialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === "light" || saved === "dark") return saved
  return "dark"
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.documentElement.style.colorScheme = theme
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(
    () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    [],
  )

  return { theme, toggleTheme }
}
