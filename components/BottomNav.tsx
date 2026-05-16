'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Camera, Sparkles, MessageCircle, Settings } from 'lucide-react'

const tabs = [
  { href: '/', icon: Home, label: 'Today' },
  { href: '/log', icon: Camera, label: 'Log' },
  { href: '/gap', icon: Sparkles, label: 'Analysis' },
  { href: '/chat', icon: MessageCircle, label: 'Ask' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-raised/95 backdrop-blur-md border-t border-line">
      <div className="flex safe-area-bottom">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                active ? 'text-brand' : 'text-ink4 hover:text-ink2'
              }`}
              style={{ minHeight: '60px' }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
              <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
