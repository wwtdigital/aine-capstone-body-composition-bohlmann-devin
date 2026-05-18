'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Mode = 'dark' | 'light' | 'auto'
type Accent = 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'teal'

type ThemeContextValue = {
  mode: Mode
  setMode: (m: Mode) => void
  accent: Accent
  setAccent: (a: Accent) => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  setMode: () => {},
  accent: 'blue',
  setAccent: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function resolveMode(mode: Mode): 'dark' | 'light' {
  if (mode === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('dark')
  const [accent, setAccentState] = useState<Accent>('blue')

  useEffect(() => {
    const savedMode = (localStorage.getItem('bcc-theme') as Mode) || 'dark'
    const savedAccent = (localStorage.getItem('bcc-accent') as Accent) || 'blue'
    setModeState(savedMode)
    setAccentState(savedAccent)
    document.documentElement.setAttribute('data-theme', resolveMode(savedMode))
    document.documentElement.setAttribute('data-accent', savedAccent)

    if (savedMode === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => {
        document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light')
      }
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [])

  function setMode(m: Mode) {
    setModeState(m)
    localStorage.setItem('bcc-theme', m)
    document.documentElement.setAttribute('data-theme', resolveMode(m))

    if (m === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => {
        document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light')
      }
      mq.addEventListener('change', handler)
      // Store cleanup on window so we can remove it on next setMode call
      ;(window as any).__bccMqHandler = handler
      ;(window as any).__bccMq = mq
    } else {
      // Clean up any existing auto listener
      const prev = (window as any).__bccMqHandler
      const prevMq = (window as any).__bccMq
      if (prev && prevMq) {
        prevMq.removeEventListener('change', prev)
        ;(window as any).__bccMqHandler = null
        ;(window as any).__bccMq = null
      }
    }
  }

  function setAccent(a: Accent) {
    setAccentState(a)
    localStorage.setItem('bcc-accent', a)
    document.documentElement.setAttribute('data-accent', a)
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}
