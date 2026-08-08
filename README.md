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

Runs on Supabase Postgres (see `.env.example` for the connection strings,
sourced from Supabase's Connect → ORMs → Prisma panel).

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL / DIRECT_URL from Supabase
npx prisma generate
npm run dev
```

The `Lead` and `Activity` tables live in Supabase already (see
`supabase/schema.sql`). If you're pointing at a brand-new, empty Postgres
database instead, run `npx prisma migrate deploy` to create them.

Open http://localhost:3000.

### Google Places API key (required for real data)

Without `GOOGLE_PLACES_API_KEY` set, `/search` returns a small canned demo
dataset (5 San Diego businesses) so you can try the app immediately.

To search real businesses:
1. Create/select a project at https://console.cloud.google.com
2. Enable **Places API (New)** — not the legacy "Places API". The new API
   lets a single Text Search request return the `websiteUri` field
   directly, so `lib/googlePlaces.ts` needs no per-result Details call.
3. Create an API key under Credentials
4. Put it in `.env` as `GOOGLE_PLACES_API_KEY`

Each search/sweep combo (one category in one city) costs exactly one
Places API request, so cost is directly proportional to how often you
click "Get Leads" below — nothing runs on a schedule.

## Getting leads: the "Get Leads" button

Click **Get Leads** on the dashboard (`/`) to run the full
`DEFAULT_CATEGORIES` (15 home-service trades) × `DEFAULT_CITIES` (8
mid-size US metros, see `lib/discover.ts`) grid — 120 combos — in one
request. It uses bounded concurrency, so it finishes in a few seconds even
though it's 120 Places API calls. Each run is logged to the
`DiscoveryRun` table and shown as a banner on the dashboard ("Last sweep:
... — 36 new, 9 updated, 40 🔥 hot").

The `/search` page still exists for a narrower, one-off search (a specific
city/category/rating threshold) rather than the full default grid.

**On hitting "50 leads/click":** the first sweep over fresh
categories/cities finds the most (36-45 in local testing across 120
combos). Volume will taper on repeat clicks as `place_id` dedup skips
already-discovered businesses in the same category/city — sustaining a
high per-click rate long-term means periodically expanding
`DEFAULT_CATEGORIES`/`DEFAULT_CITIES` in `lib/discover.ts` as the current
list gets mined out.

There's also an `/api/cron/discover` endpoint (secret-protected via
`CRON_SECRET`, same sweep logic) left in place in case you want to
re-enable scheduled runs later via Vercel Cron — it's just not wired up to
anything automatic right now.

### Optional: sharper outreach lines via Claude

Set `ANTHROPIC_API_KEY` in `.env` and the "Generate opening line" button on
a lead's page will call Claude for a more specific line instead of the
built-in template. Works fine without it.

## Using it

1. **Get Leads** (`/`, top right) — one click runs the full default sweep
   (see above) and drops new/updated leads straight into the pipeline.
2. **Find Leads** (`/search`) — for a narrower search: a specific location,
   comma-separated categories, and rating/review thresholds. Results are
   deduplicated by Google's `place_id` same as the sweep.
3. **Pipeline** (`/`) — Kanban board: New Leads → Contacted → Interested →
   Demo Built → Appointment → Proposal → Won → Follow-Up. Change a lead's
   stage from the dropdown on its card.
4. **Lead detail** (`/leads/[id]`) — contact info, score breakdown, the
   Facebook/Instagram/owner-operated toggles, a generated outreach opening
   line, and a running notes/activity log.
5. **Export CSV** (top nav) — `Business | Category | City | Phone |
   Facebook | Google rating | Reviews | Website? | Contacted? | Status`,
   sorted by score.

## Deploying to Vercel

The Supabase side is already set up (tables created from `supabase/schema.sql`,
migration history baselined). To deploy:

1. Import the `lead-cam` GitHub repo into Vercel.
2. Set env vars in the Vercel project: `DATABASE_URL`, `DIRECT_URL`,
   `GOOGLE_PLACES_API_KEY`, `CRON_SECRET`, and optionally
   `ANTHROPIC_API_KEY` — same values as your local `.env`.
3. Deploy. No build-step changes needed (`prisma generate` runs as part of
   `npm install` via Prisma's postinstall hook).
4. **Before sharing the URL with anyone**: there's no auth on this app yet.
   Add a password gate first (see "Known limitations" below) since the
   live URL would otherwise let anyone view your leads and trigger paid
   Google Places API calls.

`status` is stored as a plain string validated against `lib/status.ts`
rather than a Postgres enum, so it stays consistent with how the tables
were originally created.

## Known limitations (V1)

- **No auth.** Anyone with the deployed URL can view/edit leads and trigger
  billed Google Places calls. Add a password gate before this is public.
- Kanban stage changes are dropdown-based, not drag-and-drop.
- Facebook/Instagram enrichment is manual by design (see above).
- "Owner-operated" has no reliable automatic signal from the Places API, so
  it's a manual checkbox rather than a heuristic guess.
- `npm audit` flags two residual high-severity Next.js/PostCSS advisories
  in the 14.2.x line (Server Actions and CSS source-map handling) that
  don't apply to this app — it uses no Server Actions and processes no
  untrusted CSS. A future `next` major-version upgrade would clear these
  but wasn't done here since it changes route-handler param typing.
