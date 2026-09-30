// R-09: одна таблица тарифов - shared SUBSCRIPTION_TIERS. Здесь только web-специфичный вид
// (ordersPerWeek и флаги features для страниц) и делегирование проверок в shared/billing/limits.
// Цены, лимиты ниш, пакетов и форматы не дублируются: расходиться нечему.
import {
  ALL_FORMATS,
  SUBSCRIPTION_TIERS,
  checkNicheLimit,
  checkPackageLimit,
  getAllowedFormats,
  getMaxNiches,
  resolveTier,
  type ContentFormat,
  type SubscriptionTier,
} from "shared";

export { ALL_FORMATS, checkNicheLimit, checkPackageLimit, getAllowedFormats, getMaxNiches, type ContentFormat };

export type TierName = "free" | "starter" | "pro" | "expert" | "business" | "enterprise";

export interface TierFeatures {
  demandMap: boolean;
  pageAnalytics: boolean;
  unlimitedPublications: boolean;
  crosspost: boolean;
  distributionHelp: boolean;
  refreshReminders: boolean;
  citationTracking: boolean;
  competitorAnalysis: boolean;
  expertRating: boolean;
}

// Web-only: лимит тем в неделю (в плане R-09 не применяется, см. BACKLOG) и флаги фич страниц.
const WEB_ONLY: Record<TierName, { ordersPerWeek: number; features: TierFeatures }> = {
  free: { ordersPerWeek: 3, features: { demandMap: true, pageAnalytics: false, unlimitedPublications: true, crosspost: false, distributionHelp: false, refreshReminders: false, citationTracking: false, competitorAnalysis: false, expertRating: false } },
  starter: { ordersPerWeek: 10, features: { demandMap: true, pageAnalytics: false, unlimitedPublications: true, crosspost: false, distributionHelp: false, refreshReminders: false, citationTracking: false, competitorAnalysis: false, expertRating: false } },
  pro: { ordersPerWeek: Infinity, features: { demandMap: true, pageAnalytics: false, unlimitedPublications: true, crosspost: true, distributionHelp: true, refreshReminders: true, citationTracking: false, competitorAnalysis: false, expertRating: false } },
  expert: { ordersPerWeek: Infinity, features: { demandMap: true, pageAnalytics: true, unlimitedPublications: true, crosspost: true, distributionHelp: true, refreshReminders: true, citationTracking: true, competitorAnalysis: true, expertRating: true } },
  business: { ordersPerWeek: Infinity, features: { demandMap: true, pageAnalytics: true, unlimitedPublications: true, crosspost: true, distributionHelp: true, refreshReminders: true, citationTracking: true, competitorAnalysis: true, expertRating: true } },
  enterprise: { ordersPerWeek: Infinity, features: { demandMap: true, pageAnalytics: true, unlimitedPublications: true, crosspost: true, distributionHelp: true, refreshReminders: true, citationTracking: true, competitorAnalysis: true, expertRating: true } },
};

export type TierConfig = Pick<SubscriptionTier, "name" | "price" | "maxNiches" | "packagesPerMonth" | "commission" | "formats" | "exportableFormats">
  & { ordersPerWeek: number; features: TierFeatures };

function toConfig(tier: SubscriptionTier, web: { ordersPerWeek: number; features: TierFeatures }): TierConfig {
  return {
    name: tier.name, price: tier.price, maxNiches: tier.maxNiches, packagesPerMonth: tier.packagesPerMonth,
    commission: tier.commission, formats: [...tier.formats], exportableFormats: [...tier.exportableFormats], ...web,
  };
}

export const TIER_CONFIG: Record<TierName, TierConfig> = Object.fromEntries(
  (Object.keys(WEB_ONLY) as TierName[]).map((id) => [id, toConfig(SUBSCRIPTION_TIERS[id]!, WEB_ONLY[id])]),
) as Record<TierName, TierConfig>;

export function getTierConfig(tier: string): TierConfig {
  const id = resolveTier(tier).id as TierName;
  return TIER_CONFIG[id] ?? TIER_CONFIG.free;
}

export function isFormatExportable(tier: string, format: ContentFormat): boolean {
  return resolveTier(tier).exportableFormats.includes(format);
}
