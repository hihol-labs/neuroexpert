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

// --- Behavior signals (Этап 13 / BUG-3) -----------------------------------
// Чистая логика правил вынесена сюда, чтобы покрыть тестами (в apps/worker нет
// тест-харнеса). Покрывает 5 page-level правил из behavior_events. Шестое
// правило, lead_sla_risk, считается в worker из lost_leads (нужен запрос к БД).

export type BehaviorEventLike = {
  event_type?: string | null;
  content_id?: string | null;
  page_url?: string | null;
  session_hash?: string | null;
};

export type BehaviorSignalType =
  | "views_without_leads"
  | "cta_without_lead"
  | "phone_without_sale"
  | "faq_gap"
  | "high_intent_drop";

export type BehaviorSignalDraft = {
  key: string;
  signal_type: BehaviorSignalType;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  recommended_action: string;
  confidence: number;
};

/**
 * Превращает 7-дневный поток behavior_events в поведенческие сигналы.
 * Группирует события по странице (content_id || page_url) и применяет правила.
 * Несколько правил могут сработать на одной странице — это разные рекомендации.
 */
export function deriveBehaviorSignals(events: BehaviorEventLike[]): BehaviorSignalDraft[] {
  const groups = new Map<string, BehaviorEventLike[]>();
  for (const event of events) {
    const key = String(event.content_id || event.page_url || "unknown");
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  const signals: BehaviorSignalDraft[] = [];
  for (const [key, rows] of groups.entries()) {
    const count = (type: string) => rows.filter((row) => row.event_type === type).length;
    const views = count("view");
    const leads = count("form_submit");
    const phoneClicks = count("phone_click");
    const ctaClicks = count("cta_click");
    const formStarts = count("form_start");
    const routeClicks = count("route_click");
    const messengerClicks = count("messenger_click");
    const highIntent = formStarts + routeClicks + messengerClicks;
    const uniqueSessions = new Set(
      rows.map((row) => row.session_hash).filter((hash): hash is string => Boolean(hash)),
    ).size;

    // Без заявок — базовое условие для page-level правил.
    if (leads > 0) continue;

    if (views >= 30) {
      signals.push({
        key,
        signal_type: "views_without_leads",
        severity: views >= 100 ? "high" : "medium",
        summary: `Страница получила ${views} просмотров за 7 дней без заявки.`,
        recommended_action: "Усилить CTA, цену, FAQ, отзывы и форму заявки.",
        confidence: 0.75,
      });
    }

    if (phoneClicks >= 5) {
      signals.push({
        key,
        signal_type: "phone_without_sale",
        severity: "high",
        summary: `${phoneClicks} кликов по телефону без зафиксированной заявки.`,
        recommended_action: "Проверить пропущенные звонки, скрипт администратора и повторный контакт.",
        confidence: 0.7,
      });
    }

    if (ctaClicks >= 3) {
      signals.push({
        key,
        signal_type: "cta_without_lead",
        severity: ctaClicks >= 10 ? "high" : "medium",
        summary: `${ctaClicks} кликов по кнопке действия, но ни одной отправленной формы.`,
        recommended_action: "Упростить форму, сократить поля и добавить запасной канал (мессенджер, звонок).",
        confidence: 0.7,
      });
    }

    if (highIntent >= 4) {
      signals.push({
        key,
        signal_type: "high_intent_drop",
        severity: highIntent >= 10 ? "high" : "medium",
        summary: `${highIntent} действий с высоким намерением (форма/маршрут/мессенджер) без заявки.`,
        recommended_action: "Ускорить ответ, добавить онлайн-запись и скрипт сопровождения для горячих клиентов.",
        confidence: 0.7,
      });
    }

    if (views >= 20 && uniqueSessions > 0 && views / uniqueSessions >= 3) {
      signals.push({
        key,
        signal_type: "faq_gap",
        severity: "medium",
        summary: `Посетители возвращаются на страницу повторно (${views} просмотров на ${uniqueSessions} сессий) без заявки.`,
        recommended_action: "Добавить FAQ и развёрнутые ответы на повторяющиеся вопросы, чтобы закрыть сомнения.",
        confidence: 0.6,
      });
    }
  }

  return signals;
}

// --- Local Sales OS honest metrics (Этап 11.2) ------------------------------
// Нон-synthetic формулы вместо примитивного avg() и единый billing-нейтральный
// расчёт Overview. Раньше getLocalSalesData() (page.tsx) и buildOverview()
// (route.ts) держали две независимые копии — теперь единственный источник здесь.

function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function average(values: number[]): number {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function round1(value: number): number {
  return Math.round(clamp(value) * 10) / 10;
}

/** Каналы «Карты / площадки» — только они участвуют в Map Visibility. */
export const LOCAL_SALES_PLATFORM_CHANNELS = [
  "yandex_maps",
  "two_gis",
  "google_maps",
  "avito",
] as const;

/** Статусы lost_leads, считающиеся открытыми (лид ещё можно вернуть). */
export const LOCAL_SALES_OPEN_LEAD_STATUSES = [
  "new",
  "missed",
  "no_answer",
  "waiting_reply",
  "price_sent",
  "not_closed",
  "repeat_touch_needed",
  "lost",
] as const;

export type LocalSalesRow = Record<string, unknown>;

export type MapVisibilityProfileInput = {
  channel?: string | null;
  visibilityScore?: number | null;
  rating?: number | null;
  reviewsCount?: number | null;
  photosCount?: number | null;
  servicesCount?: number | null;
};

/**
 * Map Visibility: видимость на картах/площадках.
 * 60% — visibility_score профилей карт, 40% — заполненность профиля
 * (рейтинг, отзывы, ≥3 фото, услуги — по 25 очков). Не-картографические
 * каналы (website, phone, …) не учитываются. Нет профилей карт → 0.
 */
export function calculateMapVisibilityScore(
  profiles: MapVisibilityProfileInput[],
): number {
  const platformChannels: readonly string[] = LOCAL_SALES_PLATFORM_CHANNELS;
  const platform = profiles.filter((profile) =>
    platformChannels.includes(String(profile.channel ?? "")),
  );
  if (!platform.length) return 0;

  const perProfile = platform.map((profile) => {
    const base = clamp(safe(profile.visibilityScore));
    const completeness =
      (safe(profile.rating) > 0 ? 25 : 0) +
      (safe(profile.reviewsCount) > 0 ? 25 : 0) +
      (safe(profile.photosCount) >= 3 ? 25 : 0) +
      (safe(profile.servicesCount) > 0 ? 25 : 0);
    return base * 0.6 + completeness * 0.4;
  });

  return round1(average(perProfile));
}

export type ReviewHealthInput = {
  averageRating?: number | null;
  reviewsCount?: number | null;
  /** Доля отзывов с ответом бизнеса, 0-1. Не передан — вес уходит рейтингу/объёму. */
  respondedShare?: number | null;
  /** Доля свежих отзывов (≤90 дней), 0-1. Не передан — вес уходит рейтингу/объёму. */
  freshShare?: number | null;
};

/**
 * Review Health: рейтинг (60%) + объём отзывов по log10 (40%);
 * при наличии данных об ответах/свежести — они добавляются с весами 0.25/0.15
 * и сумма нормируется. 0 отзывов → 0. Объём: 10 отзывов ≈ 40, 100 ≈ 80.
 */
export function calculateReviewHealthScore(input: ReviewHealthInput): number {
  const count = Math.max(0, safe(input.reviewsCount));
  if (count === 0) return 0;

  const components: Array<{ value: number; weight: number }> = [
    { value: clamp((safe(input.averageRating) / 5) * 100), weight: 0.6 },
    { value: clamp(Math.log10(Math.max(count, 1)) * 40), weight: 0.4 },
  ];
  if (input.respondedShare != null) {
    components.push({
      value: clamp(Math.min(1, Math.max(0, safe(input.respondedShare))) * 100),
      weight: 0.25,
    });
  }
  if (input.freshShare != null) {
    components.push({
      value: clamp(Math.min(1, Math.max(0, safe(input.freshShare))) * 100),
      weight: 0.15,
    });
  }

  const totalWeight = components.reduce((sum, item) => sum + item.weight, 0);
  const score =
    components.reduce((sum, item) => sum + item.value * item.weight, 0) /
    totalWeight;
  return round1(score);
}

export type AvitoOpportunityInput = {
  hasAvitoProfile: boolean;
  avitoVisibilityScore?: number | null;
  localQueriesCount?: number | null;
  competitorsOnAvito?: number | null;
};

/**
 * Avito Opportunity: сколько спроса упускается на Авито (выше = больше упущено).
 * 50% — разрыв присутствия (нет профиля → 100), 30% — локальный спрос
 * (log10: 10 запросов ≈ 50, 100 ≈ 100), 20% — конкуренты уже на Авито (по 20 очков).
 */
export function calculateAvitoOpportunityScore(
  input: AvitoOpportunityInput,
): number {
  const demand = clamp(
    Math.log10(Math.max(safe(input.localQueriesCount), 1)) * 50,
  );
  const presenceGap = input.hasAvitoProfile
    ? clamp(100 - safe(input.avitoVisibilityScore))
    : 100;
  const competitorPressure = clamp(safe(input.competitorsOnAvito) * 20);

  return round1(presenceGap * 0.5 + demand * 0.3 + competitorPressure * 0.2);
}

export type ResponseSlaInput = {
  totalLeads?: number | null;
  /** Обращения, оставшиеся без ответа (missed / no_answer). */
  unansweredLeads?: number | null;
  avgResponseMinutes?: number | null;
};

/**
 * Response SLA: доля отвеченных обращений (60%) + скорость ответа (40%,
 * ≤15 мин → 100, ≥24 ч → 0, линейно между). Без данных о скорости — только
 * доля отвеченных. Нет обращений → 100 (нарушений SLA нет).
 */
export function calculateResponseSlaScore(input: ResponseSlaInput): number {
  const total = Math.max(0, safe(input.totalLeads));
  if (total === 0) return 100;

  const unanswered = Math.min(total, Math.max(0, safe(input.unansweredLeads)));
  const answeredScore = clamp((1 - unanswered / total) * 100);
  if (input.avgResponseMinutes == null) return round1(answeredScore);

  const minutes = Math.max(0, safe(input.avgResponseMinutes));
  const speedScore =
    minutes <= 15 ? 100 : clamp(100 - ((minutes - 15) / (1440 - 15)) * 100);
  return round1(answeredScore * 0.6 + speedScore * 0.4);
}

export type LocalPageOpportunityInput = {
  queriesCount?: number | null;
  generatedPagesCount?: number | null;
  publishedPagesCount?: number | null;
};

/**
 * Local Page Opportunity: непокрытый страницами локальный спрос,
 * масштабированный объёмом спроса (log10: ~9 запросов → 50%, 99+ → 100%).
 * Нет найденного спроса → 0 (нечего покрывать).
 */
export function calculateLocalPageOpportunityScore(
  input: LocalPageOpportunityInput,
): number {
  const queries = Math.max(0, safe(input.queriesCount));
  if (queries === 0) return 0;

  const generated = Math.max(0, safe(input.generatedPagesCount));
  const published = Math.min(
    generated,
    Math.max(0, safe(input.publishedPagesCount, generated)),
  );
  const uncovered = clamp((1 - Math.min(1, published / queries)) * 100);
  const demandScale = clamp(Math.log10(queries + 1) * 50) / 100;

  return round1(uncovered * demandScale);
}

export type BehaviorSignalLike = {
  severity?: string | null;
  status?: string | null;
};

const BEHAVIOR_SEVERITY_WEIGHT: Record<string, number> = {
  critical: 40,
  high: 25,
  medium: 15,
  low: 5,
};

/**
 * Behavior Opportunity: суммарный вес открытых поведенческих сигналов
 * (critical 40 / high 25 / medium 15 / low 5), cap 100. Закрытые
 * (resolved/dismissed/done) не учитываются.
 */
export function calculateBehaviorOpportunityScore(
  signals: BehaviorSignalLike[],
): number {
  const open = signals.filter((signal) =>
    ["open", "in_progress"].includes(String(signal.status ?? "open")),
  );
  const score = open.reduce(
    (sum, signal) =>
      sum + (BEHAVIOR_SEVERITY_WEIGHT[String(signal.severity ?? "medium")] ?? 15),
    0,
  );
  return round1(Math.min(100, score));
}

export type AiVisibilityInput = {
  competitorScores?: Array<number | null | undefined>;
  ownAiProfileScores?: Array<number | null | undefined>;
};

/**
 * AI Visibility: max(среднее ai_visibility_score конкурентов, среднее
 * visibility_score собственных ai_answer-профилей), с clamp 0-100.
 * Ровно прежняя inline-семантика из page.tsx/route.ts + отсутствовавший clamp.
 */
export function calculateAiVisibilityScore(input: AiVisibilityInput): number {
  const competitor = average(
    (input.competitorScores ?? []).map((value) => safe(value)),
  );
  const own = average(
    (input.ownAiProfileScores ?? []).map((value) => safe(value)),
  );
  return round1(Math.max(competitor, own));
}

export type LocalSalesOverviewData = {
  business_locations?: LocalSalesRow[];
  local_profiles?: LocalSalesRow[];
  local_competitors?: LocalSalesRow[];
  local_queries?: LocalSalesRow[];
  lost_leads?: LocalSalesRow[];
  lead_outcomes?: LocalSalesRow[];
  growth_tasks?: LocalSalesRow[];
  local_weekly_reports?: LocalSalesRow[];
  behavior_signals?: LocalSalesRow[];
  local_generated_pages?: LocalSalesRow[];
};

export type LocalSalesOverview = {
  local_sales_index: number;
  scores: {
    local_visibility: number;
    reviews: number;
    conversion: number;
    ai_visibility: number;
    lost_lead_recovery: number;
    task_completion: number;
    avito_opportunity: number;
    response_sla: number;
    local_page_opportunity: number;
    behavior_opportunity: number;
  };
  counters: {
    locations: number;
    channels: number;
    competitors: number;
    local_queries: number;
    open_lost_leads: number;
    open_tasks: number;
    weekly_reports: number;
    behavior_signals: number;
    generated_pages: number;
  };
  money: {
    estimated_lost_revenue: number;
    recovered_revenue: number;
    revenue_won: number;
  };
  empty_state_tasks: typeof LOCAL_SALES_EMPTY_STATE_TASKS;
};

/**
 * Единый расчёт Local Sales Overview для API-роута и dashboard-страницы.
 * Принимает сырые строки таблиц (service-role select) и business_account.
 */
export function buildLocalSalesOverview(
  account: LocalSalesRow,
  data: LocalSalesOverviewData,
): LocalSalesOverview {
  const profiles = data.local_profiles ?? [];
  const competitors = data.local_competitors ?? [];
  const queries = data.local_queries ?? [];
  const lostLeads = data.lost_leads ?? [];
  const leadOutcomes = data.lead_outcomes ?? [];
  const tasks = data.growth_tasks ?? [];
  const behaviorSignals = data.behavior_signals ?? [];
  const generatedPages = data.local_generated_pages ?? [];

  const mapVisibilityScore = calculateMapVisibilityScore(
    profiles.map((profile) => ({
      channel: typeof profile.channel === "string" ? profile.channel : null,
      visibilityScore: num(profile.visibility_score),
      rating: num(profile.rating),
      reviewsCount: num(profile.reviews_count),
      photosCount: num(profile.photos_count),
      servicesCount: num(profile.services_count),
    })),
  );

  const ratedProfiles = profiles.filter((profile) => num(profile.rating) > 0);
  const reviewScore = calculateReviewHealthScore({
    averageRating: average(ratedProfiles.map((profile) => num(profile.rating))),
    reviewsCount: profiles.reduce(
      (sum, profile) => sum + num(profile.reviews_count),
      0,
    ),
  });

  const conversionScore = clamp(
    average(profiles.map((profile) => num(profile.conversion_score))),
  );

  const aiVisibilityScore = calculateAiVisibilityScore({
    competitorScores: competitors.map((item) => num(item.ai_visibility_score)),
    ownAiProfileScores: profiles
      .filter((profile) => profile.channel === "ai_answer")
      .map((profile) => num(profile.visibility_score)),
  });

  const openLeadStatuses: readonly string[] = LOCAL_SALES_OPEN_LEAD_STATUSES;
  const openLostLeads = lostLeads.filter((lead) =>
    openLeadStatuses.includes(String(lead.lead_status)),
  );
  const recoveredLeads = lostLeads.filter(
    (lead) => lead.lead_status === "recovered",
  );
  const lostLeadRecoveryScore = lostLeads.length
    ? (recoveredLeads.length / lostLeads.length) * 100
    : 0;

  const taskCompletionScore = tasks.length
    ? (tasks.filter((task) => task.status === "done").length / tasks.length) *
      100
    : 0;

  const localSalesIndex = calculateLocalSalesIndex({
    localVisibilityScore: mapVisibilityScore,
    reviewScore,
    conversionScore,
    aiVisibilityScore,
    lostLeadRecoveryScore,
    taskCompletionScore,
  });

  const avitoProfile = profiles.find((profile) => profile.channel === "avito");
  const avitoOpportunityScore = calculateAvitoOpportunityScore({
    hasAvitoProfile: Boolean(avitoProfile),
    avitoVisibilityScore: avitoProfile
      ? num(avitoProfile.visibility_score)
      : null,
    localQueriesCount: queries.length,
    competitorsOnAvito: competitors.filter((item) =>
      Boolean(
        (item.channels as Record<string, unknown> | null | undefined)?.avito,
      ),
    ).length,
  });

  const responseSlaScore = calculateResponseSlaScore({
    totalLeads: lostLeads.length,
    unansweredLeads: lostLeads.filter((lead) =>
      ["missed", "no_answer"].includes(String(lead.lead_status)),
    ).length,
  });

  const localPageOpportunityScore = calculateLocalPageOpportunityScore({
    queriesCount: queries.length,
    generatedPagesCount: generatedPages.length,
    publishedPagesCount: generatedPages.filter(
      (page) => page.status === "published",
    ).length,
  });

  const behaviorOpportunityScore = calculateBehaviorOpportunityScore(
    behaviorSignals.map((signal) => ({
      severity: typeof signal.severity === "string" ? signal.severity : null,
      status: typeof signal.status === "string" ? signal.status : null,
    })),
  );

  const avgCheck = num(account.avg_check);
  const lostRevenue = openLostLeads.reduce((sum, lead) => {
    const explicit = num(lead.potential_revenue);
    if (explicit > 0) return sum + explicit;
    return (
      sum +
      estimateLostRevenue({
        avgCheck: num(lead.avg_check, avgCheck),
        leadsCount: 1,
        conversionProbability: num(lead.conversion_probability, 0.2),
      })
    );
  }, 0);

  return {
    local_sales_index: localSalesIndex,
    scores: {
      local_visibility: Math.round(mapVisibilityScore),
      reviews: Math.round(reviewScore),
      conversion: Math.round(conversionScore),
      ai_visibility: Math.round(aiVisibilityScore),
      lost_lead_recovery: Math.round(lostLeadRecoveryScore),
      task_completion: Math.round(taskCompletionScore),
      avito_opportunity: Math.round(avitoOpportunityScore),
      response_sla: Math.round(responseSlaScore),
      local_page_opportunity: Math.round(localPageOpportunityScore),
      behavior_opportunity: Math.round(behaviorOpportunityScore),
    },
    counters: {
      locations: data.business_locations?.length ?? 0,
      channels: profiles.length,
      competitors: competitors.length,
      local_queries: queries.length,
      open_lost_leads: openLostLeads.length,
      open_tasks: tasks.filter((task) => task.status !== "done").length,
      weekly_reports: data.local_weekly_reports?.length ?? 0,
      behavior_signals: behaviorSignals.length,
      generated_pages: generatedPages.length,
    },
    money: {
      estimated_lost_revenue: Math.round(lostRevenue),
      recovered_revenue: Math.round(
        lostLeads.reduce((sum, lead) => sum + num(lead.recovered_revenue), 0),
      ),
      revenue_won: Math.round(
        leadOutcomes.reduce((sum, outcome) => sum + num(outcome.amount), 0),
      ),
    },
    empty_state_tasks: LOCAL_SALES_EMPTY_STATE_TASKS,
  };
}
