import { NextRequest, NextResponse } from "next/server";
import { calculateUnitEconomics } from "shared";
import {
  assertBusinessAccess,
  enqueueJob,
  getAdmin,
  getUser,
  toNumber,
  type JsonRecord,
} from "@/lib/demand-to-revenue-server";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const businessId = request.nextUrl.searchParams.get("business_id");
  if (!businessId) return NextResponse.json({ error: "business_id is required" }, { status: 400 });
  const account = await assertBusinessAccess(businessId, user.id);
  if (!account) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getAdmin();
  const { data } = await admin
    .from("channel_unit_economics")
    .select("*")
    .eq("business_id", businessId)
    .order("period_end", { ascending: false });

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: JsonRecord;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const businessId = String(body.business_id || "");
  if (!businessId) return NextResponse.json({ error: "business_id is required" }, { status: 400 });
  const account = await assertBusinessAccess(businessId, user.id);
  if (!account) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (body.action === "queue_calculation") {
    const { data, error } = await enqueueJob(
      "calculate_unit_economics",
      { business_id: businessId, channels: body.channels, spend_by_channel: body.spend_by_channel },
      5,
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, job_id: data.id });
  }

  const channel = String(body.channel || "").trim();
  const periodStart = String(body.period_start || "").trim();
  const periodEnd = String(body.period_end || "").trim();
  if (!channel || !periodStart || !periodEnd) {
    return NextResponse.json({ error: "channel, period_start and period_end are required" }, { status: 400 });
  }

  const economics = calculateUnitEconomics({
    spend: toNumber(body.spend),
    clicks: toNumber(body.clicks),
    leads: toNumber(body.leads_count),
    customers: toNumber(body.customers_count),
    revenue: toNumber(body.revenue_amount),
  });

  const admin = getAdmin();
  const { data, error } = await admin
    .from("channel_unit_economics")
    .upsert(
      {
        owner_id: user.id,
        business_id: businessId,
        channel,
        period_start: periodStart,
        period_end: periodEnd,
        spend: toNumber(body.spend),
        impressions: toNumber(body.impressions),
        clicks: toNumber(body.clicks),
        leads_count: toNumber(body.leads_count),
        qualified_leads: toNumber(body.qualified_leads),
        customers_count: toNumber(body.customers_count),
        revenue_amount: toNumber(body.revenue_amount),
        ...economics,
        evidence: body.evidence || [],
        source: body.source || "manual",
        confidence: toNumber(body.confidence, 0.7),
        is_manual: body.is_manual ?? true,
      },
      { onConflict: "business_id,channel,period_start,period_end" },
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to save unit economics" }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
