# ELVRA — Digital Card Builder

A Vercel-ready React/Vite digital-card platform with Supabase Auth, real event analytics, QR downloads, multilingual UI, light/dark mode and automatic accent-color extraction from a profile image.

## 1. Supabase setup

Open Supabase → SQL Editor and run `supabase-schema.sql` once.

The app does **not** require a Storage bucket: avatar and cover images are compressed in the browser and stored as image data in the profile record. This keeps setup simple for a first deployment.

## 2. Environment variables (recommended)

Create these in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The provided Supabase project values are also included as safe client-side fallbacks in `src/lib/supabase.js`, so the build can run without an env file. Vercel variables are preferred for easier project switching.

## 3. Vercel

Import the GitHub repository into Vercel and use the default Vite settings:

- Build command: `npm run build`
- Output directory: `dist`

`vercel.json` includes the SPA rewrite needed so `/p/<username>` and other routes do not return 404 after refresh.

## 4. GitHub extract workflow

`.github/workflows/extract.yml` extracts the ZIP from the repository and commits the extracted files. It accepts an optional manual `zip_name` input, so you can change the ZIP filename without rewriting the workflow.

Default ZIP: `ELVRA-v1-stable.zip`.

## 5. Analytics behavior

Each public card page load calls the database function `record_profile_event(..., 'visit')`. Each public link click records a `click` event linked to that destination. Dashboard counters are computed from those events, so they are not hard-coded demo values.

For anti-spam / unique-visitor analytics, add an edge/server-side event collector later. This version focuses on correct, persistent event counts without requiring a paid analytics provider.
