// ---------------------------------------------------------------------------
// Free Events & Camps — "বিনা মূল্যে" সেবা
//
// Thin wrapper around the shared single source of truth (events.json). The
// Telegram bot reads the SAME events.json. Crowdsourced submissions land in a
// moderation queue first (see app/api/submit-event); an admin then copies
// approved ones into events.json.
//
// IMPORTANT: Dates & locations must be confirmed by calling the organizer
// before sending anyone.
// ---------------------------------------------------------------------------

import data from "./events.json";

export const EVENTS = data.events;

// Filter upcoming events (from today onwards).
export function upcomingEvents(fromDate = new Date()) {
  const today = new Date(fromDate);
  today.setHours(0, 0, 0, 0);
  return EVENTS.filter((e) => new Date(e.date) >= today).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
}

// Group events by type for display.
export function eventsByType() {
  const grouped = {};
  upcomingEvents().forEach((e) => {
    if (!grouped[e.typeBn]) grouped[e.typeBn] = [];
    grouped[e.typeBn].push(e);
  });
  return grouped;
}
