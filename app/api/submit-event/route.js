// ---------------------------------------------------------------------------
// POST /api/submit-event
//
// Receives a crowdsourced "বিনা মূল্যে" event from a volunteer / mosque / NGO
// and stores it in a MODERATION QUEUE. Nothing goes live automatically — an
// admin reviews pending items and copies approved ones into data/events.json.
//
// Storage:
//   • Production: Supabase table `pending_events` (set SUPABASE_URL +
//     SUPABASE_SERVICE_KEY env vars). Uses the REST API — no extra dependency.
//   • Local dev:  appends to data/pending-events.json so you can test instantly
//     with no account.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Pick an icon from the event type so cards look consistent.
const TYPE_ICONS = {
  "স্বাস্থ্য শিবির": "🏥",
  "খাদ্য বিতরণ": "🍚",
  "টিকাকরণ শিবির": "💉",
  "কাপড় বিতরণ": "👕",
  "দক্ষতা প্রশিক্ষণ": "🎓",
  "চোখ পরীক্ষা": "👁️",
  "অন্যান্য": "🎪",
};

function clean(v, max = 300) {
  return String(v ?? "").trim().slice(0, max);
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Required fields.
  const required = ["typeBn", "titleBn", "organizerBn", "date", "location"];
  for (const f of required) {
    if (!clean(body[f])) {
      return NextResponse.json(
        { ok: false, error: `অনুগ্রহ করে "${f}" পূরণ করুন।` },
        { status: 400 }
      );
    }
  }

  const record = {
    id: `pending-${Date.now()}`,
    typeBn: clean(body.typeBn, 60),
    icon: TYPE_ICONS[clean(body.typeBn, 60)] || "🎪",
    titleBn: clean(body.titleBn, 140),
    organizerBn: clean(body.organizerBn, 140),
    descBn: clean(body.descBn, 500),
    date: clean(body.date, 20),
    startTime: clean(body.startTime, 10),
    endTime: clean(body.endTime, 10),
    location: clean(body.location, 200),
    phone: clean(body.phone, 30),
    submittedByName: clean(body.submittedByName, 80),
    submittedByPhone: clean(body.submittedByPhone, 30),
    submittedAt: new Date().toISOString(),
    status: "pending",
    verified: false,
  };

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;

  // --- Production: Supabase via REST ---
  if (SUPA_URL && SUPA_KEY) {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/pending_events`, {
        method: "POST",
        headers: {
          apikey: SUPA_KEY,
          Authorization: `Bearer ${SUPA_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(record),
      });
      if (!r.ok) {
        const detail = await r.text();
        return NextResponse.json(
          { ok: false, error: "সংরক্ষণ ব্যর্থ হয়েছে।", detail },
          { status: 502 }
        );
      }
      return NextResponse.json({ ok: true, mode: "supabase" });
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: "সার্ভারে সমস্যা।", detail: String(e) },
        { status: 502 }
      );
    }
  }

  // --- Local dev fallback: append to a JSON file ---
  try {
    const file = path.join(process.cwd(), "data", "pending-events.json");
    let json = { events: [] };
    try {
      json = JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
      /* file may not exist yet */
    }
    json.events.push(record);
    await fs.writeFile(file, JSON.stringify(json, null, 2), "utf8");
    return NextResponse.json({ ok: true, mode: "local" });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "কোনো স্টোরেজ কনফিগার করা নেই। SUPABASE_URL ও SUPABASE_SERVICE_KEY সেট করুন।",
        detail: String(e),
      },
      { status: 500 }
    );
  }
}
