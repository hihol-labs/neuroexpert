import {
  buildB2BPageDraft,
  buildResultLoopSummary,
  calculateUnitEconomics,
  estimateLostRevenue,
} from "shared";
import { supabase } from "../supabase.js";

type Row = Record<string, unknown>;

const OPEN_LOST_STATUSES = [
  "new",
  "missed",
  "no_answer",
  "waiting_reply",
  "price_sent",
  "not_closed",
  "repeat_touch_needed",
  "lost",
];

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nextDayIso(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

function weekStartEnd(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay() || 7;
  const start = new Date(now);
  start.setDate(now.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

async function getBusiness(businessId: string): Promise<Row> {
  const { data, error } = await supabase
    .from("business_accounts")
    .select("*")
    .eq("id", businessId)
    .single();
  if (error || !data) throw new Error(`Business ${businessId} not found`);
  return data as Row;
}

async function insertResultLoopEvent(payload: Row): Promise<void> {
  await supabase.from("result_loop_events").insert({
    source: "worker",
    confidence: 0.8,
    ...payload,
  });
}

async function createTask(input: {
  businessId: string;
  ownerId?: string | null;
  title: string;
  description?: string | null;
  channel?: string | null;
  taskType: string;
  priority: "low" | "medium" | "high" | "urgent";
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  evidence?: unknown[];
  expectedImpact?: string | null;
  playbookKey?: string | null;
  impactScore?: number;
}): Promise<boolean> {
  const { data: existing } = await supabase
    .from("growth_tasks")
    .select("id")
    .eq("business_id", input.businessId)
    .eq("title", input.title)
    .in("status", ["todo", "in_progress", "needs_review", "blocked"])
    .limit(1);

  if (existing?.length) return false;

  const { data, error } = await supabase
    .from("growth_tasks")
    .insert({
      business_id: input.businessId,
      related_entity_type: input.relatedEntityType,
      related_entity_id: input.relatedEntityId,
      title: input.title,
      description: input.description,
      channel: input.channel,
      task_type: input.taskType,
      priority: input.priority,
      status: "todo",
      owner_id: input.ownerId ?? null,
      due_at: nextDayIso(),
      expected_impact: input.expectedImpact,
      evidence: input.evidence ?? [],
      source: "worker",
      playbook_key: input.playbookKey,
      impact_score: input.impactScore ?? 0,
    })
    .select("id")
    .single();

  if (error) throw error;

  await insertResultLoopEvent({
    owner_id: input.ownerId,
    business_id: input.businessId,
    task_id: data.id,
    event_type: "task_created",
    channel: input.channel,
    payload: {
      title: input.title,
      task_type: input.taskType,
      priority: input.priority,
      playbook_key: input.playbookKey,
    },
  });

  return true;
}

export async function handleGenerateDailyGrowthTasks(
  payload: Record<string, unknown>,
): Promise<{ created: number }> {
  const businessId = payload.business_id as string;
  if (!businessId) throw new Error("business_id is required");

  const business = await getBusiness(businessId);
  const ownerId = business.owner_id as string;
  let created = 0;

  const [{ data: queries }, { data: behaviorSignals }, { data: lostLeads }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("local_queries")
        .select("*")
        .eq("business_id", businessId)
        .order("priority_score", { ascending: false })
        .limit(7),
      supabase
        .from("behavior_signals")
        .select("*")
        .eq("business_id", businessId)
        .in("status", ["open"])
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("lost_leads")
        .select("*")
        .eq("business_id", businessId)
        .in("lead_status", OPEN_LOST_STATUSES)
        .order("potential_revenue", { ascending: false })
        .limit(10),
      supabase
        .from("local_profiles")
        .select("*")
        .eq("business_id", businessId)
        .lt("visibility_score", 60)
        .limit(10),
    ]);

  for (const query of (queries ?? []) as Row[]) {
    const ok = await createTask({
      businessId,
      ownerId,
      title: `Создать или усилить страницу: ${String(query.query_text)}`,
      description: `Спрос подтверждён. Тип страницы: ${String(query.recommended_page_type || "service")}. CTA: ${String(query.recommended_cta || "Оставить заявку")}.`,
      channel: "website",
      taskType: "page",
      priority: toNumber(query.priority_score) >= 70 ? "high" : "medium",
      relatedEntityType: "local_query",
      relatedEntityId: query.id as string,
      expectedImpact: "Больше органических заявок из поиска и AI-ответов",
      evidence: [{ source: query.source, source_url: query.source_url, confidence: query.confidence }],
      playbookKey: "b2b_page_generator",
      impactScore: toNumber(query.priority_score),
    });
    if (ok) created++;
  }

  for (const signal of (behaviorSignals ?? []) as Row[]) {
    const ok = await createTask({
      businessId,
      ownerId,
      title: `Исправить поведенческий сигнал: ${String(signal.summary).slice(0, 90)}`,
      description: String(signal.recommended_action || signal.summary),
      channel: "website",
      taskType: "cro",
      priority: signal.severity === "critical" ? "urgent" : signal.severity === "high" ? "high" : "medium",
      relatedEntityType: "behavior_signal",
      relatedEntityId: signal.id as string,
      expectedImpact: "Уменьшить просмотры без заявки и усилить конверсию",
      evidence: [{ source: signal.source, confidence: signal.confidence }],
      playbookKey: "cro_audit",
      impactScore: signal.severity === "critical" ? 95 : signal.severity === "high" ? 80 : 55,
    });
    if (ok) {
      created++;
      await supabase.from("behavior_signals").update({ status: "task_created" }).eq("id", signal.id);
    }
  }

  for (const lead of (lostLeads ?? []) as Row[]) {
    const potentialRevenue =
      toNumber(lead.potential_revenue) ||
      estimateLostRevenue({
        avgCheck: toNumber(lead.avg_check, toNumber(business.avg_check)),
        leadsCount: 1,
        conversionProbability: toNumber(lead.conversion_probability, 0.2),
      });
    const ok = await createTask({
      businessId,
      ownerId,
      title: `Вернуть обращение: ${String(lead.client_name || lead.channel)}`,
      description: String(lead.ai_suggestion || "Связаться повторно, уточнить потребность и предложить следующий шаг."),
      channel: String(lead.channel || "phone"),
      taskType: "lost_lead",
      priority: potentialRevenue >= 50_000 ? "urgent" : potentialRevenue >= 15_000 ? "high" : "medium",
      relatedEntityType: "lost_lead",
      relatedEntityId: lead.id as string,
      expectedImpact: `Потенциальная выручка: ${Math.round(potentialRevenue)} ₽`,
      evidence: [{ source: lead.source, confidence: lead.confidence, potential_revenue: potentialRevenue }],
      playbookKey: "unit_economics",
      impactScore: Math.min(100, Math.round(potentialRevenue / 1000)),
    });
    if (ok) created++;
  }

  for (const profile of (profiles ?? []) as Row[]) {
    const ok = await createTask({
      businessId,
      ownerId,
      title: `Усилить канал ${String(profile.channel)}`,
      description: "Низкая видимость канала: добавить услуги, фото, цену, отзывы, FAQ и явный CTA.",
      channel: String(profile.channel),
      taskType: "profile",
      priority: "medium",
      relatedEntityType: "local_profile",
      relatedEntityId: profile.id as string,
      expectedImpact: "Рост локальной видимости и кликов в карточке",
      evidence: [{ source: profile.source, confidence: profile.confidence, visibility_score: profile.visibility_score }],
      playbookKey: "competitor_audit",
      impactScore: 60 - toNumber(profile.visibility_score),
    });
    if (ok) created++;
  }

  return { created };
}

export async function handleGenerateLocalWeeklyReport(
  payload: Record<string, unknown>,
): Promise<{ report_id: string; tasks_done: number; lost_revenue: number }> {
  const businessId = payload.business_id as string;
  if (!businessId) throw new Error("business_id is required");

  const business = await getBusiness(businessId);
  const { start, end } = weekStartEnd();

  const [{ data: tasks }, { data: lostLeads }, { data: outcomes }, { data: economics }, { data: resultEvents }] =
    await Promise.all([
      supabase.from("growth_tasks").select("*").eq("business_id", businessId),
      supabase.from("lost_leads").select("*").eq("business_id", businessId),
      supabase.from("lead_outcomes").select("*").eq("business_id", businessId),
      supabase.from("channel_unit_economics").select("*").eq("business_id", businessId).eq("period_start", start).eq("period_end", end),
      supabase.from("result_loop_events").select("*").eq("business_id", businessId).gte("created_at", `${start}T00:00:00.000Z`),
    ]);

  const doneTasks = ((tasks ?? []) as Row[]).filter((task) => task.status === "done");
  const openTasks = ((tasks ?? []) as Row[]).filter((task) => task.status !== "done");
  const openLost = ((lostLeads ?? []) as Row[]).filter((lead) => OPEN_LOST_STATUSES.includes(String(lead.lead_status)));
  const lostRevenue = openLost.reduce((sum, lead) => sum + toNumber(lead.potential_revenue), 0);
  const revenue = ((outcomes ?? []) as Row[]).reduce((sum, item) => sum + toNumber(item.amount), 0);
  const loopSummary = buildResultLoopSummary({
    demandFound: ((resultEvents ?? []) as Row[]).filter((item) => item.event_type === "demand_found").length,
    tasksCreated: ((tasks ?? []) as Row[]).length,
    pagesPublished: ((resultEvents ?? []) as Row[]).filter((item) => item.event_type === "published").length,
    leads: ((outcomes ?? []) as Row[]).filter((item) => ["new_lead", "qualified", "booked"].includes(String(item.outcome_type))).length,
    revenue,
    lostRevenue,
  });

  const summary = [
    `${String(business.name)}: недельный отчёт Local Sales OS.`,
    `Сделано задач: ${doneTasks.length}. В работе: ${openTasks.length}.`,
    `Потенциально потерянная выручка: ${Math.round(lostRevenue)} ₽.`,
    `Зафиксированная выручка: ${Math.round(revenue)} ₽.`,
    `Главный узкий участок: ${loopSummary.bottleneck}.`,
    `Следующее действие: ${loopSummary.next_action}.`,
  ].join(" ");

  const { data, error } = await supabase
    .from("local_weekly_reports")
    .insert({
      business_id: businessId,
      period_start: start,
      period_end: end,
      summary,
      wins: doneTasks.slice(0, 10),
      losses: openLost.slice(0, 10),
      completed_tasks: doneTasks,
      next_tasks: openTasks.slice(0, 10),
      metrics: {
        result_loop: loopSummary,
        unit_economics: economics ?? [],
        revenue,
        lost_revenue: lostRevenue,
      },
      status: "needs_review",
      source: "worker",
    })
    .select("id")
    .single();

  if (error) throw error;

  await insertResultLoopEvent({
    owner_id: business.owner_id,
    business_id: businessId,
    event_type: "report_sent",
    payload: { report_id: data.id, status: "needs_review" },
  });

  return {
    report_id: data.id,
    tasks_done: doneTasks.length,
    lost_revenue: Math.round(lostRevenue),
  };
}

export async function handleGenerateB2BPageDraft(
  payload: Record<string, unknown>,
): Promise<{ page_id: string; slug: string }> {
  const businessId = payload.business_id as string;
  const localQueryId = payload.local_query_id as string | undefined;
  if (!businessId) throw new Error("business_id is required");

  const business = await getBusiness(businessId);
  const { data: query } = localQueryId
    ? await supabase.from("local_queries").select("*").eq("id", localQueryId).eq("business_id", businessId).single()
    : await supabase.from("local_queries").select("*").eq("business_id", businessId).order("priority_score", { ascending: false }).limit(1).single();

  if (!query) throw new Error("local query not found");

  const { data: reviews } = await supabase
    .from("local_reviews")
    .select("text")
    .eq("business_id", businessId)
    .eq("sentiment", "positive")
    .limit(5);

  const draft = buildB2BPageDraft({
    businessName: String(business.name),
    serviceName: String((query as Row).service_name || (query as Row).query_text),
    city: ((query as Row).city as string | null) || (business.city as string | null),
    district: (query as Row).district as string | null,
    priceFrom: toNumber(payload.price_from, toNumber(business.avg_check)) || null,
    priceTo: toNumber(payload.price_to) || null,
    reviews: ((reviews ?? []) as Row[]).map((item) => String(item.text)).filter(Boolean),
    proof: [String(business.niche || ""), String(business.city || "")].filter(Boolean),
    cta: ((query as Row).recommended_cta as string) || "Оставить заявку",
  });

  const slug = `${draft.slug}-${String((query as Row).id).slice(0, 8)}`;
  const { data: page, error } = await supabase
    .from("local_generated_pages")
    .insert({
      business_id: businessId,
      local_query_id: (query as Row).id,
      title: draft.title,
      slug,
      service_name: (query as Row).service_name,
      city: (query as Row).city || business.city,
      district: (query as Row).district,
      price_from: toNumber(payload.price_from, toNumber(business.avg_check)) || null,
      price_to: toNumber(payload.price_to) || null,
      faq: draft.faq,
      reviews: reviews ?? [],
      proof: [{ source: "business_profile", value: business.proof_of_business ?? {} }],
      cta: ((query as Row).recommended_cta as string) || "Оставить заявку",
      content_draft: draft.content_draft,
      meta_title: draft.meta_title,
      meta_description: draft.meta_description,
      status: "needs_review",
      source: "worker",
      confidence: toNumber((query as Row).confidence, 0.8),
    })
    .select("id")
    .single();

  if (error) throw error;

  for (const [index, section] of draft.sections.entries()) {
    await supabase.from("local_page_sections").insert({
      page_id: page.id,
      section_type: section.section_type,
      title: section.title,
      body: section.body,
      sort_order: index,
    });
  }

  await createTask({
    businessId,
    ownerId: business.owner_id as string,
    title: `Проверить и опубликовать страницу: ${draft.title}`,
    description: "AI подготовил черновик страницы. Проверьте факты, цену, отзывы и CTA перед публикацией.",
    channel: "website",
    taskType: "page",
    priority: "high",
    relatedEntityType: "local_generated_page",
    relatedEntityId: page.id,
    expectedImpact: "Заявки из поиска и AI по локальному коммерческому спросу",
    evidence: [{ source: (query as Row).source, confidence: (query as Row).confidence }],
    playbookKey: "b2b_page_generator",
    impactScore: toNumber((query as Row).priority_score),
  });

  await supabase.from("marketing_review_queue").insert({
    owner_id: business.owner_id,
    business_id: businessId,
    entity_type: "local_generated_page",
    entity_id: page.id,
    title: `Review: ${draft.title}`,
    summary: "Проверить черновик B2B-страницы перед публикацией.",
    risk_level: "medium",
    status: "pending",
    ai_output: draft,
    source: "worker",
  });

  return { page_id: page.id, slug };
}

export async function handleAnalyzeBehaviorSignals(
  payload: Record<string, unknown>,
): Promise<{ signals_created: number }> {
  const businessId = payload.business_id as string;
  if (!businessId) throw new Error("business_id is required");

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: events } = await supabase
    .from("behavior_events")
    .select("*")
    .eq("business_id", businessId)
    .gte("occurred_at", since);

  const groups = new Map<string, Row[]>();
  for (const event of (events ?? []) as Row[]) {
    const key = String(event.content_id || event.page_url || "unknown");
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  let created = 0;
  for (const [key, rows] of groups.entries()) {
    const views = rows.filter((row) => row.event_type === "view").length;
    const leads = rows.filter((row) => row.event_type === "form_submit").length;
    const phoneClicks = rows.filter((row) => row.event_type === "phone_click").length;

    if (views >= 30 && leads === 0) {
      await supabase.from("behavior_signals").insert({
        business_id: businessId,
        content_id: key === "unknown" ? null : key,
        signal_type: "views_without_leads",
        severity: views >= 100 ? "high" : "medium",
        summary: `Страница получила ${views} просмотров за 7 дней без заявки.`,
        recommended_action: "Усилить CTA, цену, FAQ, отзывы и форму заявки.",
        source: "worker",
        confidence: 0.75,
      });
      created++;
    }

    if (phoneClicks >= 5 && leads === 0) {
      await supabase.from("behavior_signals").insert({
        business_id: businessId,
        content_id: key === "unknown" ? null : key,
        signal_type: "phone_without_sale",
        severity: "high",
        summary: `${phoneClicks} кликов по телефону без зафиксированной заявки.`,
        recommended_action: "Проверить пропущенные звонки, скрипт администратора и повторный контакт.",
        source: "worker",
        confidence: 0.7,
      });
      created++;
    }
  }

  return { signals_created: created };
}

export async function handleCalculateUnitEconomics(
  payload: Record<string, unknown>,
): Promise<{ upserted: number }> {
  const businessId = payload.business_id as string;
  if (!businessId) throw new Error("business_id is required");

  const business = await getBusiness(businessId);
  const { start, end } = weekStartEnd();
  const channels = (payload.channels as string[] | undefined) ?? [
    "website",
    "yandex_maps",
    "two_gis",
    "avito",
    "telegram",
    "phone",
  ];
  let upserted = 0;

  for (const channel of channels) {
    const [{ data: events }, { data: outcomes }] = await Promise.all([
      supabase
        .from("behavior_events")
        .select("*")
        .eq("business_id", businessId)
        .eq("channel", channel)
        .gte("occurred_at", `${start}T00:00:00.000Z`),
      supabase
        .from("lead_outcomes")
        .select("*")
        .eq("business_id", businessId)
        .eq("channel", channel)
        .gte("occurred_at", `${start}T00:00:00.000Z`),
    ]);

    const rows = (events ?? []) as Row[];
    const outcomeRows = (outcomes ?? []) as Row[];
    const clicks = rows.filter((row) => String(row.event_type).includes("click")).length;
    const leads = rows.filter((row) => row.event_type === "form_submit").length +
      outcomeRows.filter((row) => ["new_lead", "qualified", "booked"].includes(String(row.outcome_type))).length;
    const customers = outcomeRows.filter((row) => ["paid", "recovered", "repeat_purchase"].includes(String(row.outcome_type))).length;
    const revenue = outcomeRows.reduce((sum, row) => sum + toNumber(row.amount), 0);
    const spend = toNumber((payload.spend_by_channel as Record<string, unknown> | undefined)?.[channel]);
    const economics = calculateUnitEconomics({ spend, clicks, leads, customers, revenue });

    await supabase.from("channel_unit_economics").upsert(
      {
        owner_id: business.owner_id,
        business_id: businessId,
        channel,
        period_start: start,
        period_end: end,
        spend,
        impressions: rows.filter((row) => row.event_type === "view").length,
        clicks,
        leads_count: leads,
        qualified_leads: outcomeRows.filter((row) => row.outcome_type === "qualified").length,
        customers_count: customers,
        revenue_amount: revenue,
        ...economics,
        evidence: [{ source: "behavior_events", rows: rows.length }, { source: "lead_outcomes", rows: outcomeRows.length }],
        source: spend > 0 ? "manual" : "worker",
        confidence: rows.length || outcomeRows.length ? 0.75 : 0.5,
        is_manual: spend > 0,
      },
      { onConflict: "business_id,channel,period_start,period_end" },
    );
    upserted++;
  }

  return { upserted };
}

export async function handleGenerateAgencyReport(
  payload: Record<string, unknown>,
): Promise<{ report_id: string; export_id: string }> {
  const businessId = payload.business_id as string;
  const ownerId = payload.owner_id as string;
  if (!businessId) throw new Error("business_id is required");
  if (!ownerId) throw new Error("owner_id is required");

  const business = await getBusiness(businessId);
  const [{ data: queries }, { data: competitors }, { data: tasks }, { data: lostLeads }, { data: economics }] =
    await Promise.all([
      supabase.from("local_queries").select("*").eq("business_id", businessId).order("priority_score", { ascending: false }).limit(20),
      supabase.from("local_competitors").select("*").eq("business_id", businessId).limit(20),
      supabase.from("growth_tasks").select("*").eq("business_id", businessId).limit(30),
      supabase.from("lost_leads").select("*").eq("business_id", businessId).limit(30),
      supabase.from("channel_unit_economics").select("*").eq("business_id", businessId).order("period_end", { ascending: false }).limit(20),
    ]);

  const payloadData = {
    business,
    demand: queries ?? [],
    competitors: competitors ?? [],
    tasks: tasks ?? [],
    lost_leads: lostLeads ?? [],
    unit_economics: economics ?? [],
    freshness: {
      generated_at: new Date().toISOString(),
      confidence: 0.8,
      source: "worker",
      is_manual: false,
    },
  };

  const { data: report, error } = await supabase
    .from("agency_reports")
    .insert({
      owner_id: ownerId,
      business_id: businessId,
      report_type: payload.report_type || "local_sales_audit",
      title: payload.title || `White-label Local Sales Audit: ${String(business.name)}`,
      payload: payloadData,
      white_label: payload.white_label ?? true,
      status: "needs_review",
      source: "worker",
    })
    .select("id")
    .single();

  if (error) throw error;

  const token = `ar_${report.id.replaceAll("-", "").slice(0, 24)}`;
  const { data: exportRow, error: exportError } = await supabase
    .from("agency_report_exports")
    .insert({
      report_id: report.id,
      owner_id: ownerId,
      export_format: payload.export_format || "json",
      public_token: token,
      payload: payloadData,
      status: "ready",
    })
    .select("id")
    .single();

  if (exportError) throw exportError;

  return { report_id: report.id, export_id: exportRow.id };
}
