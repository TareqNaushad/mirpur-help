# Deploying Mirpur Help (free) + Admin guide

## A. Deploy the web app to Vercel — free, ~5 minutes

Next.js deploys to Vercel with **zero config**. Pick ONE method.

### Method 1 — GitHub (recommended, gives auto-deploys)
1. Create a free GitHub account and a new **empty** repository (e.g. `mirpur-help`).
2. Push this project:
   ```powershell
   cd C:\tareq_AI_RND\poorapp
   git init
   git add .
   git commit -m "Mirpur Help — Phase 1"
   git branch -M main
   git remote add origin https://github.com/<you>/mirpur-help.git
   git push -u origin main
   ```
3. Go to **vercel.com** → sign in with GitHub → **Add New… → Project** → import the repo → **Deploy**.
4. You get a live URL like `https://mirpur-help.vercel.app` — share it today. Every `git push` redeploys.

### Method 2 — Vercel CLI (no GitHub needed)
```powershell
cd C:\tareq_AI_RND\poorapp
npm i -g vercel
vercel login          # opens browser to log in to YOUR account
vercel --prod         # follow prompts; accept defaults
```

> I (Claude) cannot run the final deploy for you because it requires logging
> into **your** Vercel account in a browser. Everything else is ready — the
> build is verified passing.

### Optional — enable crowdsourcing in production
The "Add a free event" form works locally with no setup. To make submissions
persist in production, add a free Supabase backend (see section C), then in
**Vercel → Project → Settings → Environment Variables** add:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

Redeploy. Without these, the live form will report "no storage configured."

---

## B. Moderating crowdsourced events (admin flow)

Submissions never go live automatically — they wait in a queue for you to
verify (so nobody is sent to a fake/expired camp).

1. **See pending submissions**
   - Local dev: open `data/pending-events.json`.
   - Production (Supabase): Supabase dashboard → Table editor → `pending_events`.
2. **Verify** — call the organizer phone, confirm date/place are real.
3. **Approve** — copy the entry into `data/events.json` under `"events"`, set
   `"verified": true`, add `lat`/`lng` (look up on openstreetmap.org), and remove
   the moderation-only fields (`status`, `submittedBy*`, `submittedAt`).
4. Commit & push → the new event appears on the website **and** the Telegram bot
   automatically (they share the same file).
5. Delete the handled row from the pending queue.

---

## C. Free Supabase setup (only for production crowdsourcing)

1. Create a free project at **supabase.com**.
2. SQL editor → run:
   ```sql
   create table public.pending_events (
     id text primary key,
     "typeBn" text, icon text, "titleBn" text, "organizerBn" text,
     "descBn" text, date text, "startTime" text, "endTime" text,
     location text, phone text,
     "submittedByName" text, "submittedByPhone" text,
     "submittedAt" timestamptz, status text, verified boolean
   );
   -- The server uses the service_role key, which bypasses RLS. Keep RLS ON
   -- (default) so the public anon key cannot read submitter phone numbers.
   alter table public.pending_events enable row level security;
   ```
3. Settings → API → copy **Project URL** and **service_role** key into Vercel env
   vars (section A).

---

## D. Run the Telegram bot (free)
```powershell
cd C:\tareq_AI_RND\poorapp\bot
npm install
$env:TELEGRAM_TOKEN="<token from @BotFather>"; npm start
```
The bot reads the same `data/services.json` and `data/events.json` as the site,
so approving an event in section B updates the bot too. For 24/7 hosting, run the
bot on a free service like Railway or a small VPS (it needs a always-on process,
which Vercel serverless does not provide).
