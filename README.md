# Body Composition Copilot

Personal body recomposition PWA for Will Bohlmann. AINE bootcamp capstone.

**Live:** https://aine-capstone-body-composition-bohl.vercel.app

## Stack

Next.js 16 · Tailwind v4 · TypeScript · Turso (SQLite) · Anthropic API · Vercel Blob · Recharts

## Phases

| Phase | Feature | Status |
|---|---|---|
| 1 | Scaffold + auth + deploy | Done |
| 2 | Photo meal logging (Claude vision) | Done |
| 3 | InBody manual entry + PDF bulk import | Done |
| 4 | Today / Week / Month dashboards | Pending |
| 5 | Gap Analysis (Claude reasoning) | Pending |
| 6 | Conversational query sidebar | Pending |
| 7 | Whoop OAuth + sync | Pending |
| 8 | Gallery + PWA install | Pending |

## Dev

```bash
npm install
cp .env.local.example .env.local   # fill in credentials
npm run dev
```

## DB Setup

```bash
DATABASE_URL=... DATABASE_AUTH_TOKEN=... node scripts/setup-db.mjs
```
