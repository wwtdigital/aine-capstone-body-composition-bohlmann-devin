import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

const schema = `
CREATE TABLE IF NOT EXISTS meals (
  id TEXT PRIMARY KEY,
  user_id TEXT DEFAULT 'will',
  logged_at INTEGER NOT NULL,
  photo_url TEXT,
  items_json TEXT NOT NULL,
  total_calories REAL NOT NULL,
  total_protein REAL NOT NULL,
  total_carbs REAL NOT NULL,
  total_fat REAL NOT NULL,
  vision_raw_json TEXT,
  edited INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS inbody_readings (
  id TEXT PRIMARY KEY,
  user_id TEXT DEFAULT 'will',
  reading_date INTEGER NOT NULL,
  weight_kg REAL,
  body_fat_pct REAL,
  lean_mass_kg REAL,
  body_water_kg REAL,
  visceral_fat_level REAL,
  source TEXT,
  raw_extracted_json TEXT,
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  UNIQUE(user_id, reading_date)
);

CREATE TABLE IF NOT EXISTS whoop_daily (
  id TEXT PRIMARY KEY,
  user_id TEXT DEFAULT 'will',
  date TEXT NOT NULL,
  recovery_score INTEGER,
  strain REAL,
  hrv_ms REAL,
  rhr INTEGER,
  sleep_minutes INTEGER,
  sleep_efficiency REAL,
  raw_json TEXT,
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS whoop_auth (
  user_id TEXT PRIMARY KEY DEFAULT 'will',
  access_token TEXT,
  refresh_token TEXT,
  expires_at INTEGER,
  updated_at INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS goals (
  user_id TEXT PRIMARY KEY DEFAULT 'will',
  daily_calories INTEGER,
  daily_protein_g INTEGER,
  daily_carbs_g INTEGER,
  daily_fat_g INTEGER,
  target_body_fat_pct REAL,
  target_lean_mass_kg REAL,
  daily_sleep_hours REAL,
  updated_at INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_meals_logged_at ON meals(user_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_inbody_date ON inbody_readings(user_id, reading_date);
CREATE INDEX IF NOT EXISTS idx_whoop_date ON whoop_daily(user_id, date);
`

const goalsSeed = `
INSERT OR IGNORE INTO goals (user_id, daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g, target_body_fat_pct, target_lean_mass_kg, daily_sleep_hours)
VALUES ('will', 2500, 200, 200, 80, 12.0, 80.0, 8.0)
`

async function main() {
  console.log('Applying schema...')
  for (const statement of schema.split(';').map(s => s.trim()).filter(Boolean)) {
    await client.execute(statement)
  }
  console.log('Schema applied.')

  console.log('Seeding goals...')
  await client.execute(goalsSeed)
  console.log('Goals seeded (placeholder values — confirm targets with Will before locking UI).')

  console.log('Done.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
