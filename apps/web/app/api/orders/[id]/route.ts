import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Нетипизированный service_role клиент — как в webhook и service-orders:
// сгенерированные типы Database не покрывают новые таблицы полностью.
function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * GET /api/orders/[id] — статус заказа для его владельца (G-018).
 *
 * Только аутентифицированный владелец (RLS дублируется явной проверкой
 * owner_id, чтобы не зависеть от политики при чтении через service_role).
 * Наружу не отдаются платёжные секреты и внутренние причины отказов целиком.
 */

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const orderId = params.id;
  if (!UUID_RE.test(orderId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("package_orders")
    .select("id, owner_id, package, amount_rub, niche_id, city, status, job_id, paid_at, refunded_at, created_at, confirmation_url")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.owner_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    package: order.package,
    amount_rub: order.amount_rub,
    niche_id: order.niche_id,
    city: order.city,
    status: order.status,
    audit_queued: Boolean(order.job_id),
    paid_at: order.paid_at,
    refunded_at: order.refunded_at,
    created_at: order.created_at,
    // Ссылка на оплату нужна только пока заказ не оплачен.
    confirmation_url: order.status === "pending" ? order.confirmation_url : null,
  });
}

const DETAIL_LIMITS: Record<string, number> = { website: 200, competitors: 1000, notes: 2000 };

/** PATCH — дозаполнение владельцем (сайт, конкуренты, заметки); только известные ключи, только у своего заказа. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const orderId = params.id;
  if (!UUID_RE.test(orderId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const details: Record<string, string> = {};
  for (const [key, max] of Object.entries(DETAIL_LIMITS)) {
    const value = body[key];
    if (typeof value !== "string") continue;
    if (value.length > max) return NextResponse.json({ error: `Поле ${key} длиннее ${max} символов.` }, { status: 400 });
    details[key] = value.trim();
  }

  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("package_orders")
    .update({ details })
    .eq("id", orderId)
    .eq("owner_id", user.id)
    .select("id");
  if (!updated || updated.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, details });
}
