# মিরপুর সাহায্য — Mirpur Help (Phase 1)

A **free, mobile-first Bangla web app** that helps poor and vulnerable people in
**Mirpur, Dhaka** find nearby free / low-cost help — food, medical care,
medicine, shelter, clothes, government allowances and education — plus one-tap
access to official emergency helplines. A **Telegram bot** is included so people
without a smartphone can be helped by a kind citizen.

> Phase 1 goal: prove that "the help already exists — people just can't find it."
> Everything runs on **free** infrastructure (OpenStreetMap, Vercel free tier,
> Telegram Bot API). No billing card required.

## What's inside

| Part | Tech | Purpose |
|------|------|---------|
| Web app | Next.js 14 (App Router) | Big-icon Bangla UI, map, helplines, voice read-aloud |
| Map | Leaflet + OpenStreetMap | Free maps & directions, no API key |
| Eligibility | `/eligibility` | Voice Bangla wizard → which govt allowances you qualify for |
| Free events | home + `/submit-event` | "বিনা মূল্যে" camps; volunteers/mosques can submit (moderated) |
| Bot | Telegram Bot API | Chat-based access for feature phones / helpers |
| Data | `data/services.json`, `data/events.json` | **Single source of truth** — web app AND bot read these |

Web routes: `/` (find help + events) · `/eligibility` (allowance wizard) ·
`/submit-event` (crowdsource a free event) · `/api/submit-event` (moderation queue).

**Deploying & admin/moderation:** see [DEPLOY.md](DEPLOY.md).
**Field verification:** run `npm run checklist` → produces `VERIFICATION_CHECKLIST.md`
and `verification_checklist.csv` listing every service & event to confirm on the ground.

## Run the web app

```powershell
npm install
npm run dev
# open http://localhost:3000
```

Build for production / deploy free on Vercel:

```powershell
npm run build
npm start
```

## Run the Telegram bot

```powershell
cd bot
npm install
# get a token from @BotFather on Telegram, then:
$env:TELEGRAM_TOKEN="123456:ABC-yourtoken"; npm start
```

Then message your bot `/start`.

## ⚠️ Data verification

Service names are real institutions in/near Mirpur, but **addresses, phone
numbers and hours are seed data marked "যাচাই হচ্ছে / being verified."** Confirm
each one (call + visit) before any public launch — we must never send a sick or
hungry person to a wrong place. Official helplines (999, 333, 109, 1098, 16263)
are verified.

## Roadmap

- **Phase 1 (this):** Find help map + helplines + Telegram bot for Mirpur.
- **Phase 2:** "Am I eligible?" wizard (old-age/widow/disability allowance,
  Family Card) in voice Bangla; shared dataset between web + bot.
- **Phase 3:** Helper mode + donor↔need matching (mosques, students, NGOs).
- **Phase 4:** Partnerships — a2i, 333 helpline, BRAC, local mosques.
