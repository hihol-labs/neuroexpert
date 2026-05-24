import { NextRequest, NextResponse } from "next/server";
import { buildResultLoopSummary } from "shared";
import {
  assertBusinessAccess,
  getAccessibleBusinessIds,
  getAdmin,
  getUser,
  toNumber,
  type JsonRecord,
} from "@/lib/demand-to-revenue-server";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const businessId = request.nextUrl.searchParams.get("business_id");
  const admin = getAdmin();

  if (businessId) {
    const access = await assertBusinessAccess(businessId, user.id);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const businessIds = businessId ? [businessId] : await getAccessibleBusinessIds(user.id);
  const [{ data: events }, { data: pageMetrics }, { data: leads }, { data: outcomes }, { data: lostLeads }] =
    await Promise.all([
      businessIds.length
        ? admin.from("result_loop_events").select("*").in("business_id", businessIds).order("created_at", { ascending: false }).limit(200)
        : admin.from("result_loop_events").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(200),
      admin.from("page_metrics").select("*").eq("expert_id", user.id),
      admin.from("leads").select("*").eq("expert_id", user.id),
      businessIds.length
        ? admin.from("lead_outcomes").select("*").in("business_id", businessIds)
        : { data: [] },
      businessIds.length
        ? admin.from("lost_leads").select("*").in("business_id", businessIds)
        : { data: [] },
    ]);

  const eventRows = (events ?? []) as JsonRecord[];
  const metricRows = (pageMetrics ?? []) as JsonRecord[];
  const leadRows = (leads ?? []) as JsonRecord[];
  const outcomeRows = (outcomes ?? []) as JsonRecord[];
  const lostRows = (lostLeads ?? []) as JsonRecord[];

  const summary = buildResultLoopSummary({
    demandFound: eventRows.filter((item) => item.event_type === "demand_found").length,
    tasksCreated: eventRows.filter((item) => item.event_type === "task_created").length,
    pagesPublished:
      eventRows.filter((item) => ["published", "updated"].includes(String(item.event_type))).length +
      metricRows.length,
    views: metricRows.reduce((sum, item) => sum + toNumber(item.views), 0),
    clicks: metricRows.reduce((sum, item) => sum + toNumber(item.cta_clicks), 0),
    leads: leadRows.length + outcomeRows.filter((item) => ["new_lead", "qualified", "booked"].includes(String(item.outcome_type))).length,
    revenue:
      leadRows.reduce((sum, item) => sum + toNumber(item.revenue_amount), 0) +
      outcomeRows.reduce((sum, item) => sum + toNumber(item.amount), 0),
    lostRevenue: lostRows.reduce((sum, item) => sum + toNumber(item.potential_revenue), 0),
  });

  return NextResponse.json({
    summary,
    events: eventRows,
    metrics: {
      views: metricRows.reduce((sum, item) => sum + toNumber(item.views), 0),
      clicks: metricRows.reduce((sum, item) => sum + toNumber(item.cta_clicks), 0),
      leads: leadRows.length,
      revenue: leadRows.reduce((sum, item) => sum + toNumber(item.revenue_amount), 0),
      lost_revenue: lostRows.reduce((sum, item) => sum + toNumber(item.potential_revenue), 0),
    },
  });
}
