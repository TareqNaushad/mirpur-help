# 📞 Mirpur Help — Phone line (IVR) prototype

Lets a person with **any phone (even a basic keypad phone, no internet)** call a
number, **speak their need in Bangla**, and **hear the answer spoken back** —
powered by the same AI brain as the website.

## How it works
```
Caller dials the number
   → Twilio calls our webhook  /api/ivr/voice
   → we greet in Bangla (audio from /api/tts) and listen for speech
   → Twilio transcribes the Bangla speech and POSTs it to /api/ivr/handle
   → lib/understand.js (Gemini) figures out the need / answers the question
   → we speak the Bangla answer back (/api/tts) and listen again
```
No app, no internet, no literacy required on the caller's side.

## Set up a test number (Twilio — ~10 min)
1. Create a free trial account at **twilio.com** (gives trial credit).
2. **Phone Numbers → Buy a number** with **Voice** capability.
   - Note: cheap local Bangladesh numbers are limited on Twilio; for a quick
     test any Voice number works (you call it to try). For real BD deployment
     use a local provider / aggregator (see below).
3. On that number's config, under **Voice → A call comes in**, choose **Webhook**,
   set it to:
   ```
   https://mirpur-help.vercel.app/api/ivr/voice
   ```
   method **HTTP POST**. Save.
4. **Call the number** and speak in Bangla: *"আমার খাবার দরকার"* or
   *"আঞ্জুমান মুফিদুল ইসলামের ঠিকানা দেন"*. You'll hear the answer in Bangla.

> Requires `GEMINI_API_KEY` set in Vercel (already done) so it can understand
> and answer. Without it, the line falls back to "call 333".

## Making it free for the poor (production)
- **Missed-call / call-back model**: the user gives a *missed call* (free to
  them); the system calls them back and runs this same flow. Common in South
  Asia. Set up via the telephony provider's API.
- **Toll-free number**: the service pays for the call so the caller doesn't.
- **Local aggregator / short code**: for scale + low cost in Bangladesh, go
  through a BTRC-licensed VAS provider (InterVAS, Synesis IT, SSD-Tech,
  iSolutions) or partner with **a2i / 333**. They can host the IVR on a local
  short code and connect it to these same webhooks.

## Files
- `app/api/ivr/voice/route.js` — call entry (greet + listen)
- `app/api/ivr/handle/route.js` — handle speech → answer → listen again
- `lib/twiml.js` — TwiML + Bangla `<Play>` helpers (uses /api/tts)
- `lib/understand.js` — shared Gemini brain (also powers web /api/voice)

## Notes / limits of the prototype
- Twilio speech recognition uses `bn-IN` (Bengali). Quality is decent but not
  perfect; a local provider may offer better Bangla STT, or we can switch to
  `<Record>` + send audio to Gemini (same as the web app) for tougher accents.
- This is a **prototype** to demonstrate feasibility. Real launch needs a phone
  number/short code and (ideally) an a2i or operator partnership for cost + reach.
