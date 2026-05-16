import { db } from '@/lib/db'
import GalleryGrid from './GalleryGrid'

export const revalidate = 0

type MealPhoto = {
  id: string
  photo_url: string
  logged_at: number
  total_calories: number
  items_json: string
}

export default async function GalleryPage() {
  const result = await db.execute({
    sql: `SELECT id, photo_url, logged_at, total_calories, items_json FROM meals WHERE user_id = 'will' AND photo_url IS NOT NULL ORDER BY logged_at DESC LIMIT 60`,
    args: [],
  })

  const photos = result.rows as unknown as MealPhoto[]

  return (
    <div className="min-h-screen bg-page pb-24">
      <div className="px-4 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-ink tracking-tight">Gallery</h1>
        <p className="text-ink3 text-sm">{photos.length} meal photo{photos.length !== 1 ? 's' : ''}</p>
      </div>

      {photos.length === 0 ? (
        <div className="mx-4 bg-card rounded-2xl border border-line p-12 text-center">
          <p className="text-ink3 text-sm">No meal photos yet</p>
          <p className="text-ink3 text-xs mt-1">Log a meal with a photo to see it here</p>
        </div>
      ) : (
        <GalleryGrid photos={photos} />
      )}
    </div>
  )
}
