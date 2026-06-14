// ---------------------------------------------------------------------------
// "আমি কি যোগ্য?" — Eligibility wizard data (Phase 2)
//
// A simple rule engine that maps a few plain Bangla answers to the government
// social-safety-net programs a person likely qualifies for, plus exactly how to
// apply.
//
// ⚠️ Allowance AMOUNTS are revised by the government almost every fiscal year.
// They are shown as "প্রায় / approx" and the user is always pointed to the
// official portal (mis.bhata.gov.bd) and helpline 333 to confirm. Eligibility
// rules here are simplified to be understandable, not a legal determination.
// ---------------------------------------------------------------------------

// The questions, in order. `showIf` lets us skip irrelevant ones.
export const QUESTIONS = [
  {
    id: "age",
    bn: "আপনার বয়স কত?",
    en: "What is your age?",
    options: [
      { value: "under18", bn: "১৮ বছরের নিচে", en: "Under 18" },
      { value: "18-49", bn: "১৮ – ৪৯ বছর", en: "18 – 49" },
      { value: "50-61", bn: "৫০ – ৬১ বছর", en: "50 – 61" },
      { value: "62-64", bn: "৬২ – ৬৪ বছর", en: "62 – 64" },
      { value: "65plus", bn: "৬৫ বছর বা তার বেশি", en: "65 or older" },
    ],
  },
  {
    id: "gender",
    bn: "আপনি নারী না পুরুষ?",
    en: "Are you female or male?",
    options: [
      { value: "female", bn: "নারী", en: "Female" },
      { value: "male", bn: "পুরুষ", en: "Male" },
    ],
  },
  {
    id: "lowIncome",
    bn: "আপনার পরিবারের আয় কি খুব কম? (বছরে প্রায় ১২,০০০ টাকার কম আয়)",
    en: "Is your family income very low? (under ~Tk12,000/year)",
    options: [
      { value: "yes", bn: "হ্যাঁ, খুব কম", en: "Yes, very low" },
      { value: "no", bn: "না", en: "No" },
    ],
  },
  {
    id: "widow",
    bn: "আপনি কি বিধবা বা স্বামী পরিত্যক্তা?",
    en: "Are you a widow or deserted by your husband?",
    showIf: (a) => a.gender === "female",
    options: [
      { value: "yes", bn: "হ্যাঁ", en: "Yes" },
      { value: "no", bn: "না", en: "No" },
    ],
  },
  {
    id: "disabled",
    bn: "আপনি বা পরিবারের কেউ কি প্রতিবন্ধী?",
    en: "Are you or a family member a person with disability?",
    options: [
      { value: "yes", bn: "হ্যাঁ", en: "Yes" },
      { value: "no", bn: "না", en: "No" },
    ],
  },
  {
    id: "mother",
    bn: "আপনি কি গর্ভবতী বা ২ বছরের কম বয়সী শিশুর মা?",
    en: "Are you pregnant or the mother of a child under 2?",
    showIf: (a) => a.gender === "female",
    options: [
      { value: "yes", bn: "হ্যাঁ", en: "Yes" },
      { value: "no", bn: "না", en: "No" },
    ],
  },
  {
    id: "schoolKids",
    bn: "আপনার পরিবারে কি স্কুলে পড়া শিশু আছে?",
    en: "Are there school-going children in your family?",
    options: [
      { value: "yes", bn: "হ্যাঁ", en: "Yes" },
      { value: "no", bn: "না", en: "No" },
    ],
  },
];

// Generic guidance reused by several programs (urban Mirpur / Dhaka context).
const APPLY_GOV =
  "থানা সমাজসেবা কার্যালয় / সিটি কর্পোরেশন ওয়ার্ড কাউন্সিলরের কাছে আবেদন করুন, অথবা অনলাইনে mis.bhata.gov.bd — সাহায্যের জন্য কল করুন ৩৩৩।";
const DOCS_GOV =
  "প্রয়োজন: জাতীয় পরিচয়পত্র (NID), ২ কপি ছবি, এবং (থাকলে) প্রতিবন্ধী সুবর্ণ নাগরিক কার্ড।";

// Each program returns true/false from its rule.
export const PROGRAMS = [
  {
    id: "old-age",
    nameBn: "বয়স্ক ভাতা",
    nameEn: "Old Age Allowance",
    benefitBn: "প্রায় ৳৭০০/মাস (৯০+ বছর হলে ৳১,০০০)। সরাসরি মোবাইল/ব্যাংকে।",
    applyBn: APPLY_GOV,
    docsBn: DOCS_GOV,
    rule: (a) =>
      a.lowIncome === "yes" &&
      (a.age === "65plus" || (a.gender === "female" && a.age === "62-64")),
  },
  {
    id: "widow",
    nameBn: "বিধবা ও স্বামী নিগৃহীতা মহিলা ভাতা",
    nameEn: "Widow & Deserted Women Allowance",
    benefitBn: "প্রায় ৳৭০০/মাস। বিধবা বা স্বামী পরিত্যক্তা দরিদ্র নারীদের জন্য।",
    applyBn: APPLY_GOV,
    docsBn: DOCS_GOV,
    rule: (a) =>
      a.gender === "female" && a.widow === "yes" && a.lowIncome === "yes",
  },
  {
    id: "disability",
    nameBn: "প্রতিবন্ধী ভাতা",
    nameEn: "Disability Allowance",
    benefitBn:
      "প্রায় ৳৮৫০/মাস। আগে প্রতিবন্ধী শনাক্তকরণ (সুবর্ণ নাগরিক) কার্ড করতে হবে।",
    applyBn:
      "প্রথমে সমাজসেবা কার্যালয় থেকে প্রতিবন্ধী সুবর্ণ নাগরিক কার্ড করুন, তারপর ভাতার আবেদন করুন। কল করুন ৩৩৩।",
    docsBn: DOCS_GOV,
    rule: (a) => a.disabled === "yes" && a.lowIncome === "yes",
  },
  {
    id: "mother-child",
    nameBn: "মা ও শিশু সহায়তা কর্মসূচি (মাতৃত্বকালীন ভাতা)",
    nameEn: "Mother & Child Benefit / Maternity Allowance",
    benefitBn:
      "প্রায় ৳৮০০/মাস, কয়েক বছর পর্যন্ত। গর্ভবতী ও ছোট শিশুর দরিদ্র মায়েদের জন্য।",
    applyBn:
      "ইউনিয়ন/সিটি কর্পোরেশন ও মহিলা বিষয়ক অধিদপ্তর/সমাজসেবা কার্যালয়ে আবেদন করুন। কল করুন ৩৩৩।",
    docsBn: "প্রয়োজন: NID, গর্ভকালীন কার্ড/ইপিআই কার্ড, ছবি।",
    rule: (a) => a.gender === "female" && a.mother === "yes" && a.lowIncome === "yes",
  },
  {
    id: "family-card",
    nameBn: "টিসিবি ফ্যামিলি কার্ড",
    nameEn: "TCB Family Card",
    benefitBn:
      "অর্ধেক দামে চাল, ডাল, তেল, চিনি। দরিদ্র ও স্বল্প-আয়ের পরিবারের জন্য।",
    applyBn:
      "স্থানীয় ওয়ার্ড কাউন্সিলর / সিটি কর্পোরেশন অফিসে নাম তালিকাভুক্ত করুন। কল করুন ৩৩৩।",
    docsBn: "প্রয়োজন: NID।",
    rule: (a) => a.lowIncome === "yes",
  },
  {
    id: "education-stipend",
    nameBn: "শিক্ষা উপবৃত্তি",
    nameEn: "Education Stipend",
    benefitBn:
      "দরিদ্র পরিবারের স্কুলগামী শিশুদের জন্য মাসিক উপবৃত্তি ও সহায়তা।",
    applyBn:
      "শিশুর স্কুল/মাদ্রাসার শিক্ষক বা প্রধান শিক্ষকের সাথে যোগাযোগ করুন। কল করুন ৩৩৩।",
    docsBn: "প্রয়োজন: শিশুর জন্ম নিবন্ধন, অভিভাবকের NID।",
    rule: (a) => a.schoolKids === "yes" && a.lowIncome === "yes",
  },
];

// Run all rules against the collected answers.
export function evaluate(answers) {
  return PROGRAMS.filter((p) => {
    try {
      return p.rule(answers);
    } catch {
      return false;
    }
  });
}
