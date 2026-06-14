// ---------------------------------------------------------------------------
// Bangla voice intents — maps what a person SAYS to what the app should DO.
//
// Matching is keyword/substring (no paid AI). Keywords are intentionally MANY
// and include common spelling variants, spoken forms and English, because
// speech recognition returns varied real-world phrasing
// (e.g. "আর্থিক সহায়তা", "ডাক্তার দরকার", "খিদে লেগেছে").
//
// Order matters — emergency & eligibility are checked before the generic
// categories.
// ---------------------------------------------------------------------------

export const VOICE_INTENTS = [
  {
    id: "emergency",
    keywords: [
      "জরুরি", "জরুরী", "বিপদ", "পুলিশ", "আগুন", "অ্যাম্বুলেন্স", "এম্বুলেন্স",
      "এ্যাম্বুলেন্স", "বাঁচাও", "বাচাও", "মরে যাচ্ছে", "দুর্ঘটনা",
      "emergency", "police", "ambulance", "fire", "danger", "urgent",
    ],
    action: { type: "emergency" },
    speakBn: "জরুরি প্রয়োজনে এখনই ৯৯৯ নম্বরে কল করুন। উপরে জরুরি নম্বরগুলো দেখুন।",
  },
  {
    id: "eligibility",
    keywords: [
      "ভাতা", "ভাতার", "যোগ্য", "যোগ্যতা", "বয়স্ক", "বিধবা", "প্রতিবন্ধী",
      "বার্ধক্য", "ফ্যামিলি কার্ড", "allowance", "eligible", "pension", "stipend",
    ],
    action: { type: "route", value: "/eligibility" },
    speakBn: "আপনি কোন সরকারি ভাতা পেতে পারেন, তা জানতে কয়েকটি সহজ প্রশ্ন করছি।",
  },
  {
    id: "post-need",
    keywords: [
      "সাহায্য চাই", "সাহায্য দরকার", "অনুরোধ", "আবেদন", "পোস্ট",
      "post need", "request help",
    ],
    action: { type: "route", value: "/post-need" },
    speakBn: "আপনার প্রয়োজন জানান, দাতারা দেখে সাহায্য করবেন।",
  },
  {
    id: "events",
    keywords: [
      "শিবির", "ক্যাম্প", "ক্যম্প", "বিনা মূল্যে", "বিনামূল্যে", "ফ্রি",
      "টিকা", "ভ্যাকসিন", "মেডিকেল ক্যাম্প", "camp", "event", "free", "vaccine",
    ],
    action: { type: "events" },
    speakBn: "কাছের বিনা মূল্যে সেবা ও শিবিরগুলো দেখাচ্ছি।",
  },
  {
    id: "medicine",
    keywords: [
      "ঔষধ", "ওষুধ", "ওসুধ", "ঔসধ", "দাওয়াই", "medicine", "medication",
      "tablet", "pill",
    ],
    action: { type: "category", value: "medicine" },
    speakBn: "ঔষধের জন্য কাছের জায়গাগুলো দেখাচ্ছি।",
  },
  {
    id: "medical",
    keywords: [
      "ডাক্তার", "ডাক্তর", "ডক্টর", "চিকিৎসা", "চিকিতসা", "অসুস্থ", "অসুখ",
      "রোগ", "রোগী", "রুগী", "হাসপাতাল", "ক্লিনিক", "জ্বর", "জর", "ব্যথা",
      "ব্যাথা", "শরীর খারাপ", "doctor", "sick", "ill", "hospital", "clinic",
      "fever", "pain", "treatment", "health",
    ],
    action: { type: "category", value: "medical" },
    speakBn: "চিকিৎসার জন্য কাছের জায়গাগুলো দেখাচ্ছি।",
  },
  {
    id: "food",
    keywords: [
      "খাবার", "খাওয়া", "খাওন", "খেতে", "খিদে", "ক্ষুধা", "ক্ষুধার্ত", "ভাত",
      "অন্ন", "খাদ্য", "ভুখা", "food", "hungry", "eat", "meal", "rice",
    ],
    action: { type: "category", value: "food" },
    speakBn: "খাবারের জন্য কাছের জায়গাগুলো দেখাচ্ছি।",
  },
  {
    id: "shelter",
    keywords: [
      "থাকা", "থাকার", "আশ্রয়", "ঘর", "বাসা", "বাসস্থান", "ঘুমানো",
      "রাত কাটানো", "মাথা গোঁজা", "গৃহহীন", "shelter", "stay", "sleep",
      "home", "house", "homeless",
    ],
    action: { type: "category", value: "shelter" },
    speakBn: "থাকার জায়গার জন্য কাছের আশ্রয়কেন্দ্র দেখাচ্ছি।",
  },
  {
    id: "clothes",
    keywords: [
      "কাপড়", "কাপর", "জামা", "জামাকাপড়", "পোশাক", "শীত", "শীতবস্ত্র",
      "কম্বল", "লেপ", "clothes", "cloth", "clothing", "blanket", "winter", "dress",
    ],
    action: { type: "category", value: "clothes" },
    speakBn: "কাপড়ের জন্য কাছের জায়গাগুলো দেখাচ্ছি।",
  },
  {
    id: "cash",
    keywords: [
      "টাকা", "পয়সা", "অর্থ", "আর্থিক", "অর্থনৈতিক", "নগদ", "দান", "অনুদান",
      "ভিক্ষা", "money", "cash", "financial", "fund", "donation",
    ],
    action: { type: "category", value: "cash" },
    speakBn: "আর্থিক সাহায্যের জন্য কাছের জায়গাগুলো দেখাচ্ছি।",
  },
  {
    id: "education",
    keywords: [
      "পড়া", "পড়াশোনা", "পড়াশুনা", "পড়ালেখা", "লেখাপড়া", "স্কুল", "ইস্কুল",
      "শিক্ষা", "পড়তে", "বই", "education", "school", "study", "books", "learn",
    ],
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
