import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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
    let body: Record<string, string>;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData) as Record<string, string>;
    }

    const {
      name,
      contact,
      email,
      niche,
      website,
      city,
      competitors,
      goal,
      package_type,
      package_label,
      utm_source,
      utm_medium,
      utm_campaign,
    } = body;

    if (!name || !contact) {
      return NextResponse.json(
        { error: "name and contact are required" },
        { status: 400 },
      );
    }

    const admin = getAdmin();
    const enrichedGoal = [
      goal || null,
      city ? `Город/район: ${city}` : null,
      competitors ? `Конкуренты: ${competitors}` : null,
      package_label ? `Пакет/метка: ${package_label}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const { data, error } = await admin
      .from("service_orders")
      .insert({
        name,
        contact,
        email: email || null,
        niche: niche || null,
        website: website || null,
        goal: enrichedGoal || null,
        package_type: package_type || "launch_30d",
        source: "launch_page",
        referrer: request.headers.get("referer") || null,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[service-orders] Insert error:", error);
      return NextResponse.json(
        { error: "Failed to create service order" },
        { status: 500 },
      );
    }

    if (!contentType.includes("application/json")) {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";
      return NextResponse.redirect(new URL("/launch?success=1", appUrl));
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    console.error("[service-orders] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
