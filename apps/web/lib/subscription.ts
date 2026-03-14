// Subscription tier limits and commission rates

export const TIER_CONFIG = {
  free: {
    name: "Free",
    price: 0,
    ordersPerWeek: 3,
    commission: 0.15,
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
    ordersPerWeek: 10,
    commission: 0.07,
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
    ordersPerWeek: Infinity,
    commission: 0.03,
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
    ordersPerWeek: Infinity,
    commission: 0,
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
    ordersPerWeek: Infinity,
    commission: 0,
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
    ordersPerWeek: Infinity,
    commission: 0,
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

export function checkOrderLimit(tier: string, currentWeekOrders: number): { allowed: boolean; limit: number } {
  const config = getTierConfig(tier);
  return {
    allowed: currentWeekOrders < config.ordersPerWeek,
    limit: config.ordersPerWeek,
  };
}
