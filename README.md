# ELVRA v2

ELVRA is a multilingual digital-card web app powered by Supabase Auth + PostgreSQL and deployable to Vercel.

## v2 changes
- Signup fields: username, email, password, confirm password. Username becomes the public card URL slug.
- Official ELVRA logo is used throughout the UI.
- Public card route `/p/:username` works with the Vercel SPA rewrite.
- Visits and clicks are recorded by a SECURITY DEFINER Supabase function; link clicks wait for the event to be recorded before navigating.
- Analytics reads the actual Supabase event rows.
- Avatar upload automatically derives the card accent color.
- Arabic, French and English remain available.
- Dark mode remains the default app appearance; mint `#00D084` is the primary brand color with black `#111111` and white `#FFFFFF` as secondary colors.

## Supabase
1. Open Supabase SQL Editor.
2. Run `supabase-schema.sql` completely. It is safe to re-run and contains the v2 migration.
3. In Supabase Auth URL settings, allow your Vercel deployment URL and the route `/update-password` as the password recovery redirect.

The client uses the public anon key and must not contain a service-role key.

## Vercel
Build command: `npm run build`
Output: Vite default `dist`
Framework: Vite

`vercel.json` rewrites all app routes to `index.html`, preventing 404s when a public card URL is opened or refreshed directly.
