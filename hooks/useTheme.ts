import { useState, useEffect } from 'react'
import { ThemeType, applyTheme } from '@/lib/themes'

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeType>('dark')
  const [mounted, setMounted] = useState(false)

  // Cargar tema guardado del localStorage al montar
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('lotr-theme') as ThemeType | null
    if (saved && ['dark', 'light', 'amber'].includes(saved)) {
      setThemeState(saved)
      applyTheme(saved)
    } else {
      applyTheme('dark')
    }
  }, [])

  // Cambiar tema
  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('lotr-theme', newTheme)
  }

  return { theme, setTheme, mounted }
}
