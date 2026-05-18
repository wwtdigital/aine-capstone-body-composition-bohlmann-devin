import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

async function ensureTable() {
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      daily_reminder INTEGER NOT NULL DEFAULT 1,
      weekly_checkin INTEGER NOT NULL DEFAULT 1,
      reminder_hour INTEGER NOT NULL DEFAULT 18,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    args: [],
  })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { subscription, preferences } = body as {
    subscription: PushSubscriptionJSON
    preferences: { dailyReminder: boolean; weeklyCheckin: boolean; reminderHour: number }
  }

  const endpoint = subscription.endpoint ?? ''
  const p256dh = subscription.keys?.p256dh ?? ''
  const auth = subscription.keys?.auth ?? ''
  const now = Date.now()

  if (!endpoint) return NextResponse.json({ error: 'missing endpoint' }, { status: 400 })

  await ensureTable()

  const existing = await db.execute({
    sql: 'SELECT id FROM push_subscriptions WHERE endpoint = ?',
    args: [endpoint],
  })

  if (existing.rows.length > 0) {
    await db.execute({
      sql: `UPDATE push_subscriptions
            SET daily_reminder = ?, weekly_checkin = ?, reminder_hour = ?, updated_at = ?
            WHERE endpoint = ?`,
      args: [
        preferences.dailyReminder ? 1 : 0,
        preferences.weeklyCheckin ? 1 : 0,
        preferences.reminderHour,
        now,
        endpoint,
      ],
    })
  } else {
    const id = crypto.randomUUID()
    await db.execute({
      sql: `INSERT INTO push_subscriptions
            (id, user_id, endpoint, p256dh, auth, daily_reminder, weekly_checkin, reminder_hour, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        'will',
        endpoint,
        p256dh,
        auth,
        preferences.dailyReminder ? 1 : 0,
        preferences.weeklyCheckin ? 1 : 0,
        preferences.reminderHour,
        now,
        now,
      ],
    })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const body = await req.json()
  const { endpoint } = body as { endpoint: string }

  await ensureTable()

  await db.execute({
    sql: 'DELETE FROM push_subscriptions WHERE endpoint = ?',
    args: [endpoint],
  })

  return NextResponse.json({ ok: true })
}
