-- ===========================================================================
-- Mirpur Help — Supabase setup
--
-- Run this ONCE in your Supabase project: Dashboard → SQL Editor → New query →
-- paste all of this → Run. It creates the two tables the app writes to:
--   • pending_events  — crowdsourced "বিনা মূল্যে" event submissions (moderated)
--   • needs           — donor ↔ need matching posts
--
-- Column names are quoted camelCase to exactly match the JSON the app sends
-- (PostgREST is case-sensitive). The server uses the service_role key, which
-- bypasses Row Level Security, so the app works while the public anon key stays
-- locked out of these tables (protecting submitter/contact phone numbers).
-- ===========================================================================

-- ---- Crowdsourced free events (moderation queue) ----
create table if not exists public.pending_events (
  id                 text primary key,
  "typeBn"           text,
  icon               text,
  "titleBn"          text,
  "organizerBn"      text,
  "descBn"           text,
  date               text,
  "startTime"        text,
  "endTime"          text,
  location           text,
  phone              text,
  "submittedByName"  text,
  "submittedByPhone" text,
  "submittedAt"      timestamptz default now(),
  status             text default 'pending',
  verified           boolean default false
);

-- ---- Donor ↔ need matching ----
create table if not exists public.needs (
  id            text primary key,
  "categoryId"  text,
  "categoryBn"  text,
  icon          text,
  "titleBn"     text,
  "descBn"      text,
  area          text,
  "contactName" text,
  "contactPhone" text,
  urgency       text default 'normal',
  status        text default 'open',
  "createdAt"   timestamptz default now(),
  verified      boolean default false
);

-- Helpful index for the donor feed (open needs, newest first).
create index if not exists needs_open_idx
  on public.needs (status, "createdAt" desc);

-- Lock both tables to the public anon key (service_role bypasses this).
alter table public.pending_events enable row level security;
alter table public.needs          enable row level security;

-- Done. Now copy your Project URL and service_role key into Vercel env vars:
--   SUPABASE_URL          = https://<your-project>.supabase.co
--   SUPABASE_SERVICE_KEY  = (Settings → API → service_role secret)
