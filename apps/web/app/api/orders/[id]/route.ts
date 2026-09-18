import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { AVG_CHECK_MAX, clientBrand, parseAvgCheck, parseConversion } from "shared";

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
    .select("id, owner_id, package, amount_rub, niche_id, city, status, job_id, paid_at, refunded_at, created_at, confirmation_url, report, report_mode, delivered_at, refund_status")
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
    report: order.report,
    report_mode: order.report_mode,
    delivered_at: order.delivered_at,
    refund_status: order.refund_status,
    audit_queued: Boolean(order.job_id),
    paid_at: order.paid_at,
    refunded_at: order.refunded_at,
    created_at: order.created_at,
    // Ссылка на оплату нужна только пока заказ не оплачен.
    confirmation_url: order.status === "pending" ? order.confirmation_url : null,
  });
}

const DETAIL_LIMITS: Record<string, number> = { website: 200, competitors: 1000, notes: 2000, brand: 100, avg_check: 20, conversion: 10 };

/** R-05b: числа для денежного блока проверяются на сервере тем же парсером, что и расчёт; пустая строка = «не указано». */
function validateMoneyField(key: string, value: string): string | null {
  if (!value) return null;
  if (key === "avg_check" && parseAvgCheck(value) === null) return `Средний чек — целое число рублей от 1 до ${AVG_CHECK_MAX.toLocaleString("ru-RU")}.`;
  if (key === "conversion" && parseConversion(value) === null) return "Конверсия — число больше 0 и не больше 100, до двух знаков после запятой.";
  if (key === "brand" && clientBrand(value) === null) return "Название — от 3 до 100 символов.";
  return null;
}

/**
 * PATCH — дозаполнение владельцем (сайт, конкуренты, заметки, название, чек, конверсия); только
 * известные ключи, только у своего заказа. Переданные ключи дополняют сохранённые details, а не
 * затирают их: форма доступна и до, и после доставки отчёта.
 */
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
    const trimmed = value.trim();
    const invalid = validateMoneyField(key, trimmed);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    details[key] = trimmed;
  }

  const admin = createAdminClient();
  // Чтение-слияние-запись с проверкой версии (updated_at): параллельный PATCH или смена статуса
  // worker'ом между чтением и записью не теряет поля - попытка повторяется на свежей строке.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: current } = await admin
      .from("package_orders")
      .select("details, updated_at")
      .eq("id", orderId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const previous = current.details && typeof current.details === "object" && !Array.isArray(current.details) ? current.details as Record<string, unknown> : {};
    const merged: Record<string, string> = {};
    for (const key of Object.keys(DETAIL_LIMITS)) {
      const next = key in details ? details[key] : previous[key];
      if (typeof next === "string" && next) merged[key] = next;
    }
    const { data: updated } = await admin
      .from("package_orders")
      // updated_at двигаем явно: версия меняется и там, где триггера set_updated_at нет.
      .update({ details: merged, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("owner_id", user.id)
      .eq("updated_at", current.updated_at)
      .select("id");
    if (updated && updated.length > 0) return NextResponse.json({ ok: true, details: merged });
  }
  return NextResponse.json({ error: "Заказ менялся одновременно, попробуйте ещё раз." }, { status: 409 });
}
