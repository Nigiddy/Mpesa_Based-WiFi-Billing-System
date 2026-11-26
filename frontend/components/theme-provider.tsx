"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

function applyThemeToDocument(next: Theme) {
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(next)
  root.style.colorScheme = next
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    const saved = localStorage.getItem("theme")
    const initial: Theme =
      saved === "light" || saved === "dark"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"

    setTheme(initial)
    applyThemeToDocument(initial)

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handleSystemChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem("theme")
      if (stored !== "light" && stored !== "dark") {
        const next: Theme = e.matches ? "dark" : "light"
        setTheme(next)
        applyThemeToDocument(next)
      }
    }

    mq.addEventListener("change", handleSystemChange)
    return () => mq.removeEventListener("change", handleSystemChange)
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light"
      applyThemeToDocument(next)
      localStorage.setItem("theme", next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
