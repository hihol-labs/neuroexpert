import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { decideOrderSelection, isSameOriginRequest, type ExpertOrderAction } from "shared";
import { createClient } from "@/lib/supabase/server";

/**
 * R-06: экспертные заказы (таблица public.orders). Неймспейс /api/expert-orders/* отдельный:
 * /api/orders/* занят платными заказами Audit Start (package_orders).
 */
export const EXPERT_ORDER_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Нетипизированный service_role клиент - как в остальных роутах; владелец проверяется явно в запросе.
export function expertOrdersAdmin(): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * CSRF: формы дашборда - POST с cookie-сессией. Разрешён только наш origin: канонический
 * NEXT_PUBLIC_APP_URL и хост самого запроса (за Traefik - x-forwarded-host/proto; локальная разработка).
 */
export function isSameOriginPost(request: NextRequest): boolean {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
  const allowed = [process.env.NEXT_PUBLIC_APP_URL ?? "", host ? `${proto}://${host}` : ""];
  return isSameOriginRequest(request.headers.get("origin"), request.headers.get("sec-fetch-site"), allowed);
}

/** Формы дашборда - обычный POST: после действия браузер возвращается на /orders (See Other -> GET). */
export function backToOrders(request: NextRequest, notice: string): NextResponse {
  const url = new URL("/orders", process.env.NEXT_PUBLIC_APP_URL || request.url);
  url.searchParams.set("notice", notice);
  return NextResponse.redirect(url, 303);
}

/**
 * Принять / пропустить тему. Без сессии - 401 до обращения к БД. Запись - одним условным UPDATE
 * (владелец + pending): гонка двух кликов или чужой id ничего не меняет. Причина отказа для
 * уведомления берётся из чистого решения shared; чужой заказ неотличим от несуществующего.
 */
export async function handleExpertOrderSelection(request: NextRequest, id: string, action: ExpertOrderAction): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!EXPERT_ORDER_UUID.test(id)) return backToOrders(request, "not_found");

  const admin = expertOrdersAdmin();
  const { data: order } = await admin.from("orders").select("expert_id, status").eq("id", id).maybeSingle();
  const decision = decideOrderSelection(order, user.id, action);
  if (!decision.ok) return backToOrders(request, decision.code);

  const { data: updated } = await admin
    .from("orders")
    // updated_at двигаем явно: по нему бот и сайт определяют последнюю выбранную тему.
    .update({ status: decision.status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("expert_id", user.id)
    .eq("status", "pending")
    .select("id");
  if (!updated || updated.length === 0) return backToOrders(request, "conflict");
  return backToOrders(request, decision.status);
}

export type VoiceOrderResolution =
  | { ok: true; orderId: string | null }
  | { ok: false; code: "order_required" | "order_not_found"; status: 400 | 404 };

/**
 * К какой теме привязать запись с сайта (E-AUTO-7). order_id передан - он обязан быть темой этого
 * эксперта в статусе accepted. Не передан - свободная запись разрешена, только если принятых тем
 * нет; иначе запись отклоняется: «первый принятый заказ» больше не угадывается.
 */
export async function resolveVoiceOrder(admin: SupabaseClient, expertId: string, orderId: string | null): Promise<VoiceOrderResolution> {
  if (orderId) {
    if (!EXPERT_ORDER_UUID.test(orderId)) return { ok: false, code: "order_not_found", status: 404 };
    const { data: order } = await admin
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .eq("expert_id", expertId)
      .eq("status", "accepted")
      .maybeSingle();
    return order ? { ok: true, orderId: order.id as string } : { ok: false, code: "order_not_found", status: 404 };
  }
  const { count } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("expert_id", expertId)
    .eq("status", "accepted");
  return (count ?? 0) > 0 ? { ok: false, code: "order_required", status: 400 } : { ok: true, orderId: null };
}
