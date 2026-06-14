"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  CATEGORIES,
  HELPLINES,
  servicesByCategory,
} from "../data/services";
import { upcomingEvents } from "../data/events";

// Leaflet must not render on the server.
const MapView = dynamic(() => import("../components/MapView"), {
  ssr: false,
  loading: () => <div className="empty">মানচিত্র লোড হচ্ছে…</div>,
});

// Read a service aloud in Bangla (works on phones that support TTS).
function speak(service) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const text = `${service.nameBn}। ${service.descBn} অবস্থান: ${service.area}।`;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "bn-BD";
  u.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function directionsUrl(s) {
  // OpenStreetMap directions to the point (free, no API key).
  return `https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=17/${s.lat}/${s.lng}`;
}

export default function Home() {
  const [cat, setCat] = useState(null); // selected category object
  const [view, setView] = useState("list"); // "list" | "map"

  const services = useMemo(
    () => (cat ? servicesByCategory(cat.id) : []),
    [cat]
  );

  return (
    <main className="app">
      <header className="header">
        <h1>🤝 মিরপুর সাহায্য</h1>
        <p>
          আপনার কাছে বিনামূল্যে খাবার, চিকিৎসা, আশ্রয় ও সরকারি সহায়তা খুঁজুন
          <br />
          <span style={{ opacity: 0.85, fontSize: 12 }}>
            Find free help near you — Mirpur, Dhaka
          </span>
        </p>
      </header>

      {/* Emergency quick-dial — always visible */}
      <div className="emergency" aria-label="Emergency helplines">
        {HELPLINES.map((h) => (
          <a className="dial" key={h.number} href={`tel:${h.number}`}>
            <span className="num">{h.number}</span>
            <span className="lbl">{h.bn}</span>
          </a>
        ))}
      </div>

      {!cat && (
        <>
          <Link href="/eligibility" className="wizard-cta">
            <span className="wizard-ic">📋</span>
            <span className="wizard-txt">
              <strong>আমি কি যোগ্য?</strong>
              <small>সরকারি ভাতা পেতে পারেন কিনা দেখুন — Am I eligible?</small>
            </span>
            <span className="wizard-go">→</span>
          </Link>

          <div className="help-pair">
            <Link href="/post-need" className="help-btn need">
              <span className="hb-ic">🙏</span>
              <strong>সাহায্য চাই</strong>
              <small>Ask for help</small>
            </Link>
            <Link href="/needs" className="help-btn give">
              <span className="hb-ic">❤️</span>
              <strong>সাহায্য করুন</strong>
              <small>Help someone</small>
            </Link>
          </div>

          {upcomingEvents().length > 0 && (
            <>
              <div className="section-title">
                <h2>বিনা মূল্যে সেবা ও শিবির</h2>
                <span className="sub">Free camps & events</span>
              </div>
              <div className="events-scroll">
                {upcomingEvents()
                  .slice(0, 3)
                  .map((e) => (
                    <div key={e.id} className="event-card">
                      <div className="event-date">
                        {new Date(e.date).toLocaleDateString("bn-BD", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="event-ic">{e.icon}</div>
                      <div className="event-type">{e.typeBn}</div>
                      <div className="event-title">{e.titleBn}</div>
                      <div className="event-org">{e.organizerBn}</div>
                      <div className="event-actions">
                        <a className="btn call" href={`tel:${e.phone}`}>
                          📞
                        </a>
                        <a
                          className="btn dir"
                          href={`https://www.openstreetmap.org/?mlat=${e.lat}&mlon=${e.lng}#map=17/${e.lat}/${e.lng}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          📍
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}

          <Link href="/submit-event" className="add-event-link">
            ➕ বিনা মূল্যে সেবার তথ্য জানান — Add a free event
          </Link>

          <div className="section-title">
            <h2>কী সাহায্য দরকার?</h2>
            <span className="sub">What do you need?</span>
          </div>
          <div className="grid">
            {CATEGORIES.map((c) => (
              <button
                className="cat"
                key={c.id}
                onClick={() => {
                  setCat(c);
                  setView("list");
                }}
                style={{ borderTop: `4px solid ${c.color}` }}
              >
                <span className="ic">{c.icon}</span>
                <span className="bn">{c.bn}</span>
                <span className="en">{c.en}</span>
              </button>
            ))}
          </div>

          <div className="note">
            ⚠️ এই অ্যাপের ঠিকানা ও তথ্য যাচাই করা হচ্ছে। যাওয়ার আগে ফোন করে
            নিশ্চিত হোন। জরুরি প্রয়োজনে উপরের নম্বরে কল করুন।
            <br />
            <em>
              Locations are being verified — please call before visiting. Use the
              numbers above in an emergency.
            </em>
          </div>
        </>
      )}

      {cat && (
        <>
          <div className="toolbar">
            <button className="back" onClick={() => setCat(null)}>
              ← পেছনে
            </button>
            <strong>
              {cat.icon} {cat.bn}
            </strong>
            <div className="toggle">
              <button
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
              >
                তালিকা
              </button>
              <button
                className={view === "map" ? "active" : ""}
                onClick={() => setView("map")}
              >
                মানচিত্র
              </button>
            </div>
          </div>

          {services.length === 0 && (
            <div className="empty">
              এই বিভাগে এখনো তথ্য যোগ করা হয়নি। শীঘ্রই আসছে।
            </div>
          )}

          {view === "map" && services.length > 0 && (
            <div className="map-wrap">
              <MapView services={services} />
            </div>
          )}

          {view === "list" && (
            <div className="list">
              {services.map((s) => (
                <article className="svc" key={s.id}>
                  <h3>
                    {s.nameBn}
                    {!s.verified && (
                      <span className="badge unverified">যাচাই হচ্ছে</span>
                    )}
                  </h3>
                  <div className="en-name">{s.nameEn}</div>
                  <p className="desc">{s.descBn}</p>
                  <div className="meta">
                    <span>📍 {s.area}</span>
                    {s.hours && <span>🕒 {s.hours}</span>}
                  </div>
                  <div className="actions">
                    {s.phone && (
                      <a className="btn call" href={`tel:${s.phone}`}>
                        📞 কল করুন
                      </a>
                    )}
                    <a
                      className="btn dir"
                      href={directionsUrl(s)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      🧭 পথ দেখুন
                    </a>
                    <button
                      className="btn speak"
                      onClick={() => speak(s)}
                      aria-label="শুনুন"
                      title="শুনুন"
                    >
                      🔊
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
