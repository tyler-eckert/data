# eckert.data

A simple personal tracker for anything with a number (or just "it happened"), at **data.eckerthaus.com**.
Static site on GitHub Pages and Supabase for auth and storage. No build step. It uses the same design tokens as finance.eckerthaus.com.

- **Data entry**: pick a metric, enter a value, and save. The timestamp fills in with *now* and keeps itself current until you edit it. Notes are optional. If you leave the value blank, the entry counts as one occurrence, which suits things like "mowed the lawn". The tab also has the Metrics list (create, edit, archive, reorder) and the Recent entries table (edit, delete with undo, CSV export).
- **Overview**: KPI tiles and one card per metric. Every card lets you change these on the fly:
  - **Chart type**: line, area, bars, step, scatter, running total, calendar heatmap, distribution (histogram), big number
  - **Group by**: each entry, day, week, month
  - **Math**: average, total, min, max, last, count
  - **Width**: half or full, or hide the card

  The choices save to the metric, so they follow you to every device. A range filter (7D / 30D / 90D / 1Y / All) and a category filter apply to the whole page.

Try it without signing in: open `/?demo`, which runs on seeded sample data held in memory.

## Setup

1. **Database**: in the Supabase SQL editor, run `sql/schema.sql`.
   Then go to **Project Settings → API → Exposed schemas**, add `tracker`, and save.
2. **Login**: under Supabase **Authentication → Users**, use your existing user (if this is the finance project) or add one.
   Recommended: turn off public sign-ups (**Authentication → Sign In / Providers → Allow new users to sign up**).
3. **Config**: `js/config.js` holds the project URL and the *publishable* key. It points at the finance project by default. Change it if you use a separate project.
4. **Repo and Pages**:
   ```bash
   cd ~/GitHub/data            # or wherever you keep it
   git init && git add . && git commit -m "eckert.data v1"
   gh repo create data --public --source . --push
   ```
   In GitHub **Settings → Pages**, set Source to *Deploy from a branch* with `main` / root. The `CNAME` file already says `data.eckerthaus.com`.
5. **DNS**: at your DNS host, add a `CNAME` record that points `data` to `<your-github-username>.github.io`. Once the certificate is issued, tick **Enforce HTTPS**.
6. **Supabase URL config**: under **Authentication → URL Configuration**, add `https://data.eckerthaus.com` to the Redirect URLs.

## Files

```
index.html          shell (sidebar, tabs, mobile tab bar, sign-in)
css/app.css         eckert design tokens + components, light/dark
js/config.js        Supabase URL + publishable key + schema
js/db.js            data layer (Supabase, or demo store with ?demo)
js/charts.js        dependency-free SVG charts
js/app.js           app logic
sql/schema.sql      tracker.metrics + tracker.entries with RLS
```

## Data model

- `tracker.metrics`: name, unit, category, color, decimals, `chart` (jsonb card settings), sort_order, archived
- `tracker.entries`: metric_id, ts, value (nullable), notes

Every row carries `user_id`, which defaults to `auth.uid()`, and is locked to its owner by row-level security.
