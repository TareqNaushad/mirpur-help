// ---------------------------------------------------------------------------
// Field-verification checklist generator.
//
// Reads the shared data (services.json + events.json) and produces:
//   • VERIFICATION_CHECKLIST.md  — printable table for walking Mirpur
//   • verification_checklist.csv — open in Excel / Google Sheets on a phone
//
// Run:  node scripts/make-checklist.js
//
// Take it on the ground, call each phone, visit each place, and tick the
// columns. Then set verified=true in services.json / events.json for the ones
// you confirm.
// ---------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const services = require(path.join(root, "data", "services.json"));
const events = require(path.join(root, "data", "events.json"));

// Build a flat list of rows to verify.
const rows = [];

for (const s of services.services) {
  rows.push({
    kind: "Service",
    id: s.id,
    nameBn: s.nameBn,
    nameEn: s.nameEn,
    where: s.area,
    phone: s.phone || "—",
    when: s.hours || "—",
    verified: s.verified ? "yes" : "NO",
  });
}

for (const e of events.events) {
  rows.push({
    kind: "Event",
    id: e.id,
    nameBn: e.titleBn,
    nameEn: e.titleEn || e.organizerBn,
    where: e.location,
    phone: e.phone || "—",
    when: `${e.date} ${e.startTime || ""}–${e.endTime || ""}`.trim(),
    verified: e.verified ? "yes" : "NO",
  });
}

// ---- CSV ----
function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const csvHeader = [
  "Type",
  "ID",
  "Name (Bangla)",
  "Name (English)",
  "Where",
  "Phone",
  "When",
  "Currently verified?",
  "Exists? (Y/N)",
  "Phone correct? (Y/N)",
  "Address correct? (Y/N)",
  "Notes / corrections",
];
const csvLines = [csvHeader.map(csvCell).join(",")];
for (const r of rows) {
  csvLines.push(
    [r.kind, r.id, r.nameBn, r.nameEn, r.where, r.phone, r.when, r.verified, "", "", "", ""]
      .map(csvCell)
      .join(",")
  );
}
// BOM so Excel opens Bangla (UTF-8) correctly.
fs.writeFileSync(
  path.join(root, "verification_checklist.csv"),
  "﻿" + csvLines.join("\r\n") + "\r\n",
  "utf8"
);

// ---- Markdown ----
const md = [];
md.push("# মিরপুর সাহায্য — মাঠ যাচাই তালিকা / Field Verification Checklist");
md.push("");
md.push(`Generated: ${new Date().toISOString().slice(0, 10)} · ${rows.length} items to verify`);
md.push("");
md.push("**কীভাবে ব্যবহার করবেন / How to use:** প্রতিটি জায়গায় ফোন করুন ও যান। সত্যি থাকলে ✅ দিন, ভুল হলে নোটে সঠিক তথ্য লিখুন। যাচাই শেষে `data/services.json` বা `data/events.json` এ `verified: true` করুন।");
md.push("");

const totalUnverified = rows.filter((r) => r.verified === "NO").length;
md.push(`> ⚠️ এখন ${totalUnverified}/${rows.length} টি তথ্য **অযাচাইকৃত** — প্রকাশের আগে যাচাই করুন।`);
md.push("");

md.push("| # | ধরন | নাম | কোথায় | ফোন | কখন | আছে?✅ | ফোন ঠিক?✅ | ঠিকানা ঠিক?✅ | নোট |");
md.push("|---|-----|-----|--------|-----|-----|--------|-----------|--------------|-----|");
rows.forEach((r, i) => {
  md.push(
    `| ${i + 1} | ${r.kind} | ${r.nameBn} | ${r.where} | ${r.phone} | ${r.when} | ☐ | ☐ | ☐ |  |`
  );
});
md.push("");
md.push("---");
md.push("");
md.push("### English reference (same items)");
md.push("");
md.push("| # | Type | Name | Where | Phone |");
md.push("|---|------|------|-------|-------|");
rows.forEach((r, i) => {
  md.push(`| ${i + 1} | ${r.kind} | ${r.nameEn} | ${r.where} | ${r.phone} |`);
});
md.push("");
fs.writeFileSync(path.join(root, "VERIFICATION_CHECKLIST.md"), md.join("\n"), "utf8");

console.log(`✅ Wrote verification_checklist.csv and VERIFICATION_CHECKLIST.md (${rows.length} items, ${totalUnverified} unverified).`);
