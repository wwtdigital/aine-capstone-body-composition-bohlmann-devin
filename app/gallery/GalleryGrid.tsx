'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

type MealPhoto = {
  id: string
  photo_url: string
  logged_at: number
  total_calories: number
  items_json: string
}

function getFirstItem(items_json: string): string {
  try {
    const items = JSON.parse(items_json)
    const name = items[0]?.name ?? ''
    return items.length > 1 ? `${name} +${items.length - 1} more` : name
  } catch {
    return ''
  }
}

export default function GalleryGrid({ photos }: { photos: MealPhoto[] }) {
  const [selected, setSelected] = useState<number | null>(null)

  function prev() {
    setSelected((i) => (i != null && i > 0 ? i - 1 : i))
  }

  function next() {
    setSelected((i) => (i != null && i < photos.length - 1 ? i + 1 : i))
  }

  const photo = selected != null ? photos[selected] : null

  return (
    <>
      <div className="px-4 grid grid-cols-3 gap-1.5">
        {photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setSelected(i)}
            className="relative aspect-square rounded-xl overflow-hidden bg-surface active:scale-95 transition-transform"
          >
            <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute bottom-1 right-1 bg-black/60 rounded-md px-1.5 py-0.5 backdrop-blur-sm">
              <p className="text-white text-xs font-semibold tabular-nums">{Math.round(p.total_calories)}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Fullscreen viewer */}
      {photo && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          onClick={() => setSelected(null)}
        >
          <div className="flex items-center justify-between px-4 pt-12 pb-4 shrink-0" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="text-white font-semibold text-sm">{getFirstItem(photo.items_json) || 'Meal'}</p>
              <p className="text-ink3 text-xs">
                {new Date(photo.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                {' · '}{Math.round(photo.total_calories)} cal
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center relative min-h-0">
            <img
              src={photo.photo_url}
              alt=""
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {selected! > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); prev() }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            {selected! < photos.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); next() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
              >
                <ChevronRight size={22} />
              </button>
            )}
          </div>

          <div className="py-4 text-center shrink-0">
            <p className="text-ink3 text-xs tabular-nums">{selected! + 1} / {photos.length}</p>
          </div>
        </div>
      )}
    </>
  )
}
