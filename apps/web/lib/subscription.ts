// Subscription tier limits, commission rates, and content format access

export type ContentFormat = "telegram_post" | "seo_article" | "cards" | "reels_script" | "faq";

export const ALL_FORMATS: ContentFormat[] = ["telegram_post", "seo_article", "cards", "reels_script", "faq"];

export const TIER_CONFIG = {
  free: {
    name: "Free",
    price: 0,
    maxNiches: 1,
    ordersPerWeek: 3,
    packagesPerMonth: 3,
    commission: 0.15,
    // 2 формата: Telegram-пост (экспорт ✅) + SEO-статья (только платформа)
    formats: ["telegram_post", "seo_article"] as ContentFormat[],
    exportableFormats: ["telegram_post"] as ContentFormat[],
    features: {
      unlimitedPublications: true,
      crosspost: false,
      distributionHelp: false,
      refreshReminders: false,
      citationTracking: false,
      competitorAnalysis: false,
      expertRating: false,
    },
  },
  starter: {
    name: "Starter",
    price: 1490,
    maxNiches: 2,
    ordersPerWeek: 10,
    packagesPerMonth: Infinity,
    commission: 0.07,
    // Все 5 форматов, всё экспортируется
    formats: ALL_FORMATS,
    exportableFormats: ALL_FORMATS,
    features: {
      unlimitedPublications: true,
      crosspost: false,
      distributionHelp: false,
      refreshReminders: false,
      citationTracking: false,
      competitorAnalysis: false,
      expertRating: false,
    },
  },
  pro: {
    name: "Pro",
    price: 2990,
    maxNiches: 3,
    ordersPerWeek: Infinity,
    packagesPerMonth: Infinity,
    commission: 0.03,
    formats: ALL_FORMATS,
    exportableFormats: ALL_FORMATS,
    features: {
      unlimitedPublications: true,
      crosspost: true,
      distributionHelp: true,
      refreshReminders: true,
      citationTracking: false,
      competitorAnalysis: false,
      expertRating: false,
    },
  },
  expert: {
    name: "Expert",
    price: 4990,
    maxNiches: 5,
    ordersPerWeek: Infinity,
    packagesPerMonth: Infinity,
    commission: 0,
    formats: ALL_FORMATS,
    exportableFormats: ALL_FORMATS,
    features: {
      unlimitedPublications: true,
      crosspost: true,
      distributionHelp: true,
      refreshReminders: true,
      citationTracking: true,
      competitorAnalysis: true,
      expertRating: true,
    },
  },
  business: {
    name: "Business",
    price: 24990,
    maxNiches: 10,
    ordersPerWeek: Infinity,
    packagesPerMonth: Infinity,
    commission: 0,
    formats: ALL_FORMATS,
    exportableFormats: ALL_FORMATS,
    features: {
      unlimitedPublications: true,
      crosspost: true,
      distributionHelp: true,
      refreshReminders: true,
      citationTracking: true,
      competitorAnalysis: true,
      expertRating: true,
    },
  },
  enterprise: {
    name: "Enterprise",
    price: 99990,
    maxNiches: 20,
    ordersPerWeek: Infinity,
    packagesPerMonth: Infinity,
    commission: 0,
    formats: ALL_FORMATS,
    exportableFormats: ALL_FORMATS,
    features: {
      unlimitedPublications: true,
      crosspost: true,
      distributionHelp: true,
      refreshReminders: true,
      citationTracking: true,
      competitorAnalysis: true,
      expertRating: true,
    },
  },
} as const;

export type TierName = keyof typeof TIER_CONFIG;

export function getTierConfig(tier: string) {
  return TIER_CONFIG[tier as TierName] ?? TIER_CONFIG.free;
}

export function checkPackageLimit(tier: string, currentMonthPackages: number): { allowed: boolean; limit: number } {
  const config = getTierConfig(tier);
  return {
    allowed: currentMonthPackages < config.packagesPerMonth,
    limit: config.packagesPerMonth,
  };
}

export function getAllowedFormats(tier: string): ContentFormat[] {
  const config = getTierConfig(tier);
  return [...config.formats];
}

export function getMaxNiches(tier: string): number {
  return getTierConfig(tier).maxNiches;
}

export function checkNicheLimit(tier: string, currentNiches: number): { allowed: boolean; limit: number } {
  const limit = getMaxNiches(tier);
  return { allowed: currentNiches < limit, limit };
}

export function isFormatExportable(tier: string, format: ContentFormat): boolean {
  const config = getTierConfig(tier);
  return config.exportableFormats.includes(format);
}
