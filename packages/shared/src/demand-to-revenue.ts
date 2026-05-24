export type DemandSegment = "solo" | "b2b" | "agency";
export type DemandIntent = "informational" | "comparative" | "recommendation" | "transactional";
export type DemandStage = "discover" | "compare" | "decide" | "act";
export type TrendDirection = "rising" | "stable" | "falling" | "seasonal";

export type DemandSignalInput = {
  monthlyVolume?: number | null;
  trendScore?: number | null;
  gapScore?: number | null;
  commercialIntent?: number | null;
  aiVisibilityScore?: number | null;
  confidence?: number | null;
};

export type LocalSalesIndexInput = {
  localVisibilityScore?: number | null;
  reviewScore?: number | null;
  conversionScore?: number | null;
  aiVisibilityScore?: number | null;
  lostLeadRecoveryScore?: number | null;
  taskCompletionScore?: number | null;
};

export type LostRevenueInput = {
  avgCheck?: number | null;
  leadsCount?: number | null;
  conversionProbability?: number | null;
};

export type MachineProfileInput = {
  name: string;
  type: "expert" | "business";
  url?: string | null;
  city?: string | null;
  services?: string[] | null;
  priceFrom?: number | null;
  priceTo?: number | null;
  bookingUrl?: string | null;
  proof?: Record<string, unknown> | null;
  sla?: string | null;
};

export type TrustComponentsInput = {
  proofScore?: number | null;
  aiVisibilityScore?: number | null;
  demandScore?: number | null;
  conversionScore?: number | null;
};

export type UnitEconomicsInput = {
  spend?: number | null;
  clicks?: number | null;
  leads?: number | null;
  customers?: number | null;
  revenue?: number | null;
};

export type ResultLoopInput = {
  demandFound?: number | null;
  tasksCreated?: number | null;
  pagesPublished?: number | null;
  views?: number | null;
  clicks?: number | null;
  leads?: number | null;
  revenue?: number | null;
  lostRevenue?: number | null;
};

export type B2BPageDraftInput = {
  businessName: string;
  serviceName: string;
  city?: string | null;
  district?: string | null;
  priceFrom?: number | null;
  priceTo?: number | null;
  reviews?: string[] | null;
  proof?: string[] | null;
  cta?: string | null;
};

function clamp(value: number, min = 0, max = 100): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function safe(value?: number | null, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function calculateDemandOpportunityScore(input: DemandSignalInput): number {
  const volumeScore = clamp(Math.log10(Math.max(safe(input.monthlyVolume, 0), 10)) * 18);
  const trendScore = clamp(safe(input.trendScore));
  const gapScore = clamp(safe(input.gapScore) * 10);
  const intentScore = clamp(safe(input.commercialIntent) * 100);
  const visibilityPenalty = clamp(100 - safe(input.aiVisibilityScore));
  const confidence = clamp(safe(input.confidence, 0.7) * 100);

  const score =
    volumeScore * 0.2 +
    trendScore * 0.2 +
    gapScore * 0.2 +
    intentScore * 0.2 +
    visibilityPenalty * 0.1 +
    confidence * 0.1;

  return Math.round(clamp(score) * 10) / 10;
}

export function inferDemandStage(intent?: DemandIntent | null): DemandStage {
  if (intent === "transactional") return "act";
  if (intent === "recommendation") return "decide";
  if (intent === "comparative") return "compare";
  return "discover";
}

export function calculateLocalSalesIndex(input: LocalSalesIndexInput): number {
  const score =
    clamp(safe(input.localVisibilityScore)) * 0.22 +
    clamp(safe(input.reviewScore)) * 0.18 +
    clamp(safe(input.conversionScore)) * 0.2 +
    clamp(safe(input.aiVisibilityScore)) * 0.14 +
    clamp(safe(input.lostLeadRecoveryScore)) * 0.14 +
    clamp(safe(input.taskCompletionScore)) * 0.12;

  return Math.round(clamp(score) * 10) / 10;
}

export function estimateLostRevenue(input: LostRevenueInput): number {
  const avgCheck = Math.max(0, safe(input.avgCheck));
  const leadsCount = Math.max(0, safe(input.leadsCount));
  const probability = Math.min(1, Math.max(0, safe(input.conversionProbability, 0.2)));
  return Math.round(avgCheck * leadsCount * probability);
}

export function buildMachineReadableProfile(input: MachineProfileInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": input.type === "expert" ? "Person" : "LocalBusiness",
    name: input.name,
    url: input.url ?? undefined,
    areaServed: input.city ?? undefined,
    knowsAbout: input.services ?? undefined,
    makesOffer: input.services?.map((service) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: service },
      priceSpecification:
        input.priceFrom || input.priceTo
          ? {
              "@type": "PriceSpecification",
              minPrice: input.priceFrom ?? undefined,
              maxPrice: input.priceTo ?? input.priceFrom ?? undefined,
              priceCurrency: "RUB",
            }
          : undefined,
    })),
    potentialAction: input.bookingUrl
      ? {
          "@type": "ReserveAction",
          target: input.bookingUrl,
        }
      : undefined,
    serviceOutput: "client_lead",
    serviceLevelAgreement: input.sla ?? undefined,
    proofOfHuman: input.proof ?? undefined,
  };
}

export function calculateTrustComponents(input: TrustComponentsInput): {
  trust_score: number;
  components: {
    proof: number;
    ai_visibility: number;
    demand: number;
    conversion: number;
  };
} {
  const proof = clamp(safe(input.proofScore));
  const aiVisibility = clamp(safe(input.aiVisibilityScore));
  const demand = clamp(safe(input.demandScore));
  const conversion = clamp(safe(input.conversionScore));
  const trustScore =
    proof * 0.35 + aiVisibility * 0.25 + demand * 0.2 + conversion * 0.2;

  return {
    trust_score: Math.round(clamp(trustScore) * 10) / 10,
    components: {
      proof: Math.round(proof),
      ai_visibility: Math.round(aiVisibility),
      demand: Math.round(demand),
      conversion: Math.round(conversion),
    },
  };
}

export function calculateUnitEconomics(input: UnitEconomicsInput): {
  cpl: number;
  cac: number;
  cr: number;
  romi: number;
  payback_days: number | null;
} {
  const spend = Math.max(0, safe(input.spend));
  const clicks = Math.max(0, safe(input.clicks));
  const leads = Math.max(0, safe(input.leads));
  const customers = Math.max(0, safe(input.customers));
  const revenue = Math.max(0, safe(input.revenue));
  const cpl = leads > 0 ? spend / leads : 0;
  const cac = customers > 0 ? spend / customers : 0;
  const cr = clicks > 0 ? (leads / clicks) * 100 : 0;
  const romi = spend > 0 ? ((revenue - spend) / spend) * 100 : revenue > 0 ? 100 : 0;
  const paybackDays = revenue > 0 && spend > 0 ? Math.max(1, Math.round((spend / revenue) * 30)) : null;

  return {
    cpl: Math.round(cpl),
    cac: Math.round(cac),
    cr: Math.round(clamp(cr) * 10) / 10,
    romi: Math.round(romi * 10) / 10,
    payback_days: paybackDays,
  };
}

export function buildResultLoopSummary(input: ResultLoopInput): {
  stage: "demand" | "action" | "traffic" | "lead" | "revenue";
  score: number;
  bottleneck: string;
  next_action: string;
} {
  const demand = safe(input.demandFound);
  const tasks = safe(input.tasksCreated);
  const pages = safe(input.pagesPublished);
  const views = safe(input.views);
  const clicks = safe(input.clicks);
  const leads = safe(input.leads);
  const revenue = safe(input.revenue);

  if (demand > 0 && tasks === 0) {
    return {
      stage: "demand",
      score: 20,
      bottleneck: "Спрос найден, но не превращён в задачи",
      next_action: "Создать задачи роста по самым сильным сигналам спроса",
    };
  }
  if (tasks > 0 && pages === 0) {
    return {
      stage: "action",
      score: 40,
      bottleneck: "Задачи есть, но нет публикаций или изменений",
      next_action: "Опубликовать страницу/ответ или внести изменение в канал",
    };
  }
  if (pages > 0 && views === 0) {
    return {
      stage: "traffic",
      score: 55,
      bottleneck: "Опубликовано, но нет видимости и трафика",
      next_action: "Усилить индексацию, перелинковку и канал распространения",
    };
  }
  if (views > 0 && leads === 0) {
    return {
      stage: "lead",
      score: 70,
      bottleneck: "Есть просмотры, но нет заявок",
      next_action: "Усилить CTA, цену, FAQ, доказательства и форму",
    };
  }
  if (leads > 0 && revenue === 0) {
    return {
      stage: "revenue",
      score: 82,
      bottleneck: "Заявки есть, деньги не зафиксированы",
      next_action: "Проверить обработку, follow-up и статус оплаты",
    };
  }

  return {
    stage: revenue > 0 ? "revenue" : "demand",
    score: revenue > 0 ? 95 : 10,
    bottleneck: revenue > 0 ? "Цикл доведён до денег" : "Недостаточно сигналов спроса",
    next_action: revenue > 0
      ? "Масштабировать канал и повторить успешную связку"
      : "Добавить источники спроса и первые задачи",
  };
}

export function buildB2BPageDraft(input: B2BPageDraftInput): {
  title: string;
  meta_title: string;
  meta_description: string;
  slug: string;
  faq: Array<{ question: string; answer: string }>;
  content_draft: string;
  sections: Array<{ section_type: string; title: string; body: string }>;
} {
  const location = [input.district, input.city].filter(Boolean).join(", ");
  const title = `${input.serviceName}${location ? ` в ${location}` : ""}`;
  const price = input.priceFrom
    ? `Стоимость от ${input.priceFrom.toLocaleString("ru-RU")} ₽${input.priceTo ? ` до ${input.priceTo.toLocaleString("ru-RU")} ₽` : ""}.`
    : "Стоимость уточняется после короткой заявки.";
  const cta = input.cta || "Оставить заявку";
  const proof = input.proof?.length ? input.proof.join("; ") : "доказательства и отзывы добавляются из профиля компании";
  const reviews = input.reviews?.length ? input.reviews.join("; ") : "отзывы будут добавлены после проверки";
  const slug = title
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  const faq = [
    {
      question: `Сколько стоит ${input.serviceName.toLowerCase()}?`,
      answer: price,
    },
    {
      question: "Как быстро можно получить консультацию?",
      answer: "Оставьте заявку, администратор свяжется и предложит ближайшее доступное время.",
    },
    {
      question: "Почему стоит обратиться именно сюда?",
      answer: `${input.businessName}: ${proof}.`,
    },
  ];

  const contentDraft = [
    `${title} — страница для клиентов, которые уже ищут услугу и хотят быстро понять цену, сроки и следующий шаг.`,
    price,
    `Доверие: ${proof}.`,
    `Отзывы: ${reviews}.`,
    `Следующий шаг: ${cta}.`,
  ].join("\n\n");

  return {
    title,
    meta_title: `${title} — ${input.businessName}`,
    meta_description: `${title}: цена, FAQ, отзывы и быстрая заявка. ${price}`,
    slug,
    faq,
    content_draft: contentDraft,
    sections: [
      { section_type: "hero", title, body: `${price} ${cta}.` },
      { section_type: "price", title: "Цена", body: price },
      { section_type: "proof", title: "Доказательства", body: proof },
      { section_type: "reviews", title: "Отзывы", body: reviews },
      { section_type: "cta", title: "Запись", body: cta },
    ],
  };
}

export const LOCAL_SALES_EMPTY_STATE_TASKS = [
  "Добавить город, услуги и средний чек",
  "Добавить ссылки на Яндекс Карты, 2ГИС, Авито и сайт",
  "Добавить 3-5 конкурентов",
  "Занести первые потерянные обращения",
  "Сформировать 5-7 страниц под услуги и районы",
] as const;
