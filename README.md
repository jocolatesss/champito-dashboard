# Champito Coaching — Quick Glance Dashboard

5-second status view of every student with real tracker data, pulled live from
the "Dashboard" tab of the Champito Coaching Tracker sheet.

## How status is computed

Per student, the app finds their **most recently logged week** (not a fixed
calendar week — the sheet's own date headers are stale relative to today, so
"current" = last week they actually reported data) and grades it:

- **Habits %** — ≥100% green · 85–99% yellow · <85% red
- **Calorie adherence** (actual vs target) — within 10% green · within 20% yellow · beyond that red
- **Step adherence** — ≥90% of target green · ≥70% yellow · below that red
- Card color = the worst of the three
- **Gray / "No data"** = the student's tracker link is broken (`#REF!`) or empty — these are excluded by default via the "Hide no data" toggle, since they're not a real status, just a dead link
- **STALE tag** = their last logged week is 2+ weeks behind the most recent week anyone in the whole roster has logged (nobody is stale in the current snapshot — everyone with data is current through W15 — but this will start firing once check-ins drift)

This does **not** grade weight-trend (ROC) direction as good/bad, because the
sheet's "Goal" column is empty for almost everyone — no way to tell who's
cutting vs. bulking. ROC is shown as a raw number on each card so you can read
it yourself. If you fill in the Goal column going forward, that's a 10-minute
change to `lib/parseTracker.ts` to make ROC direction-aware.

## Setup

1. In Google Sheets: **File → Share → Publish to web** → select the
   **"Dashboard"** tab only → format **CSV** → Publish. Copy the link.
2. `cp .env.example .env.local` and paste that link as `SHEET_CSV_URL`.
3. `npm install`
4. `npm run dev` — check it locally at `http://localhost:3000`

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: **New Project** → import the repo.
3. Add the environment variable `SHEET_CSV_URL` (same value as your `.env.local`) in the Vercel project settings.
4. Deploy. Data refreshes every 5 minutes automatically (`revalidate = 300` in `app/page.tsx`) — edit the sheet, wait a few minutes, dashboard updates. No rebuild needed.

## Known data-quality issue, not a code issue

255 of 335 rows in the current sheet have no data at all (`#REF!` across
every week — dead links to deleted/moved individual trackers). That's a
sheet cleanup problem on your end, not something the dashboard can fix. The
"Hide no data" toggle is on by default so it doesn't clutter the view, but
worth cleaning up those rows or reconnecting the trackers.

## Files

- `lib/parseTracker.ts` — all the parsing + status logic, column indices are hard-coded to match the current sheet layout (documented inline). If you add/remove columns in the sheet, this is what breaks and what to fix.
- `app/page.tsx` — server component, fetches + parses the CSV
- `app/DashboardClient.tsx` — the interactive grid (search, filter by coach/status, hide no-data toggle)
- `scripts/test-parse.ts` — run with `npx tsx scripts/test-parse.ts <path-to-local-csv>` to sanity-check parsing against a downloaded CSV without needing to deploy anything
