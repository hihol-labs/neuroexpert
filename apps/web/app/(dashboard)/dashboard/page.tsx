import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { ArrowUpRight, CheckCircle2, Circle, Gauge, Layers3, Target, Users } from "lucide-react";
import { buildResultLoopSummary } from "shared";

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getDashboardData(userId: string) {
  const supabase = getSupabase();

  const [
    pubResult,
    leadsResult,
    profileResult,
    ordersResult,
    recentLeadsResult,
    contentListResult,
    pageMetricsResult,
    demandCountResult,
    resultLoopResult,
  ] = await Promise.all([
    supabase.from("content_packages").select("id", { count: "exact", head: true }).eq("expert_id", userId).eq("status", "published"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("expert_id", userId),
    supabase.from("profiles").select("trust_score, subscription_tier, full_name, bio, qualification").eq("id", userId).single(),
    supabase.from("orders").select("id, status, week_number, questions(question_text)").eq("expert_id", userId).in("status", ["pending", "accepted"]).order("created_at", { ascending: false }).limit(5),
    supabase.from("leads").select("id, client_name, client_contact, client_message, status, created_at").eq("expert_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("content_packages").select("id").eq("expert_id", userId),
    supabase.from("page_metrics").select("views, cta_views, cta_clicks, leads_count").eq("expert_id", userId),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("expert_id", userId).in("status", ["pending", "accepted"]),
    supabase.from("result_loop_events").select("*").eq("owner_id", userId).order("created_at", { ascending: false }).limit(100),
  ]);

  const profile = profileResult.data;
  const queryErrors = [
    pubResult,
    leadsResult,
    profileResult,
    ordersResult,
    recentLeadsResult,
    contentListResult,
    pageMetricsResult,
    demandCountResult,
    resultLoopResult,
  ].filter((result) => result.error).map((result) => result.error?.message || "Неизвестная ошибка источника данных");
  const hasProfile = !!(profile?.full_name && profile?.bio && profile?.qualification);
  const contentIds = (contentListResult.data ?? []).map((item) => item.id as string);
  const totalContent = contentIds.length;
  const { data: indexedRows, error: indexedError } = contentIds.length
    ? await supabase.from("serp_positions").select("content_id").in("content_id", contentIds)
    : { data: [], error: null };

  if (indexedError) queryErrors.push(indexedError.message || "Неизвестная ошибка источника индексации");

  const indexedCount = new Set((indexedRows ?? []).map((row) => row.content_id as string)).size;
  const pageMetrics = pageMetricsResult.data ?? [];
  const pageViews = pageMetrics.reduce((sum, row) => sum + ((row.views as number) ?? 0), 0);
  const ctaClicks = pageMetrics.reduce((sum, row) => sum + ((row.cta_clicks as number) ?? 0), 0);
  const metricLeads = pageMetrics.reduce((sum, row) => sum + ((row.leads_count as number) ?? 0), 0);
  const loopEvents = resultLoopResult.data ?? [];
  const resultLoop = buildResultLoopSummary({
    demandFound: demandCountResult.count ?? 0,
    tasksCreated: loopEvents.filter((row) => row.event_type === "task_created").length,
    pagesPublished: pubResult.count ?? 0,
    views: pageViews,
    clicks: ctaClicks,
    leads: leadsResult.count ?? 0,
    revenue: loopEvents.reduce((sum, row) => sum + ((row.amount as number) ?? 0), 0),
  });

  return {
    demandOpportunitiesCount: demandCountResult.count ?? 0,
    publishedCount: pubResult.count ?? 0,
    indexedCount,
    pageViews,
    ctaClicks,
    metricLeads,
    leadsCount: leadsResult.count ?? 0,
    trustScore: profile?.trust_score ?? 0,
    tier: profile?.subscription_tier ?? "free",
    recentOrders: ordersResult.data ?? [],
    recentLeads: recentLeadsResult.data ?? [],
    hasProfile,
    totalContent,
    queryErrors,
    trustBreakdown: [
      ["Proof", hasProfile ? 100 : 0],
      ["AI visibility", totalContent ? Math.round(Math.min(100, (indexedCount / Math.max(totalContent, 1)) * 100)) : 0],
      ["Demand", Math.min(100, (demandCountResult.count ?? 0) * 10)],
      ["Conversion", Math.min(100, (leadsResult.count ?? 0) * 12)],
    ],
    resultLoop,
  };
}

export default async function DashboardPage() {
  const { createClient } = await import("@/lib/supabase/server");
  const authClient = createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;

  const data = await getDashboardData(user.id);
  const activeLoopStage = { demand: 0, action: 1, traffic: 2, lead: 3, revenue: 5 }[data.resultLoop.stage] ?? 0;

  return (
    <div className="db-page">
      <header className="db-hero">
        <div>
          <p className="db-kicker"><span /> WORKSPACE / 01 · RESULT ROOM</p>
          <h1 className="db-title">Сигналы,<br /><em>которые двигают</em><br />практику.</h1>
          <p className="db-lede">Одна спокойная панель для спроса, контента и заявок. Сегодня важен следующий наблюдаемый шаг.</p>
        </div>
        <div className="db-hero-aside">
          <div><span className="db-online-dot" /> Signal Room online</div>
          <Link href="/orders" className="db-action">Найти возможность <ArrowUpRight /></Link>
        </div>
      </header>

      {data.queryErrors.length > 0 && (
        <section className="db-data-warning" role="status" aria-live="polite">
          <span>PARTIAL SIGNAL</span>
          <p>Часть источников временно недоступна. Показатели ниже могут быть неполными.</p>
          <small>{data.queryErrors.length} источника требуют повторной синхронизации.</small>
        </section>
      )}

      {/* Onboarding checklist — hide when all steps done */}
      {(!data.hasProfile || data.totalContent === 0 || data.publishedCount === 0) && (
        <section className="db-onboarding">
          <div className="db-panel-kicker">FIRST SIGNAL / SETUP</div>
          <h2>Соберите рабочий контур.</h2>
          <p>Пять шагов до первого устойчивого цикла спрос → ответ → заявка.</p>
          <div className="db-checklist">
            {[
              { done: true, label: "Зарегистрироваться", href: "" },
              { done: data.hasProfile, label: "Заполнить профиль", href: "/profile" },
              { done: data.demandOpportunitiesCount > 0, label: "Выбрать возможность спроса", href: "/orders" },
              { done: data.totalContent > 0, label: "Записать первый ответ", href: "/content/new" },
              { done: data.publishedCount > 0, label: "Опубликовать страницу", href: "/content" },
            ].map((step) => (
              <div key={step.label} className="db-check-item">
                {step.done ? (
                  <CheckCircle2 />
                ) : (
                  <Circle />
                )}
                {step.done || !step.href ? (
                  <span className={step.done ? "is-done" : ""}>{step.label}</span>
                ) : (
                  <Link href={step.href}>{step.label}<ArrowUpRight /></Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="db-stat-grid" aria-label="Ключевые показатели">
        {[
          ["01", "Возможности", data.demandOpportunitiesCount, "новые точки спроса"],
          ["02", "Публичные страницы", data.publishedCount, "готовы встречать трафик"],
          ["03", "Индексация", data.indexedCount, "страниц в сигнале"],
          ["04", "Просмотры", data.pageViews, "за всё время"],
          ["05", "Клики записи", data.ctaClicks, "сигнал намерения"],
          ["06", "Заявки", data.leadsCount, "контактов в контуре"],
        ].map(([index, label, value, note]) => (
          <article className="db-stat" key={String(index)}>
            <div className="db-stat-head"><span>{index}</span><i /></div>
            <p>{String(label)}</p>
            <strong>{String(value)}</strong>
            <small>{String(note)}</small>
          </article>
        ))}
      </section>

      <section className="db-result-grid">
        <article className="db-result-panel db-result-main">
          <header className="db-panel-head"><div><span className="db-panel-kicker">RESULT LOOP / LIVE</span><h2>От спроса к доверию.</h2></div><Gauge /></header>
          <p className="db-result-copy">{data.resultLoop.bottleneck}</p>
          <div className="db-flow" aria-label="Цикл результата">
            {["Спрос", "Ответ", "Страница", "Трафик", "Клик", "Заявка"].map((step, index) => <div key={step} className={index <= activeLoopStage ? "is-live" : ""}><span>0{index + 1}</span><b>{step}</b>{index < 5 && <i />}</div>)}
          </div>
          <div className="db-result-foot"><span>Следующий шаг</span><strong>{data.resultLoop.next_action}</strong><b>{data.resultLoop.score}<small>/100</small></b></div>
        </article>
        <article className="db-result-panel db-trust-panel">
          <header className="db-panel-head"><div><span className="db-panel-kicker">TRUST / SIGNAL</span><h2>Trust score</h2></div><Target /></header>
          <strong className="db-trust-score">{data.trustScore.toFixed(1)}<small>/ 100</small></strong>
          <div className="db-trust-bars">
            {data.trustBreakdown.map(([label, value]) => <div key={String(label)}><span>{String(label)}</span><b>{String(value)}</b><i><em style={{ width: `${Number(value)}%` }} /></i></div>)}
          </div>
          <Link href="/today" className="db-panel-link">Открыть карту доверия <ArrowUpRight /></Link>
        </article>
      </section>

      <section className="db-bottom-grid">
        <article className="db-list-panel">
          <header className="db-panel-head"><div><span className="db-panel-kicker">INBOX / DEMAND</span><h2>Возможности спроса</h2></div><Layers3 /></header>
          {data.recentOrders.length === 0 ? (
            <div className="db-empty"><span>NO SIGNAL</span><p>Возможностей спроса пока нет.</p><Link href="/orders">Открыть сбор спроса <ArrowUpRight /></Link></div>
          ) : (
            <div className="db-list">
              {data.recentOrders.map((o: Record<string, unknown>) => (
                <div key={o.id as string} className="db-list-row">
                  <span className="db-list-index">↗</span><p>{(o.questions as Record<string, string>)?.question_text ?? "Без вопроса"}</p><span className="db-status">{String(o.status)}</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/orders" className="db-panel-link">Все возможности <ArrowUpRight /></Link>
        </article>

        <article className="db-list-panel">
          <header className="db-panel-head"><div><span className="db-panel-kicker">INBOX / LEADS</span><h2>Последние заявки</h2></div><Users /></header>
          {data.recentLeads.length === 0 ? (
            <div className="db-empty"><span>AWAITING CONTACT</span><p>Заявок пока нет. Первый ответ создаёт точку входа.</p><Link href="/content/new">Записать ответ <ArrowUpRight /></Link></div>
          ) : (
            <div className="db-list">
              {data.recentLeads.map((l: Record<string, unknown>) => (
                <div key={l.id as string} className="db-list-row">
                  <span className="db-list-index">↗</span><div><p>{l.client_name as string}</p><small>{(l.client_message as string) || l.client_contact as string}</small></div><span className="db-status">{String(l.status)}</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/leads" className="db-panel-link">Открыть inbox <ArrowUpRight /></Link>
        </article>
      </section>
    </div>
  );
}
