// ---------------------------------------------------------------------------
// /api/needs  — donor ↔ need matching (Phase 3)
//
//   GET  → list OPEN needs (newest first), for the donor feed at /needs
//   POST → create a new need from /post-need
//
// Storage (same graceful pattern as events):
//   • Production: Supabase table `needs` (SUPABASE_URL + SUPABASE_SERVICE_KEY).
//   • Local dev:  seed needs from data/needs.json + appended posts in
//     data/needs-local.json (gitignored). On Vercel WITHOUT Supabase, GET still
//     shows the seed examples but new posts won't persist (use Supabase for
//     real matching).
//
// Optional: if TELEGRAM_TOKEN and TELEGRAM_DONOR_CHAT are set, every new need is
// broadcast to a Telegram donor channel/group for free — donors get pinged
// instantly.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import seed from "../../../data/needs.json";

export const dynamic = "force-dynamic";

const CATS = Object.fromEntries(seed.categories.map((c) => [c.id, c]));
const localFile = () => path.join(process.cwd(), "data", "needs-local.json");

function clean(v, max = 400) {
  return String(v ?? "").trim().slice(0, max);
}

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

async function supabase(pathPart, init) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/${pathPart}`;
  return fetch(url, {
    ...init,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init && init.headers),
    },
  });
}

async function readLocal() {
  try {
    return JSON.parse(await fs.readFile(localFile(), "utf8")).needs || [];
  } catch {
    return [];
  }
}

// Fire-and-forget Telegram broadcast to a donor channel (optional).
async function notifyDonors(n) {
  const token = process.env.TELEGRAM_TOKEN;
  const chat = process.env.TELEGRAM_DONOR_CHAT;
  if (!token || !chat) return;
  const text =
    `🆘 *নতুন সাহায্যের অনুরোধ*\n\n` +
    `${n.icon} *${n.titleBn}*\n` +
    `${n.descBn}\n` +
    `📍 ${n.area}\n` +
    `📞 ${n.contactName || ""} ${n.contactPhone}\n` +
    (n.urgency === "urgent" ? `⚠️ জরুরি!` : "");
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: "Markdown" }),
    });
  } catch {
    /* never block the user on a notification failure */
  }
}

// ---- GET: list open needs ----
export async function GET() {
  if (hasSupabase()) {
    try {
      const r = await supabase(
        "needs?status=eq.open&order=createdAt.desc&limit=100",
        { method: "GET" }
      );
      if (r.ok) {
        const rows = await r.json();
        return NextResponse.json({ ok: true, needs: rows, source: "supabase" });
      }
    } catch {
      /* fall through to seed */
    }
  }
  const local = await readLocal();
  const all = [...local, ...seed.needs].filter((n) => n.status === "open");
  all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return NextResponse.json({ ok: true, needs: all, source: "local" });
}

// ---- POST: create a need ----
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const required = ["categoryId", "titleBn", "area", "contactPhone"];
  for (const f of required) {
    if (!clean(body[f])) {
      return NextResponse.json(
        { ok: false, error: `অনুগ্রহ করে প্রয়োজনীয় তথ্য পূরণ করুন।` },
        { status: 400 }
      );
    }
  }

  const cat = CATS[clean(body.categoryId, 30)] || CATS.other;
  const record = {
    id: `need-${Date.now()}`,
    categoryId: cat.id,
    categoryBn: cat.bn,
    icon: cat.icon,
    titleBn: clean(body.titleBn, 140),
    descBn: clean(body.descBn, 500),
    area: clean(body.area, 200),
    contactName: clean(body.contactName, 80),
    contactPhone: clean(body.contactPhone, 30),
    urgency: body.urgency === "urgent" ? "urgent" : "normal",
    status: "open",
    createdAt: new Date().toISOString(),
    verified: false,
  };

  if (hasSupabase()) {
    try {
      const r = await supabase("needs", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(record),
      });
      if (!r.ok) {
        const detail = await r.text();
        return NextResponse.json(
          { ok: false, error: "সংরক্ষণ ব্যর্থ হয়েছে।", detail },
          { status: 502 }
        );
      }
      await notifyDonors(record);
      return NextResponse.json({ ok: true, mode: "supabase" });
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: "সার্ভারে সমস্যা।", detail: String(e) },
        { status: 502 }
      );
    }
  }

  // Local dev fallback.
  try {
    let json = { needs: [] };
    try {
      json = JSON.parse(await fs.readFile(localFile(), "utf8"));
    } catch {
      /* not created yet */
    }
    json.needs.unshift(record);
    await fs.writeFile(localFile(), JSON.stringify(json, null, 2), "utf8");
    await notifyDonors(record);
    return NextResponse.json({ ok: true, mode: "local" });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "প্রকাশনার জন্য স্টোরেজ নেই। প্রোডাকশনে SUPABASE_URL ও SUPABASE_SERVICE_KEY সেট করুন।",
        detail: String(e),
      },
      { status: 500 }
    );
  }
}
