// src/config/site.ts
export const siteConfig = {
  name: { en: "Adam & Chriss", ar: "آدم و كريس" },
  description: {
    en: "Elite mobile barbering service — comes to you in Cairo",
    ar: "خدمة تجميل عربية مركّزة — نأتي إليك في القاهرة",
  },
  phone: "+20 100 000 0000",
  whatsapp: "201000000000",
  email: "book@adamandchriss.com",
  address: {
    en: "Cairo, Egypt",
    ar: "القاهرة، مصر",
  },
};

// Scheduling rules — all editable by owner via admin NL
export const schedulingConfig = {
  minLeadHours: 4,       // minimum hours from now to book
  travelBufferMin: 60,   // gap between appointments
  workingHours: { start: "10:00", end: "22:00" },
  slotIntervalMin: 30,   // slot granularity
  holdDurationMin: 15,   // tentative hold while paying deposit
};

// Services — seeded into DB; editable via admin NL
export const defaultServices = [
  {
    slug: "hair",
    name_en: "Hair",
    name_ar: "تقصيل شعر",
    duration_min: 30,
    price_egp: 300,
    deposit_pct: 30,
    description_en: "Classic haircut, wash, and styling with premium products.",
    description_ar: "تقصيل كلاسيكي، غسيل، وتصفيف بمنتجات متميزة.",
    active: true,
  },
  {
    slug: "beard",
    name_en: "Beard",
    name_ar: "تقصيل لحية",
    duration_min: 30,
    price_egp: 250,
    deposit_pct: 30,
    description_en: "Beard shaping, trimming, and conditioning treatment.",
    description_ar: "تشكيل وتقصيل اللحية مع علاج ترطيق.",
    active: true,
  },
  {
    slug: "grooming-session",
    name_en: "Grooming Session",
    name_ar: "جلسة تجميل",
    duration_min: 45,
    price_egp: 400,
    deposit_pct: 30,
    description_en: "Haircut, beard, and mustache grooming for a polished look.",
    description_ar: "تقصيل شعر ولحية وإتشور مع تركيبة متميزة.",
    active: true,
  },
  {
    slug: "the-works",
    name_en: "The Works",
    name_ar: "العمل كاملاً",
    duration_min: 60,
    price_egp: 600,
    deposit_pct: 40,
    description_en: "Full premium treatment: haircut, beard, hot towel, and scalp massage.",
    description_ar: "علاج كامل متميز: تقصيل شعر، لحية، قماش ساخن، وتدليك فروة رأس.",
    active: true,
  },
];

// Cancellation policy — <24h = deposit forfeited (default)
export const cancellationPolicy = {
  fullRefundBeforeHours: 24,
  under24h: "forfeit_deposit", // "forfeit_deposit" | "half_refund"
};
