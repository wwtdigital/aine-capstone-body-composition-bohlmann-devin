import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { USER_ID } from '@/lib/userId'

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ messages: [] })

  try {
    await db.execute({
      sql: `CREATE TABLE IF NOT EXISTS chat_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      args: [],
    })

    const result = await db.execute({
      sql: `SELECT role, content FROM chat_history WHERE user_id = ? AND id LIKE ? ORDER BY created_at ASC LIMIT 50`,
      args: [USER_ID, `${sessionId}%`],
    })

    const messages = (result.rows as unknown as { role: string; content: string }[]).map(r => ({
      role: r.role,
      content: r.content,
    }))

    return NextResponse.json({ messages })
  } catch (err) {
    console.error('History fetch error:', err)
    return NextResponse.json({ messages: [] })
  }
}
