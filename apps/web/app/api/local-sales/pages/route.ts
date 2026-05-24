import { NextRequest, NextResponse } from "next/server";
import {
  assertBusinessAccess,
  enqueueJob,
  getAdmin,
  getUser,
  toNumber,
  type JsonRecord,
} from "@/lib/demand-to-revenue-server";
import { buildB2BPageDraft } from "shared";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const businessId = request.nextUrl.searchParams.get("business_id");
  if (!businessId) return NextResponse.json({ error: "business_id is required" }, { status: 400 });

  const account = await assertBusinessAccess(businessId, user.id);
  if (!account) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getAdmin();
  const [{ data: pages }, { data: queries }, { data: reviews }] = await Promise.all([
    admin
      .from("local_generated_pages")
      .select("*, local_page_sections(*)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false }),
    admin
      .from("local_queries")
      .select("*")
      .eq("business_id", businessId)
      .order("priority_score", { ascending: false })
      .limit(30),
    admin
      .from("local_page_result_reviews")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    pages: pages ?? [],
    opportunities: queries ?? [],
    result_reviews: reviews ?? [],
  });
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

  const action = String(body.action || "draft");
  const admin = getAdmin();

  if (action === "queue_generation") {
    const { data, error } = await enqueueJob(
      "generate_b2b_page_draft",
      {
        business_id: businessId,
        local_query_id: body.local_query_id || null,
        price_from: body.price_from || null,
        price_to: body.price_to || null,
      },
      4,
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, job_id: data.id });
  }

  const serviceName = String(body.service_name || body.query_text || "").trim();
  if (!serviceName) return NextResponse.json({ error: "service_name is required" }, { status: 400 });

  const draft = buildB2BPageDraft({
    businessName: String(account.name),
    serviceName,
    city: (body.city as string | null) || (account.city as string | null),
    district: body.district as string | null,
    priceFrom: toNumber(body.price_from, toNumber(account.avg_check)) || null,
    priceTo: toNumber(body.price_to) || null,
    reviews: Array.isArray(body.reviews) ? body.reviews.map(String) : [],
    proof: Array.isArray(body.proof) ? body.proof.map(String) : [],
    cta: (body.cta as string | null) || "Оставить заявку",
  });

  const { data: page, error } = await admin
    .from("local_generated_pages")
    .insert({
      business_id: businessId,
      local_query_id: body.local_query_id || null,
      title: draft.title,
      slug: `${draft.slug}-${Date.now().toString(36)}`,
      service_name: serviceName,
      city: body.city || account.city || null,
      district: body.district || null,
      price_from: toNumber(body.price_from, toNumber(account.avg_check)) || null,
      price_to: toNumber(body.price_to) || null,
      faq: draft.faq,
      reviews: body.reviews || [],
      proof: body.proof || [],
      cta: body.cta || "Оставить заявку",
      content_draft: draft.content_draft,
      meta_title: draft.meta_title,
      meta_description: draft.meta_description,
      status: "needs_review",
      source: "manual",
      confidence: 0.8,
      is_manual: true,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[local-sales/pages] create error:", error);
    return NextResponse.json({ error: "Failed to create page draft" }, { status: 500 });
  }

  for (const [index, section] of draft.sections.entries()) {
    await admin.from("local_page_sections").insert({
      page_id: page.id,
      section_type: section.section_type,
      title: section.title,
      body: section.body,
      sort_order: index,
    });
  }

  await admin.from("marketing_review_queue").insert({
    owner_id: user.id,
    business_id: businessId,
    entity_type: "local_generated_page",
    entity_id: page.id,
    title: `Review: ${draft.title}`,
    summary: "Проверить B2B-страницу перед публикацией.",
    risk_level: "medium",
    ai_output: draft,
    source: "local-sales/pages",
  });

  return NextResponse.json({ ok: true, data: page });
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
  const businessId = String(body.business_id || "");
  if (!id || !businessId) return NextResponse.json({ error: "id and business_id are required" }, { status: 400 });

  const account = await assertBusinessAccess(businessId, user.id);
  if (!account) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const patch: JsonRecord = {
    updated_at: new Date().toISOString(),
  };
  for (const key of [
    "title",
    "content_draft",
    "meta_title",
    "meta_description",
    "cta",
    "status",
    "decision_status",
    "metrics",
  ]) {
    if (key in body) patch[key] = body[key];
  }

  const admin = getAdmin();
  const { data, error } = await admin
    .from("local_generated_pages")
    .update(patch)
    .eq("id", id)
    .eq("business_id", businessId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update page" }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
