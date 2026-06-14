// ---------------------------------------------------------------------------
// Bangla voice intents — maps what a person SAYS to what the app should DO.
//
// Used by components/VoiceAssistant.js. Matching is simple keyword/substring
// (no paid AI needed): the first intent whose keyword appears in the spoken
// text wins. Order matters — emergency & eligibility are checked before the
// generic categories.
//
// `action.type`:
//   "emergency"  → show/announce helplines (999 etc.)
//   "route"      → navigate to a page (value = path)
//   "events"     → show free camps/events
//   "category"   → open a help category (value = category id)
// ---------------------------------------------------------------------------

export const VOICE_INTENTS = [
  {
    id: "emergency",
    keywords: ["জরুরি", "বিপদ", "পুলিশ", "আগুন", "অ্যাম্বুলেন্স", "এম্বুলেন্স", "বাঁচাও", "মরে যাচ্ছে", "emergency", "police", "ambulance"],
    action: { type: "emergency" },
    speakBn: "জরুরি প্রয়োজনে এখনই ৯৯৯ নম্বরে কল করুন। উপরে জরুরি নম্বরগুলো দেখুন।",
  },
  {
    id: "eligibility",
    keywords: ["ভাতা", "যোগ্য", "বয়স্ক", "বিধবা", "প্রতিবন্ধী", "allowance", "eligible", "pension"],
    action: { type: "route", value: "/eligibility" },
    speakBn: "আপনি কোন সরকারি ভাতা পেতে পারেন, তা জানতে কয়েকটি সহজ প্রশ্ন করছি।",
  },
  {
    id: "post-need",
    keywords: ["সাহায্য চাই", "সাহায্য দরকার", "আমার দরকার", "অনুরোধ", "post need", "need help"],
    action: { type: "route", value: "/post-need" },
    speakBn: "আপনার প্রয়োজন জানান, দাতারা দেখে সাহায্য করবেন।",
  },
  {
    id: "events",
    keywords: ["শিবির", "ক্যাম্প", "বিনা মূল্যে", "বিনামূল্যে", "ফ্রি", "টিকা", "camp", "event", "free"],
    action: { type: "events" },
    speakBn: "কাছের বিনা মূল্যে সেবা ও শিবিরগুলো দেখাচ্ছি।",
  },
  {
    id: "medicine",
    keywords: ["ঔষধ", "ওষুধ", "medicine", "tablet"],
    action: { type: "category", value: "medicine" },
    speakBn: "ঔষধের জন্য কাছের জায়গাগুলো দেখাচ্ছি।",
  },
  {
    id: "medical",
    keywords: ["ডাক্তার", "চিকিৎসা", "অসুস্থ", "অসুখ", "হাসপাতাল", "রোগ", "জ্বর", "ব্যথা", "doctor", "sick", "hospital", "treatment"],
    action: { type: "category", value: "medical" },
    speakBn: "চিকিৎসার জন্য কাছের জায়গাগুলো দেখাচ্ছি।",
  },
  {
    id: "food",
    keywords: ["খাবার", "খাওয়া", "খেতে", "ক্ষুধা", "ক্ষুধার্ত", "ভাত", "food", "hungry", "eat"],
    action: { type: "category", value: "food" },
    speakBn: "খাবারের জন্য কাছের জায়গাগুলো দেখাচ্ছি।",
  },
  {
    id: "shelter",
    keywords: ["থাকা", "থাকার", "আশ্রয়", "ঘর", "বাসা", "ঘুমানো", "মাথা গোঁজা", "shelter", "stay", "sleep"],
    action: { type: "category", value: "shelter" },
    speakBn: "থাকার জায়গার জন্য কাছের আশ্রয়কেন্দ্র দেখাচ্ছি।",
  },
  {
    id: "clothes",
    keywords: ["কাপড়", "জামা", "পোশাক", "শীত", "কম্বল", "clothes", "cloth", "blanket"],
    action: { type: "category", value: "clothes" },
    speakBn: "কাপড়ের জন্য কাছের জায়গাগুলো দেখাচ্ছি।",
  },
  {
    id: "cash",
    keywords: ["টাকা", "অর্থ", "নগদ", "money", "cash"],
    action: { type: "category", value: "cash" },
    speakBn: "আর্থিক সাহায্যের জন্য কাছের জায়গাগুলো দেখাচ্ছি।",
  },
  {
    id: "education",
    keywords: ["পড়া", "পড়াশোনা", "স্কুল", "শিক্ষা", "লেখাপড়া", "education", "school", "study"],
    action: { type: "category", value: "education" },
    speakBn: "শিক্ষার জন্য কাছের জায়গাগুলো দেখাচ্ছি।",
  },
];

// Match the spoken text (try several recognition alternatives). Returns the
// matched intent, or null if nothing matched.
export function matchIntent(transcripts) {
  const texts = (Array.isArray(transcripts) ? transcripts : [transcripts])
    .filter(Boolean)
    .map((t) => String(t).toLowerCase());
  for (const intent of VOICE_INTENTS) {
    for (const text of texts) {
      if (intent.keywords.some((k) => text.includes(k.toLowerCase()))) {
        return intent;
      }
    }
  }
  return null;
}

// Short menu shown as tappable fallback chips if voice fails / isn't understood.
export const VOICE_MENU = [
  "food",
  "medical",
  "medicine",
  "shelter",
  "clothes",
  "cash",
  "eligibility",
  "emergency",
];
