'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Trash2 } from 'lucide-react'

type MealItem = {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

type Meal = {
  id: string
  logged_at: number
  total_calories: number
  total_protein: number
  items_json: string
  photo_url: string | null
}

function MacroChip({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-sm font-bold tabular-nums ${color}`}>{Math.round(value)}<span className="text-xs font-normal">{unit}</span></p>
      <p className="text-ink3 text-xs">{label}</p>
    </div>
  )
}

export default function MealList({ meals }: { meals: Meal[] }) {
  const router = useRouter()
  const [open, setOpen] = useState<Meal | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(id: string) {
    setDeleting(true)
    await fetch(`/api/meals/${id}`, { method: 'DELETE' })
    setOpen(null)
    setDeleting(false)
    router.refresh()
  }

  const items: MealItem[] = open ? (() => {
    try { return JSON.parse(open.items_json) } catch { return [] }
  })() : []

  const firstName = items[0]?.name ?? 'Meal'
  const title = items.length > 1 ? `${firstName} +${items.length - 1} more` : firstName

  return (
    <>
      <div className="space-y-2">
        {meals.map(meal => {
          let label = 'Meal'
          try {
            const parsed = JSON.parse(meal.items_json)
            label = parsed[0]?.name ?? 'Meal'
            if (parsed.length > 1) label += ` +${parsed.length - 1} more`
          } catch {}
          const time = new Date(meal.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

          return (
            <button
              key={meal.id}
              onClick={() => setOpen(meal)}
              className="w-full bg-card rounded-2xl border border-line p-3.5 flex items-center gap-3 active:scale-95 transition-transform text-left"
            >
              {meal.photo_url && (
                <img src={meal.photo_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-ink text-sm font-medium truncate">{label}</p>
                <p className="text-ink3 text-xs">{time}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-ink text-sm font-bold tabular-nums">{Math.round(meal.total_calories)}</p>
                <p className="text-ink3 text-xs">cal</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Bottom sheet */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(null)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[85vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-line" />
            </div>

            <div className="flex items-start justify-between px-5 pt-2 pb-3 shrink-0">
              <div>
                <p className="text-ink font-semibold text-base leading-snug">{title}</p>
                <p className="text-ink3 text-xs mt-0.5">
                  {new Date(open.logged_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setOpen(null)} className="text-ink3 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 pb-6">
              {open.photo_url && (
                <div className="mb-4 rounded-2xl overflow-hidden">
                  <img src={open.photo_url} alt="" className="w-full max-h-56 object-cover" />
                </div>
              )}

              <div className="bg-surface rounded-2xl p-4 mb-4 grid grid-cols-4 gap-2">
                <MacroChip label="cal" value={open.total_calories} unit="" color="text-brand" />
                <MacroChip label="protein" value={open.total_protein} unit="g" color="text-ok" />
                <MacroChip label="carbs" value={items.reduce((s, i) => s + (i.carbs ?? 0), 0)} unit="g" color="text-warn" />
                <MacroChip label="fat" value={items.reduce((s, i) => s + (i.fat ?? 0), 0)} unit="g" color="text-nourish" />
              </div>

              {items.length > 0 && (
                <div className="space-y-1 mb-5">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-ink text-sm font-medium truncate">{item.name}</p>
                        {item.portion && <p className="text-ink3 text-xs">{item.portion}</p>}
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <p className="text-ink text-sm font-semibold tabular-nums">{Math.round(item.calories)} cal</p>
                        <p className="text-ink3 text-xs tabular-nums">
                          P{Math.round(item.protein)}g · C{Math.round(item.carbs)}g · F{Math.round(item.fat)}g
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => handleDelete(open.id)}
                disabled={deleting}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-bad border border-bad/30 text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
              >
                <Trash2 size={15} />
                {deleting ? 'Deleting…' : 'Delete meal'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
