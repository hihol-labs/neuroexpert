const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildLocalSalesOverview,
  calculateAiVisibilityScore,
  calculateAvitoOpportunityScore,
  calculateBehaviorOpportunityScore,
  calculateLocalPageOpportunityScore,
  calculateLocalSalesIndex,
  calculateMapVisibilityScore,
  calculateResponseSlaScore,
  calculateReviewHealthScore,
  estimateLostRevenue,
} = require("../dist/demand-to-revenue.js");

// --- Map Visibility ---------------------------------------------------------

test("MapVisibility: нет профилей карт → 0", () => {
  assert.equal(calculateMapVisibilityScore([]), 0);
  assert.equal(
    calculateMapVisibilityScore([
      { channel: "website", visibilityScore: 90 },
      { channel: "phone", visibilityScore: 100 },
    ]),
    0,
  );
});

test("MapVisibility: полный профиль карты = 60% видимости + 40% заполненности", () => {
  const score = calculateMapVisibilityScore([
    {
      channel: "yandex_maps",
      visibilityScore: 50,
      rating: 4.8,
      reviewsCount: 12,
      photosCount: 5,
      servicesCount: 3,
    },
  ]);
  // 50*0.6 + 100*0.4 = 70
  assert.equal(score, 70);
});

test("MapVisibility: пустая заполненность режет счёт", () => {
  const score = calculateMapVisibilityScore([
    { channel: "two_gis", visibilityScore: 100 },
  ]);
  // 100*0.6 + 0*0.4 = 60
  assert.equal(score, 60);
});

// --- Review Health ----------------------------------------------------------

test("ReviewHealth: 0 отзывов → 0", () => {
  assert.equal(calculateReviewHealthScore({ averageRating: 5, reviewsCount: 0 }), 0);
});

test("ReviewHealth: рейтинг 5 и 100 отзывов → 92", () => {
  // 100*0.6 + log10(100)*40*0.4 = 60 + 32 = 92
  assert.equal(
    calculateReviewHealthScore({ averageRating: 5, reviewsCount: 100 }),
    92,
  );
});

test("ReviewHealth: respondedShare добавляется с нормировкой весов", () => {
  // (100*0.6 + 80*0.4 + 100*0.25) / 1.25 = 93.6
  assert.equal(
    calculateReviewHealthScore({
      averageRating: 5,
      reviewsCount: 100,
      respondedShare: 1,
    }),
    93.6,
  );
});

// --- Avito Opportunity ------------------------------------------------------

test("AvitoOpportunity: нет профиля и нет данных → 50 (разрыв присутствия)", () => {
  assert.equal(
    calculateAvitoOpportunityScore({ hasAvitoProfile: false }),
    50,
  );
});

test("AvitoOpportunity: сильный профиль без спроса → 0", () => {
  assert.equal(
    calculateAvitoOpportunityScore({
      hasAvitoProfile: true,
      avitoVisibilityScore: 100,
      localQueriesCount: 0,
      competitorsOnAvito: 0,
    }),
    0,
  );
});

test("AvitoOpportunity: максимум при отсутствии профиля, высоком спросе и конкурентах", () => {
  assert.equal(
    calculateAvitoOpportunityScore({
      hasAvitoProfile: false,
      localQueriesCount: 100,
      competitorsOnAvito: 5,
    }),
    100,
  );
});

// --- Response SLA -----------------------------------------------------------

test("ResponseSLA: нет обращений → 100", () => {
  assert.equal(calculateResponseSlaScore({ totalLeads: 0 }), 100);
});

test("ResponseSLA: все без ответа → 0, половина → 50", () => {
  assert.equal(
    calculateResponseSlaScore({ totalLeads: 10, unansweredLeads: 10 }),
    0,
  );
  assert.equal(
    calculateResponseSlaScore({ totalLeads: 10, unansweredLeads: 5 }),
    50,
  );
});

test("ResponseSLA: скорость ответа даёт 40% веса", () => {
  // answered 50*0.6 + speed(15мин=100)*0.4 = 70
  assert.equal(
    calculateResponseSlaScore({
      totalLeads: 10,
      unansweredLeads: 5,
      avgResponseMinutes: 15,
    }),
    70,
  );
  // speed(24ч) = 0 → 30
  assert.equal(
    calculateResponseSlaScore({
      totalLeads: 10,
      unansweredLeads: 5,
      avgResponseMinutes: 1440,
    }),
    30,
  );
});

// --- Local Page Opportunity -------------------------------------------------

test("PageOpportunity: нет найденного спроса → 0", () => {
  assert.equal(calculateLocalPageOpportunityScore({ queriesCount: 0 }), 0);
});

test("PageOpportunity: непокрытый спрос масштабируется объёмом", () => {
  // 9 запросов, 0 страниц: uncovered 100 * scale(log10(10)*50/100=0.5) = 50
  assert.equal(
    calculateLocalPageOpportunityScore({
      queriesCount: 9,
      generatedPagesCount: 0,
    }),
    50,
  );
  // 99 запросов, 0 страниц → 100
  assert.equal(
    calculateLocalPageOpportunityScore({
      queriesCount: 99,
      generatedPagesCount: 0,
    }),
    100,
  );
});

test("PageOpportunity: полное покрытие опубликованными → 0", () => {
  assert.equal(
    calculateLocalPageOpportunityScore({
      queriesCount: 9,
      generatedPagesCount: 9,
      publishedPagesCount: 9,
    }),
    0,
  );
});

// --- Behavior Opportunity ---------------------------------------------------

test("BehaviorOpportunity: пусто → 0, закрытые сигналы не считаются", () => {
  assert.equal(calculateBehaviorOpportunityScore([]), 0);
  assert.equal(
    calculateBehaviorOpportunityScore([
      { severity: "critical", status: "resolved" },
      { severity: "high", status: "dismissed" },
    ]),
    0,
  );
});

test("BehaviorOpportunity: веса severity и cap 100", () => {
  assert.equal(
    calculateBehaviorOpportunityScore([{ severity: "critical", status: "open" }]),
    40,
  );
  // 3×critical = 120 → cap 100
  assert.equal(
    calculateBehaviorOpportunityScore([
      { severity: "critical", status: "open" },
      { severity: "critical", status: "open" },
      { severity: "critical", status: "in_progress" },
    ]),
    100,
  );
  // Неизвестная severity → medium (15); отсутствующий status считается открытым
  assert.equal(calculateBehaviorOpportunityScore([{ severity: "weird" }]), 15);
});

// --- AI Visibility ----------------------------------------------------------

test("AiVisibility: max из среднего конкурентов и своих ai_answer-профилей", () => {
  assert.equal(calculateAiVisibilityScore({}), 0);
  assert.equal(
    calculateAiVisibilityScore({
      competitorScores: [40, 60],
      ownAiProfileScores: [80],
    }),
    80,
  );
});

test("AiVisibility: clamp сверху (раньше inline-дубль без clamp)", () => {
  assert.equal(calculateAiVisibilityScore({ competitorScores: [150] }), 100);
});

// --- Легаси-формулы (аудит: 0% покрытия) -------------------------------------

test("LocalSalesIndex: все компоненты 100 → 100", () => {
  assert.equal(
    calculateLocalSalesIndex({
      localVisibilityScore: 100,
      reviewScore: 100,
      conversionScore: 100,
      aiVisibilityScore: 100,
      lostLeadRecoveryScore: 100,
      taskCompletionScore: 100,
    }),
    100,
  );
});

test("estimateLostRevenue: чек × лиды × вероятность", () => {
  assert.equal(
    estimateLostRevenue({ avgCheck: 10000, leadsCount: 2, conversionProbability: 0.5 }),
    10000,
  );
});

// --- buildLocalSalesOverview -------------------------------------------------

test("Overview: пустые данные дают нулевой индекс и корректные дефолты", () => {
  const overview = buildLocalSalesOverview({}, {});
  assert.equal(overview.local_sales_index, 0);
  assert.equal(overview.scores.local_visibility, 0);
  assert.equal(overview.scores.response_sla, 100); // нет обращений — SLA чист
  assert.equal(overview.scores.avito_opportunity, 50); // нет профиля Авито
  assert.equal(overview.counters.open_lost_leads, 0);
  assert.equal(overview.money.estimated_lost_revenue, 0);
  assert.equal(overview.empty_state_tasks.length, 5);
});

test("Overview: local_visibility считается только по каналам карт", () => {
  const overview = buildLocalSalesOverview(
    {},
    {
      local_profiles: [
        { channel: "website", visibility_score: 90, conversion_score: 40 },
        {
          channel: "yandex_maps",
          visibility_score: 50,
          rating: 5,
          reviews_count: 10,
          photos_count: 5,
          services_count: 2,
          conversion_score: 60,
        },
      ],
    },
  );
  // Только yandex_maps: 50*0.6 + 100*0.4 = 70 (website 90 не подмешан)
  assert.equal(overview.scores.local_visibility, 70);
  // conversion — среднее по всем профилям: (40+60)/2 = 50
  assert.equal(overview.scores.conversion, 50);
});

test("Overview: money и counters совпадают с прежней семантикой route.ts", () => {
  const overview = buildLocalSalesOverview(
    { avg_check: 10000 },
    {
      lost_leads: [
        { lead_status: "missed", potential_revenue: 5000 },
        { lead_status: "no_answer", conversion_probability: 0.5 }, // estimate: 10000*1*0.5
        { lead_status: "recovered", recovered_revenue: 7000 },
      ],
      lead_outcomes: [{ amount: 12000 }, { amount: 3000 }],
      growth_tasks: [{ status: "done" }, { status: "todo" }],
    },
  );
  assert.equal(overview.counters.open_lost_leads, 2);
  assert.equal(overview.counters.open_tasks, 1);
  assert.equal(overview.money.estimated_lost_revenue, 10000); // 5000 + 5000
  assert.equal(overview.money.recovered_revenue, 7000);
  assert.equal(overview.money.revenue_won, 15000);
  assert.equal(overview.scores.task_completion, 50);
  // recovery: 1 из 3 → 33
  assert.equal(overview.scores.lost_lead_recovery, 33);
  // SLA: 2 из 3 без ответа → 33
  assert.equal(overview.scores.response_sla, 33);
});

test("Overview: индекс в диапазоне 0-100 и детерминирован", () => {
  const data = {
    local_profiles: [
      {
        channel: "avito",
        visibility_score: 80,
        rating: 4.5,
        reviews_count: 25,
        photos_count: 10,
        services_count: 4,
        conversion_score: 55,
      },
    ],
    local_queries: [{ id: 1 }, { id: 2 }, { id: 3 }],
    behavior_signals: [{ severity: "high", status: "open" }],
  };
  const first = buildLocalSalesOverview({ avg_check: 5000 }, data);
  const second = buildLocalSalesOverview({ avg_check: 5000 }, data);
  assert.deepEqual(first, second);
  assert.ok(first.local_sales_index >= 0 && first.local_sales_index <= 100);
  assert.ok(first.scores.avito_opportunity < 50); // профиль Авито есть → ниже базовых 50
  assert.equal(first.scores.behavior_opportunity, 25);
});
