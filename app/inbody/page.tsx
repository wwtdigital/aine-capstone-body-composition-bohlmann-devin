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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <div className="flex items-center justify-between px-4 pt-12 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">InBody</h1>
          <p className="text-zinc-500 dark:text-zinc-500 text-sm">Body composition readings</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/inbody/new"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-800 text-white text-xs font-semibold active:scale-95 transition-transform"
          >
            <Plus size={14} />
            Add
          </Link>
          <Link
            href="/inbody/import"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold active:scale-95 transition-transform"
          >
            <Upload size={14} />
            PDFs
          </Link>
        </div>
      </div>

      {readings.length === 0 ? (
        <div className="mx-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-10 text-center">
          <p className="text-zinc-400 dark:text-zinc-600 text-sm">No readings yet.</p>
          <Link href="/inbody/new" className="mt-3 inline-block text-blue-600 dark:text-blue-400 text-sm font-semibold">Add a reading →</Link>
        </div>
      ) : (
        <div className="px-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
            {readings.map(r => {
              const date = new Date(r.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              return (
                <div key={r.id} className="px-4 py-4">
                  <p className="text-zinc-700 dark:text-zinc-300 text-sm font-medium mb-3">{date}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-zinc-900 dark:text-white font-bold text-lg tabular-nums">{r.weight_kg ?? '—'}</p>
                      <p className="text-zinc-400 dark:text-zinc-600 text-xs">kg</p>
                    </div>
                    <div>
                      <p className="text-zinc-900 dark:text-white font-bold text-lg tabular-nums">{r.body_fat_pct != null ? `${r.body_fat_pct}%` : '—'}</p>
                      <p className="text-zinc-400 dark:text-zinc-600 text-xs">body fat</p>
                    </div>
                    <div>
                      <p className="text-zinc-900 dark:text-white font-bold text-lg tabular-nums">{r.lean_mass_kg ?? '—'}</p>
                      <p className="text-zinc-400 dark:text-zinc-600 text-xs">lean kg</p>
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
