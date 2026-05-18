'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const TABS = [
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'body', label: 'Body Comp' },
  { id: 'ask', label: 'Ask AI' },
] as const

type TabId = typeof TABS[number]['id']

export default function ProgressTabBar({ activeTab }: { activeTab: TabId }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setTab(tab: TabId) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/progress?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="bg-page/95 backdrop-blur-md sticky top-0 z-10 px-4 py-2 flex gap-2 border-b border-line">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === id
              ? 'bg-brand text-page'
              : 'text-ink2 bg-surface border border-line'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
