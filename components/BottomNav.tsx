'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PenLine, TrendingUp, Clock, Settings } from 'lucide-react'

const tabs = [
  { href: '/', icon: Home, label: 'Today' },
  { href: '/log', icon: PenLine, label: 'Log' },
  { href: '/progress', icon: TrendingUp, label: 'Progress' },
  { href: '/history', icon: Clock, label: 'History' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-page/95 backdrop-blur-md border-t border-line">
      <div className="flex safe-area-bottom">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                active ? 'text-brand' : 'text-ink4 hover:text-ink3'
              }`}
              style={{ minHeight: '60px' }}
            >
              <Icon size={20} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[9px] font-medium uppercase tracking-widest">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
