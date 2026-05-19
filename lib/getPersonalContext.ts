import { db } from './db'
import { USER_ID } from './userId'

// Fetches the user's free-text personal context notes.
// Injected into all AI system prompts so the coach knows the full picture.
export async function getPersonalContext(): Promise<string | null> {
  try {
    // Ensure the column exists — added after initial table creation
    try {
      await db.execute({ sql: `ALTER TABLE user_settings ADD COLUMN context_notes TEXT`, args: [] })
    } catch { /* already exists */ }

    const result = await db.execute({
      sql: `SELECT context_notes FROM user_settings WHERE user_id = ?`,
      args: [USER_ID],
    })
    const notes = (result.rows[0] as any)?.context_notes
    return notes && notes.trim().length > 0 ? notes.trim() : null
  } catch {
    return null
  }
}
