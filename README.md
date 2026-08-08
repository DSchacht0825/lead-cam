# Lead CRM

A prospecting pipeline for a web design business: find local businesses that
have credibility (good Google rating, healthy review count) but no website,
score them automatically, and run them through a lightweight CRM.

## Pipeline

```
Google Places search  →  filter: no website  →  auto-score  →  save
     →  manual enrichment (Facebook/Instagram/owner-operated)
     →  Kanban pipeline  →  generate outreach line  →  CSV export
```

## Scoring

| Signal | Points |
|---|---|
| No website | +30 |
| 4.5★+ Google rating | +20 |
| 10-100 reviews | +15 |
| Phone available | +10 |
| Facebook page exists | +10 |
| Facebook active recently | +10 |
| Owner-operated / local | +5 |

Score ≥ 70 is flagged 🔥 hot. See `lib/scoring.ts`.

The first four signals are computed automatically from the Google Places
API response. The last three (Facebook/owner-operated) are **manual
toggles** on the lead detail page, not scraped — Facebook's Terms of
Service prohibit automated scraping of their site, so instead you get a
one-click "search Facebook for this business" link and paste the URL in
yourself. Takes about 10 seconds per lead.

## Setup

```bash
npm install
cp .env.example .env   # already done if you're reading this after the initial build
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000.

### Google Places API key (required for real data)

Without `GOOGLE_PLACES_API_KEY` set, `/search` returns a small canned demo
dataset (5 San Diego businesses) so you can try the app immediately.

To search real businesses:
1. Create/select a project at https://console.cloud.google.com
2. Enable the **Places API**
3. Create an API key under Credentials
4. Put it in `.env` as `GOOGLE_PLACES_API_KEY`

Note: each search does one Text Search call per category plus one Place
Details call per candidate result (to check for a website), so cost scales
with candidates returned, not just categories searched. Google's free
monthly credit covers a solid amount of prospecting.

### Optional: sharper outreach lines via Claude

Set `ANTHROPIC_API_KEY` in `.env` and the "Generate opening line" button on
a lead's page will call Claude for a more specific line instead of the
built-in template. Works fine without it.

## Using it

1. **Find Leads** (`/search`) — enter a location, comma-separated
   categories (e.g. `plumber, electrician, mobile detailing`), and
   rating/review thresholds. Hit "Find Leads". Results are deduplicated by
   Google's `place_id` and saved straight into the pipeline.
2. **Pipeline** (`/`) — Kanban board: New Leads → Contacted → Interested →
   Demo Built → Appointment → Proposal → Won → Follow-Up. Change a lead's
   stage from the dropdown on its card.
3. **Lead detail** (`/leads/[id]`) — contact info, score breakdown, the
   Facebook/Instagram/owner-operated toggles, a generated outreach opening
   line, and a running notes/activity log.
4. **Export CSV** (top nav) — `Business | Category | City | Phone |
   Facebook | Google rating | Reviews | Website? | Contacted? | Status`,
   sorted by score.

## Moving to Postgres/Supabase

This ships on SQLite for zero-config local use. To move to Supabase:

1. Create a Supabase project, grab the Postgres connection string
2. In `prisma/schema.prisma`, change `provider = "sqlite"` to
   `provider = "postgresql"` — SQLite has no native enum type, so `status`
   is stored as a plain string validated against `lib/status.ts`; feel
   free to reintroduce a real Prisma `enum` for it once on Postgres
3. Set `DATABASE_URL` in `.env` to the Supabase connection string
4. `npx prisma migrate dev`

## Known limitations (V1)

- Kanban stage changes are dropdown-based, not drag-and-drop.
- Facebook/Instagram enrichment is manual by design (see above).
- "Owner-operated" has no reliable automatic signal from the Places API, so
  it's a manual checkbox rather than a heuristic guess.
- `npm audit` flags two residual high-severity Next.js/PostCSS advisories
  in the 14.2.x line (Server Actions and CSS source-map handling) that
  don't apply to this app — it uses no Server Actions and processes no
  untrusted CSS. A future `next` major-version upgrade would clear these
  but wasn't done here since it changes route-handler param typing.
