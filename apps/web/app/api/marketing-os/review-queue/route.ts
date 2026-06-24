import { NextRequest, NextResponse } from "next/server";
import { reviewMutationDecision } from "shared";
import {
  assertBusinessAccess,
  getAccessibleBusinessIds,
  getAdmin,
  getUser,
  type JsonRecord,
} from "@/lib/demand-to-revenue-server";

const STATUSES = new Set(["pending", "approved", "rejected", "changes_requested", "published", "archived"]);

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const status = params.get("status") || "pending";
  const businessIds = await getAccessibleBusinessIds(user.id);
  const admin = getAdmin();

  // user.id и businessIds — UUID из Supabase Auth/БД (формат [0-9a-f-]{36}), безопасны для PostgREST .or().
  // Если источник id сменится — добавить валидацию формата перед интерполяцией.
  let query = admin
    .from("marketing_review_queue")
    .select("*")
    .or(`owner_id.eq.${user.id}${businessIds.length ? `,business_id.in.(${businessIds.join(",")})` : ""}`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query;

  if (error) return NextResponse.json({ error: "Failed to load review queue" }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
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
  const status = String(body.status || "");
  if (!id || !STATUSES.has(status)) return NextResponse.json({ error: "id and valid status are required" }, { status: 400 });

  const admin = getAdmin();
  const { data: item } = await admin
    .from("marketing_review_queue")
    .select("*")
    .eq("id", id)
    .single();

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Не-владелец проходит только при доказанном доступе к бизнесу; item без business_id → 403 (была дыра SEC-5).
  const decision = reviewMutationDecision(item.owner_id, user.id, item.business_id);
  if (decision === "forbid") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (decision === "needs_business_check") {
    const access = await assertBusinessAccess(item.business_id, user.id);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await admin
    .from("marketing_review_queue")
    .update({
      status,
      human_notes: body.human_notes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update review item" }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
