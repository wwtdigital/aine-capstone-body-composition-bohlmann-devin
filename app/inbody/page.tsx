import Link from 'next/link'
import { db } from '@/lib/db'

export const revalidate = 0

type Reading = {
  id: string
  reading_date: number
  weight_kg: number | null
  body_fat_pct: number | null
  lean_mass_kg: number | null
}

export default async function InBodyPage() {
  const result = await db.execute({
    sql: `SELECT id, reading_date, weight_kg, body_fat_pct, lean_mass_kg FROM inbody_readings WHERE user_id = 'will' ORDER BY reading_date DESC LIMIT 20`,
    args: [],
  })
  const readings = result.rows as unknown as Reading[]

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col pb-10">
      <div className="flex items-center justify-between px-4 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-zinc-400 text-sm">← Home</Link>
          <h1 className="text-xl font-bold text-white">InBody</h1>
        </div>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3 mb-6">
        <Link href="/inbody/new" className="flex flex-col items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 py-5 active:scale-95 transition-transform" style={{ minHeight: '80px' }}>
          <p className="text-white font-semibold">Manual Entry</p>
          <p className="text-zinc-400 text-xs mt-1">Type in values</p>
        </Link>
        <Link href="/inbody/import" className="flex flex-col items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 py-5 active:scale-95 transition-transform" style={{ minHeight: '80px' }}>
          <p className="text-white font-semibold">Import PDFs</p>
          <p className="text-zinc-400 text-xs mt-1">Bulk upload</p>
        </Link>
      </div>

      {readings.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-500 text-sm">No readings yet.</p>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          <p className="text-zinc-400 text-sm">Recent readings</p>
          {readings.map(r => {
            const date = new Date(r.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            return (
              <div key={r.id} className="bg-zinc-900 rounded-xl p-4">
                <p className="text-white font-semibold mb-2">{date}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-white font-bold">{r.weight_kg != null ? `${r.weight_kg}` : '—'}</p>
                    <p className="text-zinc-500 text-xs">kg</p>
                  </div>
                  <div>
                    <p className="text-white font-bold">{r.body_fat_pct != null ? `${r.body_fat_pct}%` : '—'}</p>
                    <p className="text-zinc-500 text-xs">body fat</p>
                  </div>
                  <div>
                    <p className="text-white font-bold">{r.lean_mass_kg != null ? `${r.lean_mass_kg}` : '—'}</p>
                    <p className="text-zinc-500 text-xs">lean kg</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
