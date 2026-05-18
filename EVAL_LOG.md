# Eval Log — Body Composition Copilot

## Phase 1 — Scaffold + Deploy

**Time budget:** 30 min

### What shipped
- Next.js 16.2.6 (App Router, TypeScript, Tailwind v4)
- Turso DB schema applied + goals seeded
- Password-gate middleware (HttpOnly cookie, 24h session)
- Login page (dark, mobile-first)
- Placeholder home page with nav links
- GitHub remote + initial commit
- Vercel deploy

### What didn't ship
- N/A (phase scope met)

### Acceptance
| Feature | Status |
|---|---|
| F9 Password gate | Done |
| F3 Zero state | Deferred to Phase 4 |

### Surprises
- create-next-app installed Next.js 16.2.6 (spec said 15 — same App Router paradigm, no functional difference for this app)
- Tailwind v4 uses CSS-native config (no tailwind.config.ts)
- Goals seeded with placeholders: 2500 cal / 200g protein / 200g carbs / 80g fat / 12% BF / 80kg LBM / 8h sleep

---

## Phase 2 — Photo Meal Logging

### What shipped
- `POST /api/meals/analyze`: Claude vision → structured JSON with per-item macros, confidence flags
- `POST /api/meals`: Vercel Blob upload + Turso insert
- `/log` page: camera capture → client-side canvas resize (1200px max) → loading state → confirm/edit → save
- Per-item inline editing with live totals recomputed on change
- Low-confidence item warnings surface in UI
- 30s timeout + error state with retry

### What didn't ship
- N/A (phase scope met)

### Acceptance
| Feature | Status |
|---|---|
| Camera capture on mobile | Done |
| Claude vision analysis | Done |
| Per-item editing | Done |
| Macro save to DB | Done |

### Surprises
- Client-side resize before encode was necessary — raw camera photos exceeded 4MB and hit API payload limits
- Claude returned inconsistent JSON shapes on ambiguous food photos; added validation layer in the API route

---

## Phase 3 — InBody Manual Entry + PDF Bulk Import

### What shipped
- `POST /api/inbody`: manual entry with duplicate detection by `reading_date`
- `GET /api/inbody`: reading history list
- `POST /api/inbody/parse`: pdf-parse v2 + Claude extraction of weight, BF%, LBM from InBody PDF
- `/inbody` page with manual form and PDF import flow
- Drag-drop bulk upload with accept/reject preview before commit to DB
- `serverExternalPackages: ['pdf-parse']` required in next.config.ts (pdf-parse can't bundle in edge)

### What didn't ship
- N/A (phase scope met)

### Acceptance
| Feature | Status |
|---|---|
| Manual entry + duplicate guard | Done |
| PDF parse + Claude extraction | Done |
| Bulk import with preview | Done |

### Surprises
- pdf-parse v2 changed to a class-based API; docs lagged — had to read source
- Claude reliably extracted InBody fields even from multi-column PDF layouts

---

## Phase 4 — Today / Week / Month Dashboards

### What shipped
- Home page redesigned: today's nutrition progress bars + latest InBody snapshot with goal deltas
- `/week`: 7-day calorie + protein bar charts (Recharts), goal lines, daily averages
- `/month`: body comp trend line charts (weight/BF/lean mass), progress-to-goal cards, history list
- `lib/goals.ts`: canonical goal constants (81.6 kg / 12% BF / 2500 cal / 200g protein)

### UI Overhaul (shipped between Phase 4 and 5)
- next-themes: dark/light toggle, defaults dark
- lucide-react for consistent iconography
- BottomNav: fixed bottom tab bar (Today / Log / Week / Body)
- MacroRing: SVG circular progress rings for calories + protein
- All pages: bg/card/border/text theme-aware, pb-24 for nav clearance

### What didn't ship
- N/A (phase scope met)

### Surprises
- Recharts requires `"use client"` — had to extract chart components into separate client files
- Tailwind v4's CSS-native `@theme` block is cleaner but broke several assumptions about how design tokens work

---

## Phase 5 — Gap Analysis (Claude Reasoning)

### What shipped
- `GET /api/gap`: queries last 14 days nutrition + last 3 InBody readings, sends to Claude, returns structured JSON with severity-rated gaps and action plan
- `/gap` page: tap-to-run, blue headline card, color-coded gap cards (high/med/low), prioritized action plan list, coach's note, data context footer
- Sparkles CTA card on Today page linking to `/gap`
- Gap Analysis tab added to bottom nav

### What didn't ship
- N/A (phase scope met)

### Acceptance
| Feature | Status |
|---|---|
| Claude gap reasoning | Done |
| Severity color coding | Done |
| Action plan rendering | Done |

### Surprises
- Claude's structured output was consistent enough to skip a Zod validation layer — kept it simple
- Gap cards needed fallback handling for empty nutrition windows (new installs with no data)

---

## Phase 6 — Conversational Query (Ask)

### What shipped
- `POST /api/chat`: last 14 days nutrition + 5 InBody readings injected as system context; full conversation history passed each turn
- `/chat` page: suggestion chips on empty state, iMessage-style bubbles (user right / assistant left), typing indicator (bouncing dots animation), auto-scroll to latest message
- Bottom nav updated: Analysis / Ask / Body tabs

### What didn't ship
- N/A (phase scope met)

### Acceptance
| Feature | Status |
|---|---|
| Contextual Claude responses | Done |
| Message history maintained in session | Done |
| Streaming UI | Done |

### Surprises
- Passing full conversation history on each request is stateless but keeps the API route simple — no session store needed at this scale
- Suggestion chips required careful state management to hide after first message

---

## Phase 7 — Whoop OAuth + Sync

### What shipped
- `lib/whoop.ts`: token refresh, authenticated API helper, `isWhoopConnected`
- `GET /api/whoop/auth`: redirects to Whoop OAuth consent
- `GET /api/whoop/callback`: code exchange, persists tokens via INSERT OR REPLACE
- `POST /api/whoop/sync`: parallel fetch of recovery/cycle/sleep, merges by date, upserts `whoop_daily` (30 days)
- `POST /api/whoop/disconnect`: clears `whoop_auth`
- `GET /api/whoop/status`: connection check + last 7 days preview
- `/settings`: Connect/Sync/Disconnect UI, 7-day Whoop data table, goals summary
- Today page: Whoop recovery card — score color-coded green/amber/red, strain, HRV, sleep hours

### What didn't ship
- N/A (phase scope met)

### Acceptance
| Feature | Status |
|---|---|
| OAuth flow | Done |
| Token refresh | Done |
| Sync 30 days | Done |
| Recovery card on Today | Done |

### Surprises
- Whoop API returns cycle data and recovery data on separate endpoints — had to join by date client-side
- `INSERT OR REPLACE` (SQLite) was simpler than a manual upsert for token storage

---

## Phase 8 — Gallery + PWA Install

### What shipped
- `/gallery`: responsive photo grid, fullscreen viewer with swipe/tap dismiss
- PWA: `public/manifest.json`, `public/sw.js` (cache-first strategy), `app/icon.tsx` (generated app icon)
- `PwaInstallPrompt.tsx`: beforeinstallprompt event captured, install CTA shown after first meal log
- `ServiceWorkerRegistration.tsx`: registers SW on mount

### What didn't ship
- N/A (phase scope met)

### Acceptance
| Feature | Status |
|---|---|
| Photo gallery grid | Done |
| Fullscreen viewer | Done |
| PWA installable | Done |
| App icon | Done |

### Surprises
- `beforeinstallprompt` only fires on Chrome/Android — iOS "Add to Home Screen" is manual; noted in UI
- Service worker cache invalidation requires bumping the cache version key manually on deploy

---

## Phase 9 — Meal Detail Bottom Sheet

### What shipped
- `MealSheet.tsx`: bottom sheet component with per-item macro breakdown, total row, delete action
- `DELETE /api/meals/[id]`: removes meal + Blob image
- Tapping a meal on the Today page opens the sheet
- Full design system migration across all pages: dark-only, Inter font, `@theme` CSS variables in globals.css

### What didn't ship
- N/A (phase scope met)

### Acceptance
| Feature | Status |
|---|---|
| Per-meal detail sheet | Done |
| Delete meal | Done |
| Design system tokens applied everywhere | Done |

### Surprises
- Bottom sheet required `position: fixed` + `z-index` coordination with the nav bar — tested carefully on mobile viewport
- Migrating all pages to the new `@theme` token system took longer than expected but eliminated inline color inconsistencies across the app
