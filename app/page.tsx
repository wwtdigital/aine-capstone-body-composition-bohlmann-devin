import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-white">Body Composition Copilot</h1>
        <p className="text-zinc-400 text-sm mt-1">Phase 1 — scaffold deployed</p>
      </div>

      <div className="flex-1 px-4 py-6 space-y-3">
        <Link href="/log" className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 active:scale-95 transition-transform" style={{ minHeight: '60px' }}>
          <div>
            <p className="text-white font-semibold">Log Meal</p>
            <p className="text-zinc-400 text-sm">Photo-based analysis</p>
          </div>
          <span className="text-zinc-500 text-xl">→</span>
        </Link>

        <Link href="/inbody" className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 active:scale-95 transition-transform" style={{ minHeight: '60px' }}>
          <div>
            <p className="text-white font-semibold">InBody</p>
            <p className="text-zinc-400 text-sm">Body composition readings</p>
          </div>
          <span className="text-zinc-500 text-xl">→</span>
        </Link>

        <Link href="/week" className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 active:scale-95 transition-transform" style={{ minHeight: '60px' }}>
          <div>
            <p className="text-white font-semibold">Week</p>
            <p className="text-zinc-400 text-sm">7-day overview</p>
          </div>
          <span className="text-zinc-500 text-xl">→</span>
        </Link>

        <Link href="/month" className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 active:scale-95 transition-transform" style={{ minHeight: '60px' }}>
          <div>
            <p className="text-white font-semibold">Month</p>
            <p className="text-zinc-400 text-sm">Trends + gap analysis</p>
          </div>
          <span className="text-zinc-500 text-xl">→</span>
        </Link>

        <Link href="/settings" className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 active:scale-95 transition-transform" style={{ minHeight: '60px' }}>
          <div>
            <p className="text-white font-semibold">Settings</p>
            <p className="text-zinc-400 text-sm">Goals + Whoop</p>
          </div>
          <span className="text-zinc-500 text-xl">→</span>
        </Link>
      </div>
    </div>
  )
}
