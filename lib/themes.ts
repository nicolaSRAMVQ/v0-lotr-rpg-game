// Temas visuales para LOTR RPG

export type ThemeType = 'dark' | 'light' | 'amber'

export interface Theme {
  name: string
  bg: string
  text: string
  accent: string
  secondary: string
  border: string
}

export const THEMES: Record<ThemeType, Theme> = {
  dark: {
    name: 'Oscuro (Por defecto)',
    bg: '#0a0804',
    text: '#e8dcc8',
    accent: '#c8a84b',
    secondary: '#8a7a5a',
    border: 'rgba(200,168,75,0.3)',
  },
  light: {
    name: 'Claro',
    bg: '#f5f1e8',
    text: '#2a2418',
    accent: '#9d7a2e',
    secondary: '#6a5a3a',
    border: 'rgba(157,122,46,0.2)',
  },
  amber: {
    name: 'Ámbar (Alto Contraste)',
    bg: '#1a1410',
    text: '#ffeb99',
    accent: '#ffb700',
    secondary: '#cc8800',
    border: 'rgba(255,183,0,0.4)',
  },
}

export function applyTheme(theme: ThemeType) {
  const t = THEMES[theme]
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--bg-primary', t.bg)
    document.documentElement.style.setProperty('--text-primary', t.text)
    document.documentElement.style.setProperty('--accent', t.accent)
    document.documentElement.style.setProperty('--secondary', t.secondary)
    document.documentElement.style.setProperty('--border', t.border)
  }
}
