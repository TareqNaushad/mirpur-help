// ---------------------------------------------------------------------------
// Services data — thin wrapper around the shared single source of truth
// (services.json). The Telegram bot reads the SAME services.json, so the web
// app and bot never drift apart.
//
// Edit the DATA in services.json. Edit the LOGIC here.
//
// IMPORTANT: Items with verified=false have seed addresses/phones/hours that
// MUST be confirmed on the ground before public launch. National helpline
// numbers (999, 333, 109, 1098, 16263) are official and verified.
// ---------------------------------------------------------------------------

import data from "./services.json";

export const CATEGORIES = data.categories;
export const HELPLINES = data.helplines;
export const SERVICES = data.services;

// Helper: services for a given category id.
export function servicesByCategory(catId) {
  return SERVICES.filter((s) => s.categories.includes(catId));
}
