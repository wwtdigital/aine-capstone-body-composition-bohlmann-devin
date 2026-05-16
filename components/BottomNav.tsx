'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Camera, Sparkles, BarChart2, Activity } from 'lucide-react'

const tabs = [
  { href: '/', icon: Home, label: 'Today' },
  { href: '/log', icon: Camera, label: 'Log' },
  { href: '/gap', icon: Sparkles, label: 'Analysis' },
  { href: '/week', icon: BarChart2, label: 'Week' },
  { href: '/month', icon: Activity, label: 'Body' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800">
      <div className="flex safe-area-bottom">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                active
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
              style={{ minHeight: '60px' }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
