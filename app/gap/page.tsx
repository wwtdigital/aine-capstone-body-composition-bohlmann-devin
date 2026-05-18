'use client'

import Link from 'next/link'
import GapAnalysis from '@/components/GapAnalysis'

export default function GapPage() {
  return (
    <div className="min-h-screen bg-page pb-24">
      <div className="flex items-start justify-between px-4 pt-12 pb-4">
        <div>
          <h1 className="text-3xl font-semibold text-ink tracking-tight">AI Analysis</h1>
          <p className="text-ink3 text-sm">AI coaching · powered by Claude</p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="bg-surface rounded-xl p-1 flex gap-1">
          <div className="flex-1 bg-card shadow-sm rounded-lg px-4 py-2 text-center text-ink font-semibold text-sm">
            Analysis
          </div>
          <Link href="/chat" className="flex-1 rounded-lg px-4 py-2 text-center text-ink3 text-sm">
            Ask
          </Link>
        </div>
      </div>

      <div className="px-4">
        <GapAnalysis />
      </div>
    </div>
  )
}
