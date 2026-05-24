import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  LOCAL_SALES_EMPTY_STATE_TASKS,
  buildMachineReadableProfile,
  calculateDemandOpportunityScore,
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

async function enqueueLocalSalesJob(
  type: string,
  payload: JsonRecord,
  priority = 5,
) {
  const admin = getAdmin();
  return admin
    .from("jobs")
    .insert({
      type,
      payload,
      status: "pending",
      priority,
      scheduled_at: new Date().toISOString(),
    })
    .select("id")
    .single();
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function avg(values: number[]): number {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

async function getUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function getAccessibleBusinessIds(
  admin: ReturnType<typeof getAdmin>,
  userId: string,
): Promise<string[]> {
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

async function assertBusinessAccess(
  admin: ReturnType<typeof getAdmin>,
  businessId: string,
  userId: string,
) {
  const { data: account } = await admin
    .from("business_accounts")
    .select("*")
    .eq("id", businessId)
    .single();

  if (!account) return null;
  if (account.owner_id === userId) return account as JsonRecord;

  const { data: membership } = await admin
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .single();

  return membership ? (account as JsonRecord) : null;
}

function buildOverview(account: JsonRecord, data: Record<string, JsonRecord[]>) {
  const localProfiles = data.local_profiles ?? [];
  const lostLeads = data.lost_leads ?? [];
  const leadOutcomes = data.lead_outcomes ?? [];
  const tasks = data.growth_tasks ?? [];
  const competitors = data.local_competitors ?? [];

  const visibilityScore = avg(
    localProfiles.map((item) => toNumber(item.visibility_score)),
  );
  const conversionScore = avg(
    localProfiles.map((item) => toNumber(item.conversion_score)),
  );
  const reviewScore = avg(
    localProfiles
      .filter((item) => item.rating)
      .map((item) => Math.min(100, (toNumber(item.rating) / 5) * 100)),
  );
  const aiVisibilityScore = Math.max(
    avg(competitors.map((item) => toNumber(item.ai_visibility_score))),
    avg(
      localProfiles
        .filter((item) => item.channel === "ai_answer")
        .map((item) => toNumber(item.visibility_score)),
    ),
  );

  const openLostLeads = lostLeads.filter((lead) =>
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
    localVisibilityScore: visibilityScore,
    reviewScore,
    conversionScore,
    aiVisibilityScore,
    lostLeadRecoveryScore,
    taskCompletionScore,
  });

  const avgCheck = toNumber(account.avg_check);
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

  return {
    local_sales_index: localSalesIndex,
    scores: {
      local_visibility: Math.round(visibilityScore),
      reviews: Math.round(reviewScore),
      conversion: Math.round(conversionScore),
      ai_visibility: Math.round(aiVisibilityScore),
      lost_lead_recovery: Math.round(lostLeadRecoveryScore),
      task_completion: Math.round(taskCompletionScore),
    },
    counters: {
      locations: data.business_locations?.length ?? 0,
      channels: localProfiles.length,
      competitors: competitors.length,
      local_queries: data.local_queries?.length ?? 0,
      open_lost_leads: openLostLeads.length,
      open_tasks: tasks.filter((task) => task.status !== "done").length,
      weekly_reports: data.local_weekly_reports?.length ?? 0,
      behavior_signals: data.behavior_signals?.length ?? 0,
      generated_pages: data.local_generated_pages?.length ?? 0,
    },
    money: {
      estimated_lost_revenue: Math.round(lostRevenue),
      recovered_revenue: Math.round(
        lostLeads.reduce(
          (sum, lead) => sum + toNumber(lead.recovered_revenue),
          0,
        ),
      ),
      revenue_won: Math.round(
        leadOutcomes.reduce(
          (sum, outcome) => sum + toNumber(outcome.amount),
          0,
        ),
      ),
    },
    empty_state_tasks: LOCAL_SALES_EMPTY_STATE_TASKS,
  };
}

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdmin();
  const accessibleIds = await getAccessibleBusinessIds(admin, user.id);

  if (!accessibleIds.length) {
    return NextResponse.json({
      businesses: [],
      active_business: null,
      overview: null,
      data: {},
      empty_state_tasks: LOCAL_SALES_EMPTY_STATE_TASKS,
    });
  }

  const requestedBusinessId = request.nextUrl.searchParams.get("business_id");
  const businessId =
    requestedBusinessId && accessibleIds.includes(requestedBusinessId)
      ? requestedBusinessId
      : accessibleIds[0];

  const [
    { data: businesses },
    { data: locations },
    { data: localProfiles },
    { data: competitors },
    { data: localQueries },
    { data: visibilityChecks },
    { data: reviews },
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
      .in("id", accessibleIds)
      .order("created_at", { ascending: false }),
    admin
      .from("business_locations")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false }),
    admin
      .from("local_profiles")
      .select("*")
      .eq("business_id", businessId)
      .order("channel"),
    admin
      .from("local_competitors")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false }),
    admin
      .from("local_queries")
      .select("*")
      .eq("business_id", businessId)
      .order("priority_score", { ascending: false })
      .limit(30),
    admin
      .from("local_visibility_checks")
      .select("*")
      .eq("business_id", businessId)
      .order("collected_at", { ascending: false })
      .limit(30),
    admin
      .from("local_reviews")
      .select("*")
      .eq("business_id", businessId)
      .order("collected_at", { ascending: false })
      .limit(30),
    admin
      .from("lost_leads")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("lead_outcomes")
      .select("*")
      .eq("business_id", businessId)
      .order("occurred_at", { ascending: false })
      .limit(50),
    admin
      .from("growth_tasks")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("local_weekly_reports")
      .select("*")
      .eq("business_id", businessId)
      .order("period_end", { ascending: false })
      .limit(8),
    admin
      .from("behavior_signals")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("local_generated_pages")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("channel_unit_economics")
      .select("*")
      .eq("business_id", businessId)
      .order("period_end", { ascending: false })
      .limit(30),
  ]);

  const activeBusiness = (businesses ?? []).find(
    (business) => business.id === businessId,
  ) as JsonRecord | undefined;

  const data = {
    business_locations: (locations ?? []) as JsonRecord[],
    local_profiles: (localProfiles ?? []) as JsonRecord[],
    local_competitors: (competitors ?? []) as JsonRecord[],
    local_queries: (localQueries ?? []) as JsonRecord[],
    local_visibility_checks: (visibilityChecks ?? []) as JsonRecord[],
    local_reviews: (reviews ?? []) as JsonRecord[],
    lost_leads: (lostLeads ?? []) as JsonRecord[],
    lead_outcomes: (leadOutcomes ?? []) as JsonRecord[],
    growth_tasks: (tasks ?? []) as JsonRecord[],
    local_weekly_reports: (reports ?? []) as JsonRecord[],
    behavior_signals: (behaviorSignals ?? []) as JsonRecord[],
    local_generated_pages: (generatedPages ?? []) as JsonRecord[],
    channel_unit_economics: (unitEconomics ?? []) as JsonRecord[],
  };
  const overview = activeBusiness ? buildOverview(activeBusiness, data) : null;

  if (overview) {
    await admin
      .from("business_accounts")
      .update({ local_sales_index: overview.local_sales_index })
      .eq("id", businessId);
  }

  return NextResponse.json({
    businesses: businesses ?? [],
    active_business: activeBusiness ?? null,
    overview,
    data,
  });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: JsonRecord;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action || "");
  const admin = getAdmin();

  try {
    if (action === "business_account") {
      const name = String(body.name || "").trim();
      if (!name) {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
      }

      const services = toStringArray(body.services);
      const machineProfile = buildMachineReadableProfile({
        name,
        type: "business",
        url: typeof body.website === "string" ? body.website : null,
        city: typeof body.city === "string" ? body.city : null,
        services,
        priceFrom: toNumber(body.avg_check) || null,
        proof: { source: "owner_input" },
        sla: typeof body.sla === "string" ? body.sla : null,
      });

      const { data, error } = await admin
        .from("business_accounts")
        .insert({
          owner_id: user.id,
          name,
          slug: body.slug || null,
          legal_name: body.legal_name || null,
          niche: body.niche || null,
          city: body.city || null,
          website: body.website || null,
          avg_check: toNumber(body.avg_check) || null,
          current_leads_month: toNumber(body.current_leads_month) || null,
          machine_profile: machineProfile,
          proof_of_business: body.proof_of_business || {},
          status: body.status || "onboarding",
          source: body.source || "manual",
        })
        .select("*")
        .single();

      if (error) throw error;

      await admin.from("business_members").insert({
        business_id: data.id,
        user_id: user.id,
        role: "owner",
      });

      return NextResponse.json({ ok: true, data });
    }

    const businessId = String(body.business_id || "");
    if (!businessId) {
      return NextResponse.json(
        { error: "business_id is required" },
        { status: 400 },
      );
    }

    const account = await assertBusinessAccess(admin, businessId, user.id);
    if (!account) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "business_location") {
      const { data, error } = await admin
        .from("business_locations")
        .insert({
          business_id: businessId,
          name: body.name || account.name || "Основная точка",
          city: body.city || account.city || null,
          district: body.district || null,
          address: body.address || null,
          phone: body.phone || null,
          website: body.website || account.website || null,
          yandex_maps_url: body.yandex_maps_url || null,
          two_gis_url: body.two_gis_url || null,
          avito_url: body.avito_url || null,
          vk_url: body.vk_url || null,
          telegram_url: body.telegram_url || null,
          connection_status: body.connection_status || "manual",
          source: body.source || "manual",
        })
        .select("*")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, data });
    }

    if (action === "local_query") {
      const queryText = String(body.query_text || "").trim();
      if (!queryText) {
        return NextResponse.json(
          { error: "query_text is required" },
          { status: 400 },
        );
      }

      const priorityScore =
        toNumber(body.priority_score) ||
        calculateDemandOpportunityScore({
          monthlyVolume: toNumber(body.monthly_volume),
          trendScore: toNumber(body.trend_score),
          gapScore: toNumber(body.gap_score),
          commercialIntent: toNumber(body.commercial_intent, 0.5),
          aiVisibilityScore: toNumber(body.ai_visibility_score),
          confidence: toNumber(body.confidence, 0.7),
        });

      const { data, error } = await admin
        .from("local_queries")
        .insert({
          business_id: businessId,
          location_id: body.location_id || null,
          query_text: queryText,
          service_name: body.service_name || null,
          city: body.city || account.city || null,
          district: body.district || null,
          intent_type: body.intent_type || null,
          monthly_volume: toNumber(body.monthly_volume) || null,
          trend_score: toNumber(body.trend_score),
          trend_direction: body.trend_direction || null,
          gap_score: body.gap_score ?? null,
          competitor_visible: Boolean(body.competitor_visible),
          recommended_page_type: body.recommended_page_type || null,
          recommended_cta: body.recommended_cta || null,
          priority_score: priorityScore,
          source: body.source || "manual",
          source_url: body.source_url || null,
          confidence: toNumber(body.confidence, 0.7),
          is_manual: body.is_manual ?? true,
          raw_payload: body.raw_payload || {},
        })
        .select("*")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, data });
    }

    if (action === "local_profile") {
      const { data, error } = await admin
        .from("local_profiles")
        .upsert(
          {
            business_id: businessId,
            location_id: body.location_id || null,
            channel: body.channel || "website",
            profile_url: body.profile_url || null,
            rating: body.rating ?? null,
            reviews_count: toNumber(body.reviews_count) || null,
            photos_count: toNumber(body.photos_count) || null,
            services_count: toNumber(body.services_count) || null,
            visibility_score: toNumber(body.visibility_score),
            conversion_score: toNumber(body.conversion_score),
            connection_status: body.connection_status || "manual",
            source: body.source || "manual",
            source_url: body.source_url || null,
            confidence: toNumber(body.confidence, 0.7),
            is_manual: body.is_manual ?? true,
            raw_snapshot: body.raw_snapshot || {},
          },
          { onConflict: "business_id,location_id,channel" },
        )
        .select("*")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, data });
    }

    if (action === "competitor") {
      const name = String(body.name || "").trim();
      if (!name) {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
      }

      const { data, error } = await admin
        .from("local_competitors")
        .insert({
          business_id: businessId,
          name,
          website: body.website || null,
          city: body.city || account.city || null,
          channels: body.channels || {},
          strengths: body.strengths || [],
          weaknesses: body.weaknesses || [],
          offer_summary: body.offer_summary || null,
          trust_signals: body.trust_signals || [],
          ai_visibility_score: toNumber(body.ai_visibility_score),
          source: body.source || "manual",
          source_url: body.source_url || null,
          confidence: toNumber(body.confidence, 0.7),
        })
        .select("*")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, data });
    }

    if (action === "lost_lead") {
      const avgCheck = toNumber(body.avg_check, toNumber(account.avg_check));
      const conversionProbability = toNumber(body.conversion_probability, 0.2);
      const potentialRevenue =
        toNumber(body.potential_revenue) ||
        estimateLostRevenue({
          avgCheck,
          leadsCount: 1,
          conversionProbability,
        });

      const { data, error } = await admin
        .from("lost_leads")
        .insert({
          business_id: businessId,
          location_id: body.location_id || null,
          channel: body.channel || "phone",
          client_name: body.client_name || null,
          client_contact: body.client_contact || null,
          lead_status: body.lead_status || "missed",
          reason: body.reason || null,
          last_contact_at: body.last_contact_at || null,
          next_touch_at: body.next_touch_at || null,
          avg_check: avgCheck || null,
          conversion_probability: conversionProbability,
          potential_revenue: potentialRevenue,
          recovered_revenue: toNumber(body.recovered_revenue),
          ai_suggestion: body.ai_suggestion || null,
          source: body.source || "manual",
          source_url: body.source_url || null,
          confidence: toNumber(body.confidence, 0.7),
          is_manual: body.is_manual ?? true,
          raw_payload: body.raw_payload || {},
        })
        .select("*")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, data });
    }

    if (action === "lead_outcome") {
      const { data, error } = await admin
        .from("lead_outcomes")
        .insert({
          business_id: businessId,
          lost_lead_id: body.lost_lead_id || null,
          outcome_type: body.outcome_type || "new_lead",
          amount: toNumber(body.amount) || null,
          channel: body.channel || null,
          notes: body.notes || null,
          source: body.source || "manual",
          occurred_at: body.occurred_at || new Date().toISOString(),
          confidence: toNumber(body.confidence, 0.8),
        })
        .select("*")
        .single();
      if (error) throw error;

      if (body.lost_lead_id && ["recovered", "paid"].includes(String(body.outcome_type))) {
        await admin
          .from("lost_leads")
          .update({
            lead_status: "recovered",
            recovered_revenue: toNumber(body.amount),
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.lost_lead_id);
      }

      return NextResponse.json({ ok: true, data });
    }

    if (action === "growth_task") {
      const title = String(body.title || "").trim();
      if (!title) {
        return NextResponse.json({ error: "title is required" }, { status: 400 });
      }

      const { data, error } = await admin
        .from("growth_tasks")
        .insert({
          business_id: businessId,
          location_id: body.location_id || null,
          related_entity_type: body.related_entity_type || null,
          related_entity_id: body.related_entity_id || null,
          title,
          description: body.description || null,
          channel: body.channel || null,
          task_type: body.task_type || "manual",
          priority: body.priority || "medium",
          status: body.status || "todo",
          owner_id: body.owner_id || user.id,
          due_at: body.due_at || null,
          expected_impact: body.expected_impact || null,
          evidence: body.evidence || [],
          source: body.source || "manual",
        })
        .select("*")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, data });
    }

    if (action === "weekly_report") {
      const { data, error } = await admin
        .from("local_weekly_reports")
        .insert({
          business_id: businessId,
          period_start: body.period_start,
          period_end: body.period_end,
          summary: body.summary || "Еженедельный отчёт Local Sales OS",
          wins: body.wins || [],
          losses: body.losses || [],
          completed_tasks: body.completed_tasks || [],
          next_tasks: body.next_tasks || [],
          metrics: body.metrics || {},
          status: body.status || "draft",
          source: body.source || "manual",
        })
        .select("*")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, data });
    }

    if (action === "behavior_signal") {
      const summary = String(body.summary || "").trim();
      if (!summary) {
        return NextResponse.json(
          { error: "summary is required" },
          { status: 400 },
        );
      }

      const { data, error } = await admin
        .from("behavior_signals")
        .insert({
          business_id: businessId,
          content_id: body.content_id || null,
          signal_type: body.signal_type || "views_without_leads",
          severity: body.severity || "medium",
          summary,
          recommended_action: body.recommended_action || null,
          source: body.source || "manual",
          confidence: toNumber(body.confidence, 0.7),
          status: body.status || "open",
        })
        .select("*")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, data });
    }

    if (
      [
        "queue_daily_tasks",
        "queue_weekly_report",
        "queue_behavior_analysis",
        "queue_unit_economics",
      ].includes(action)
    ) {
      const jobType =
        action === "queue_daily_tasks"
          ? "generate_daily_growth_tasks"
          : action === "queue_weekly_report"
            ? "generate_local_weekly_report"
            : action === "queue_behavior_analysis"
              ? "analyze_behavior_signals"
              : "calculate_unit_economics";
      const { data, error } = await enqueueLocalSalesJob(
        jobType,
        { business_id: businessId, channels: body.channels, spend_by_channel: body.spend_by_channel },
        5,
      );
      if (error) throw error;
      return NextResponse.json({ ok: true, job_id: data.id, job_type: jobType });
    }

    return NextResponse.json(
      { error: "Unknown action", supported_actions: [
        "business_account",
        "business_location",
        "local_profile",
        "local_query",
        "competitor",
        "lost_lead",
        "lead_outcome",
        "growth_task",
        "weekly_report",
        "behavior_signal",
        "queue_daily_tasks",
        "queue_weekly_report",
        "queue_behavior_analysis",
        "queue_unit_economics",
      ] },
      { status: 400 },
    );
  } catch (err) {
    console.error("[local-sales] Error:", err);
    return NextResponse.json(
      { error: "Failed to process local sales request" },
      { status: 500 },
    );
  }
}
