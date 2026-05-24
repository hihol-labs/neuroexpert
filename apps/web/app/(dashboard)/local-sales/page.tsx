import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  PhoneMissed,
  TrendingUp,
} from "lucide-react";
import {
  LOCAL_SALES_EMPTY_STATE_TASKS,
  calculateLocalSalesIndex,
  estimateLostRevenue,
} from "shared";

type JsonRecord = Record<string, unknown>;

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function avg(values: number[]): number {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

async function getAccessibleBusinessIds(userId: string): Promise<string[]> {
  const admin = getAdmin();
  const [{ data: owned }, { data: memberships }] = await Promise.all([
    admin.from("business_accounts").select("id").eq("owner_id", userId),
    admin.from("business_members").select("business_id").eq("user_id", userId),
  ]);

  return Array.from(
    new Set([
      ...((owned ?? []).map((item) => item.id) as string[]),
      ...((memberships ?? []).map((item) => item.business_id) as string[]),
    ]),
  );
}

async function getLocalSalesData(userId: string) {
  const admin = getAdmin();
  const businessIds = await getAccessibleBusinessIds(userId);

  if (!businessIds.length) {
    return {
      businesses: [],
      activeBusiness: null,
      locations: [],
      profiles: [],
      competitors: [],
      queries: [],
      lostLeads: [],
      leadOutcomes: [],
      tasks: [],
      reports: [],
      behaviorSignals: [],
      generatedPages: [],
      unitEconomics: [],
      overview: null,
    };
  }

  const [
    { data: businesses },
    { data: locations },
    { data: profiles },
    { data: competitors },
    { data: queries },
    { data: lostLeads },
    { data: leadOutcomes },
    { data: tasks },
    { data: reports },
    { data: behaviorSignals },
    { data: generatedPages },
    { data: unitEconomics },
  ] = await Promise.all([
    admin
      .from("business_accounts")
      .select("*")
      .in("id", businessIds)
      .order("created_at", { ascending: false }),
    admin
      .from("business_locations")
      .select("*")
      .in("business_id", businessIds)
      .order("created_at", { ascending: false }),
    admin
      .from("local_profiles")
      .select("*")
      .in("business_id", businessIds),
    admin
      .from("local_competitors")
      .select("*")
      .in("business_id", businessIds)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("local_queries")
      .select("*")
      .in("business_id", businessIds)
      .order("priority_score", { ascending: false })
      .limit(20),
    admin
      .from("lost_leads")
      .select("*")
      .in("business_id", businessIds)
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("lead_outcomes")
      .select("*")
      .in("business_id", businessIds)
      .order("occurred_at", { ascending: false })
      .limit(30),
    admin
      .from("growth_tasks")
      .select("*")
      .in("business_id", businessIds)
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("local_weekly_reports")
      .select("*")
      .in("business_id", businessIds)
      .order("period_end", { ascending: false })
      .limit(6),
    admin
      .from("behavior_signals")
      .select("*")
      .in("business_id", businessIds)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("local_generated_pages")
      .select("*")
      .in("business_id", businessIds)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("channel_unit_economics")
      .select("*")
      .in("business_id", businessIds)
      .order("period_end", { ascending: false })
      .limit(20),
  ]);

  const activeBusiness = ((businesses ?? [])[0] ?? null) as JsonRecord | null;
  const activeId = activeBusiness?.id as string | undefined;
  const activeOnly = (rows: unknown[] | null | undefined) =>
    ((rows ?? []) as JsonRecord[]).filter((row) => row.business_id === activeId);

  const activeLocations = activeOnly(locations);
  const activeProfiles = activeOnly(profiles);
  const activeCompetitors = activeOnly(competitors);
  const activeQueries = activeOnly(queries);
  const activeLostLeads = activeOnly(lostLeads);
  const activeLeadOutcomes = activeOnly(leadOutcomes);
  const activeTasks = activeOnly(tasks);
  const activeReports = activeOnly(reports);
  const activeBehaviorSignals = activeOnly(behaviorSignals);
  const activeGeneratedPages = activeOnly(generatedPages);
  const activeUnitEconomics = activeOnly(unitEconomics);

  const localVisibilityScore = avg(
    activeProfiles.map((item) => toNumber(item.visibility_score)),
  );
  const reviewScore = avg(
    activeProfiles
      .filter((item) => item.rating)
      .map((item) => Math.min(100, (toNumber(item.rating) / 5) * 100)),
  );
  const conversionScore = avg(
    activeProfiles.map((item) => toNumber(item.conversion_score)),
  );
  const aiVisibilityScore = Math.max(
    avg(activeCompetitors.map((item) => toNumber(item.ai_visibility_score))),
    avg(
      activeProfiles
        .filter((item) => item.channel === "ai_answer")
        .map((item) => toNumber(item.visibility_score)),
    ),
  );
  const recovered = activeLostLeads.filter(
    (item) => item.lead_status === "recovered",
  ).length;
  const lostLeadRecoveryScore = activeLostLeads.length
    ? (recovered / activeLostLeads.length) * 100
    : 0;
  const taskCompletionScore = activeTasks.length
    ? (activeTasks.filter((item) => item.status === "done").length /
        activeTasks.length) *
      100
    : 0;

  const localSalesIndex = calculateLocalSalesIndex({
    localVisibilityScore,
    reviewScore,
    conversionScore,
    aiVisibilityScore,
    lostLeadRecoveryScore,
    taskCompletionScore,
  });

  const openLostLeads = activeLostLeads.filter((lead) =>
    [
      "new",
      "missed",
      "no_answer",
      "waiting_reply",
      "price_sent",
      "not_closed",
      "repeat_touch_needed",
      "lost",
    ].includes(String(lead.lead_status)),
  );
  const avgCheck = toNumber(activeBusiness?.avg_check);
  const lostRevenue = openLostLeads.reduce((sum, lead) => {
    const explicit = toNumber(lead.potential_revenue);
    if (explicit > 0) return sum + explicit;
    return (
      sum +
      estimateLostRevenue({
        avgCheck: toNumber(lead.avg_check, avgCheck),
        leadsCount: 1,
        conversionProbability: toNumber(lead.conversion_probability, 0.2),
      })
    );
  }, 0);
  const wonRevenue = activeLeadOutcomes.reduce(
    (sum, outcome) => sum + toNumber(outcome.amount),
    0,
  );

  return {
    businesses: (businesses ?? []) as JsonRecord[],
    activeBusiness,
    locations: activeLocations,
    profiles: activeProfiles,
    competitors: activeCompetitors,
    queries: activeQueries,
    lostLeads: activeLostLeads,
    leadOutcomes: activeLeadOutcomes,
    tasks: activeTasks,
    reports: activeReports,
    behaviorSignals: activeBehaviorSignals,
    generatedPages: activeGeneratedPages,
    unitEconomics: activeUnitEconomics,
    overview: {
      localSalesIndex,
      localVisibilityScore,
      reviewScore,
      conversionScore,
      aiVisibilityScore,
      lostLeadRecoveryScore,
      taskCompletionScore,
      openLostLeads: openLostLeads.length,
      lostRevenue,
      wonRevenue,
    },
  };
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{Math.round(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        <div
          className="h-2 rounded-full bg-blue-600"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Local Sales OS</h1>
        <p className="mt-1 text-sm text-gray-500">
          Кабинет локального спроса, задач роста и потерянной выручки.
        </p>
      </div>

      <div className="bg-white rounded-xl border p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <Building2 className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          B2B-аккаунт ещё не создан
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Минимальный запуск требует компании, города, услуг, каналов и первых
          сигналов по обращениям.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {LOCAL_SALES_EMPTY_STATE_TASKS.map((task) => (
            <div key={task} className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
              <span className="text-gray-700">{task}</span>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link
            href="/for-business"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Открыть B2B-страницу
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

    </div>
  );
}

export default async function LocalSalesPage() {
  const authClient = createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return null;

  const data = await getLocalSalesData(user.id);
  if (!data.activeBusiness || !data.overview) return <EmptyState />;

  const business = data.activeBusiness;
  const overview = data.overview;
  const openTasks = data.tasks.filter((task) => task.status !== "done");
  const urgentTasks = openTasks.filter((task) =>
    ["urgent", "high"].includes(String(task.priority)),
  );
  const latestReport = data.reports[0];

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Local Sales OS</h1>
          <p className="mt-1 text-sm text-gray-500">
            {String(business.name)}
            {business.city ? ` · ${String(business.city)}` : ""}
            {business.niche ? ` · ${String(business.niche)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge status={String(business.status || "draft")} />
          {typeof business.website === "string" && business.website && (
            <Link
              href={business.website}
              className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              target="_blank"
            >
              Сайт
            </Link>
          )}
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <Card>
          <CardTitle>Local Sales Index</CardTitle>
          <CardValue>{overview.localSalesIndex.toFixed(1)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Потерянные обращения</CardTitle>
          <CardValue>{overview.openLostLeads}</CardValue>
        </Card>
        <Card>
          <CardTitle>Потенциал возврата</CardTitle>
          <CardValue>{formatRub(overview.lostRevenue)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Деньги</CardTitle>
          <CardValue>{formatRub(overview.wonRevenue)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Задачи роста</CardTitle>
          <CardValue>{openTasks.length}</CardValue>
        </Card>
        <Card>
          <CardTitle>Локальный спрос</CardTitle>
          <CardValue>{data.queries.length}</CardValue>
        </Card>
        <Card>
          <CardTitle>B2B-страницы</CardTitle>
          <CardValue>{data.generatedPages.length}</CardValue>
        </Card>
      </div>

      <div className="mb-8 grid gap-6 xl:grid-cols-3">
        <div className="bg-white rounded-xl border p-6 xl:col-span-2">
          <div className="mb-5 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Контур результата</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ScoreBar label="Карты / площадки" value={overview.localVisibilityScore} />
            <ScoreBar label="Отзывы и доверие" value={overview.reviewScore} />
            <ScoreBar label="Конверсия страниц" value={overview.conversionScore} />
            <ScoreBar label="AI-видимость" value={overview.aiVisibilityScore} />
            <ScoreBar label="Возврат лидов" value={overview.lostLeadRecoveryScore} />
            <ScoreBar label="Выполнение задач" value={overview.taskCompletionScore} />
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="mb-5 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Следующие действия</h2>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-sm text-gray-500">Открытых задач нет.</p>
          ) : (
            <div className="space-y-3">
              {openTasks.slice(0, 5).map((task) => (
                <div key={String(task.id)} className="border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">
                      {String(task.title)}
                    </p>
                    <Badge status={String(task.priority)} />
                  </div>
                  {typeof task.channel === "string" && task.channel && (
                    <p className="mt-1 text-xs text-gray-500">
                      {task.channel}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          {urgentTasks.length > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Срочных задач: {urgentTasks.length}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="bg-white rounded-xl border p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Растущий спрос</h2>
            </div>
            <Link href="/orders" className="text-sm text-blue-600 hover:underline">
              Возможности
            </Link>
          </div>
          {data.queries.length === 0 ? (
            <p className="text-sm text-gray-500">Локальных запросов пока нет.</p>
          ) : (
            <div className="space-y-4">
              {data.queries.slice(0, 6).map((query) => (
                <div key={String(query.id)} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {String(query.query_text)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {query.service_name ? `${String(query.service_name)} · ` : ""}
                      {query.city ? String(query.city) : "город не указан"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {Math.round(toNumber(query.priority_score))}
                    </p>
                    <p className="text-xs text-gray-500">priority</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="mb-5 flex items-center gap-2">
            <PhoneMissed className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Lost leads</h2>
          </div>
          {data.lostLeads.length === 0 ? (
            <p className="text-sm text-gray-500">Потерянных обращений пока нет.</p>
          ) : (
            <div className="space-y-4">
              {data.lostLeads.slice(0, 6).map((lead) => (
                <div key={String(lead.id)} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {lead.client_name ? String(lead.client_name) : "Без имени"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {String(lead.channel)} · {String(lead.lead_status)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatRub(toNumber(lead.potential_revenue))}
                    </p>
                    <p className="text-xs text-gray-500">потенциал</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="mb-5 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Каналы и точки</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.locations.slice(0, 4).map((location) => (
              <div key={String(location.id)} className="rounded-lg border p-3">
                <p className="text-sm font-medium text-gray-900">
                  {String(location.name)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {[location.city, location.address].filter(Boolean).map(String).join(", ") ||
                    "адрес не указан"}
                </p>
              </div>
            ))}
            {data.profiles.slice(0, 4).map((profile) => (
              <div key={String(profile.id)} className="rounded-lg border p-3">
                <p className="text-sm font-medium text-gray-900">
                  {String(profile.channel)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Видимость {Math.round(toNumber(profile.visibility_score))}
                  {profile.rating ? ` · рейтинг ${String(profile.rating)}` : ""}
                </p>
              </div>
            ))}
          </div>
          {data.locations.length === 0 && data.profiles.length === 0 && (
            <p className="text-sm text-gray-500">Каналы ещё не заведены.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="mb-5 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Недельная динамика</h2>
          </div>
          {latestReport ? (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Badge status={String(latestReport.status)} />
                <span className="text-sm text-gray-500">
                  {String(latestReport.period_start)} — {String(latestReport.period_end)}
                </span>
              </div>
              <p className="text-sm text-gray-700">{String(latestReport.summary)}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Отчёт за неделю ещё не создан.</p>
          )}

          {data.behaviorSignals.length > 0 && (
            <div className="mt-5 border-t pt-5">
              <h3 className="mb-3 text-sm font-medium text-gray-900">
                Поведенческие сигналы
              </h3>
              <div className="space-y-3">
                {data.behaviorSignals.slice(0, 3).map((signal) => (
                  <div key={String(signal.id)} className="text-sm">
                    <div className="flex items-center gap-2">
                      <Badge status={String(signal.severity)} />
                      <span className="font-medium text-gray-900">
                        {String(signal.signal_type)}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-500">{String(signal.summary)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="mb-5 font-semibold text-gray-900">Карта потерь по каналам</h2>
          {["yandex_maps", "two_gis", "avito", "website", "reviews", "messenger", "phone"].map((channel) => {
            const lost = data.lostLeads.filter((lead) => lead.channel === channel);
            const amount = lost.reduce((sum, lead) => sum + toNumber(lead.potential_revenue), 0);
            return (
              <div key={channel} className="mb-3 flex items-center justify-between gap-4 last:mb-0">
                <span className="text-sm text-gray-700">{channel}</span>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{formatRub(amount)}</p>
                  <p className="text-xs text-gray-500">{lost.length} обращ.</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="mb-5 font-semibold text-gray-900">Генератор B2B-страниц</h2>
          {data.generatedPages.length === 0 ? (
            <p className="text-sm text-gray-500">
              Черновиков страниц пока нет. API `/api/local-sales/pages` создаёт страницу: услуга + район + цена + FAQ + отзывы + CTA.
            </p>
          ) : (
            <div className="space-y-3">
              {data.generatedPages.slice(0, 5).map((page) => (
                <div key={String(page.id)} className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">{String(page.title)}</p>
                    <Badge status={String(page.status)} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {String(page.service_name || "услуга")} · {String(page.city || business.city || "город")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="mb-5 font-semibold text-gray-900">Unit economics</h2>
          {data.unitEconomics.length === 0 ? (
            <p className="text-sm text-gray-500">
              CPL/CAC/CR/ROMI появятся после ручного ввода или job `calculate_unit_economics`.
            </p>
          ) : (
            <div className="space-y-3">
              {data.unitEconomics.slice(0, 5).map((row) => (
                <div key={String(row.id)} className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{String(row.channel)}</p>
                    <span className="text-sm font-semibold text-gray-900">{toNumber(row.romi).toFixed(1)}%</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    CPL {Math.round(toNumber(row.cpl))} ₽ · CAC {Math.round(toNumber(row.cac))} ₽ · CR {toNumber(row.cr).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
