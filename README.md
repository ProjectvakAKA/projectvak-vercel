## PropertyDocs MVP

Admin-only portal for configuring Dropbox sync, EPC parsing, and Whise write-back.
Day-to-day workflows stay inside Whise/email.

## Getting Started

1) Install dependencies:
```bash
npm install
```

2) Configure environment variables:
```bash
cp config/env.example .env.local
```

3) Run the dev server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase schema

Apply the SQL in `supabase/schema.sql` to set up orgs and org members with RLS.

## Notes
- `config/env.example` contains required env keys.
- The app uses Supabase Auth and org-scoped access.
