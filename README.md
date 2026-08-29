# WORLD — Digital Real Estate Marketplace

Interactive global map platform where users purchase exclusive **digital ownership** of geographical listings (countries, states, cities). Not real-world property.

## Stack

- **Frontend / Host:** Next.js 15 on Vercel
- **Backend / DB / Auth:** Supabase (Postgres + Auth)
- **Map:** MapLibre GL JS + OpenFreeMap tiles
- **Repo:** GitHub

## Features

- Interactive world map with status-colored markers
- Location hierarchy (country → state → city)
- Primary purchase via server-side wallet ledger
- Marketplace browse & filters
- User dashboard, portfolio, preview credits
- Auth (email/password via Supabase)

## Environment

```env
NEXT_PUBLIC_SUPABASE_URL=https://yefgvlczpcvdofyfggmv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

## Local

```bash
npm install
cp .env.example .env.local
# fill keys
npm run dev
```

## Deploy

Connected to Vercel. Push to `main` triggers production deploy.
