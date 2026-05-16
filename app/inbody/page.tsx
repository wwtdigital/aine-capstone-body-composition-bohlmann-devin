import Link from 'next/link'
import { db } from '@/lib/db'
import { Plus, Upload } from 'lucide-react'

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
    <div className="min-h-screen bg-page pb-24">
      <div className="flex items-center justify-between px-4 pt-12 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">InBody</h1>
          <p className="text-ink3 text-sm">Body composition readings</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/inbody/new"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand text-page text-xs font-semibold active:scale-95 transition-transform"
          >
            <Plus size={14} />
            Add
          </Link>
          <Link
            href="/inbody/import"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-line text-ink2 text-xs font-semibold active:scale-95 transition-transform"
          >
            <Upload size={14} />
            PDFs
          </Link>
        </div>
      </div>

      {readings.length === 0 ? (
        <div className="mx-4 bg-card rounded-2xl border border-line p-10 text-center">
          <p className="text-ink3 text-sm">No readings yet.</p>
          <Link href="/inbody/new" className="mt-3 inline-block text-brand text-sm font-semibold">Add a reading →</Link>
        </div>
      ) : (
        <div className="px-4">
          <div className="bg-card rounded-2xl border border-line divide-y divide-line">
            {readings.map(r => {
              const date = new Date(r.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              return (
                <div key={r.id} className="px-4 py-4">
                  <p className="text-ink2 text-sm font-medium mb-3">{date}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-ink font-bold text-lg tabular-nums">{r.weight_kg ?? '—'}</p>
                      <p className="text-ink3 text-xs">kg</p>
                    </div>
                    <div>
                      <p className="text-ink font-bold text-lg tabular-nums">{r.body_fat_pct != null ? `${r.body_fat_pct}%` : '—'}</p>
                      <p className="text-ink3 text-xs">body fat</p>
                    </div>
                    <div>
                      <p className="text-ink font-bold text-lg tabular-nums">{r.lean_mass_kg ?? '—'}</p>
                      <p className="text-ink3 text-xs">lean kg</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
