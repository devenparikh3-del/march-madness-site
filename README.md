# Sustainability March Madness HQ

Next.js app for running sustainability men's and women's March Madness coworker pools with:

- public `/mens` and `/womens` pages
- a password-protected `/admin` area
- Supabase-backed bracket/settings persistence
- Google Sheet-powered leaderboard syncing

## Setup

1. Install dependencies with the local Node runtime in `.tooling/node`.
2. Copy `.env.example` to `.env.local` and fill in the values.
3. Run the SQL in `supabase/schema.sql`.
4. Start the app with `npm run dev`.

## Google Sheet Contract

Each competition should point to a published Google Sheet CSV with these columns:

- `A`: nickname
- `B`: current points
- `C`: potential points
- `D`: paid (`yes` / `no`)
- `E`: ESPN bracket URL
- `F`: sustainability team code (`SO`, `RA`, or `CPI`)

Only rows marked paid are shown publicly.
