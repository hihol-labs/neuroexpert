import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { notifyOperator } from "@/lib/operator-alerts";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const window = 60_000;
  const max = 5;
  const timestamps =
    rateLimitMap.get(ip)?.filter((t) => now - t < window) ?? [];
  if (timestamps.length >= max) return false;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

async function readOrderBody(request: NextRequest): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return request.json();
  return Object.fromEntries(await request.formData()) as Record<string, string>;
}

function buildEnrichedGoal(body: Record<string, string>) {
  return [
    body.goal || null,
    body.city ? `Город/район: ${body.city}` : null,
    body.competitors ? `Конкуренты: ${body.competitors}` : null,
    body.package_label ? `Пакет/метка: ${body.package_label}` : null,
  ].filter(Boolean).join("\n\n");
}

async function insertOrder(request: NextRequest, body: Record<string, string>) {
  const admin = getAdmin();
  return admin.from("service_orders").insert({
    name: body.name,
    contact: body.contact,
    email: body.email || null,
    niche: body.niche || null,
    website: body.website || null,
    goal: buildEnrichedGoal(body) || null,
    package_type: body.package_type || "launch_30d",
    source: "launch_page",
    referrer: request.headers.get("referer") || null,
    utm_source: body.utm_source || null,
    utm_medium: body.utm_medium || null,
    utm_campaign: body.utm_campaign || null,
  }).select("id").single();
}

function orderSuccessResponse(request: NextRequest, id: string) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";
    return NextResponse.redirect(new URL("/launch?success=1", appUrl), 303);
  }
  return NextResponse.json({ ok: true, id });
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 },
    );
  }

  try {
    const body = await readOrderBody(request);
    if (!body.name || !body.contact) {
      return NextResponse.json(
        { error: "name and contact are required" },
        { status: 400 },
      );
    }

    const { data, error } = await insertOrder(request, body);

    if (error) {
      console.error("[service-orders] Insert error:", error);
      return NextResponse.json(
        { error: "Failed to create service order" },
        { status: 500 },
      );
    }
    // R-02: заявка Launch Start / Managed Lite — алерт оператору (B-AUTO-11); дедуп по id. Не ждём:
    // ответ клиенту не должен зависеть от Telegram/прокси (таймаут до 20 с); notifier не бросает.
    void notifyOperator("service_order", data.id, {
      id: data.id, пакет: body.package_type || "launch_30d", имя: body.name, контакт: body.contact,
      email: body.email || null, ниша: body.niche || null, сайт: body.website || null,
    });
    return orderSuccessResponse(request, data.id);
  } catch (err) {
    console.error("[service-orders] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
