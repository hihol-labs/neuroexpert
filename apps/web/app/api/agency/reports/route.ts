import { NextRequest, NextResponse } from "next/server";
import {
  assertBusinessAccess,
  enqueueJob,
  getAdmin,
  getUser,
  type JsonRecord,
} from "@/lib/demand-to-revenue-server";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const businessId = params.get("business_id");
  const admin = getAdmin();
  let query = admin
    .from("agency_reports")
    .select("*, agency_report_exports(*)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (businessId) query = query.eq("business_id", businessId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
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

  if (body.action === "queue_generation") {
    const { data, error } = await enqueueJob(
      "generate_agency_report",
      {
        owner_id: user.id,
        business_id: businessId,
        report_type: body.report_type || "local_sales_audit",
        title: body.title,
        white_label: body.white_label ?? true,
        export_format: body.export_format || "json",
      },
      6,
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, job_id: data.id });
  }

  const admin = getAdmin();
  const { data: report, error } = await admin
    .from("agency_reports")
    .insert({
      owner_id: user.id,
      business_id: businessId,
      report_type: body.report_type || "local_sales_audit",
      title: body.title || `White-label Local Sales Audit: ${String(account.name)}`,
      payload: body.payload || {},
      white_label: body.white_label ?? true,
      status: body.status || "draft",
      source: body.source || "manual",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to create report" }, { status: 500 });

  return NextResponse.json({ ok: true, data: report });
}

export async function PATCH(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: JsonRecord;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const patch: JsonRecord = { updated_at: new Date().toISOString() };
  for (const key of ["title", "payload", "white_label", "status"]) {
    if (key in body) patch[key] = body[key];
  }

  const admin = getAdmin();
  const { data, error } = await admin
    .from("agency_reports")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
