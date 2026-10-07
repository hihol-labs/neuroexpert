import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  SlidingWindowLimiter, clientIpFromHeaders, pageEventDecision, PAGE_EVENTS_LIMIT, PAGE_EVENTS_WINDOW_MS,
} from "shared";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// R-10 (E-AUTO-16): публичная точка без авторизации - лимит по IP (один процесс web, см. security/rate-limit).
const limiter = new SlidingWindowLimiter({ limit: PAGE_EVENTS_LIMIT, windowMs: PAGE_EVENTS_WINDOW_MS });

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFromHeaders((name) => request.headers.get(name));
    const rate = limiter.consume(ip);
    const body = await request.json().catch(() => ({}));
    const contentId = (body as { content_id?: unknown }).content_id;
    const eventType = (body as { event_type?: unknown }).event_type;

    const pre = pageEventDecision({ rateAllowed: rate.allowed, contentId, eventType });
    if (!pre.ok) {
      const headers = pre.status === 429 ? { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } : undefined;
      return NextResponse.json({ error: pre.error }, { status: pre.status, headers });
    }

    const admin = getAdmin();
    // Метрика пишется только для опубликованного пакета: раньше неопубликованный id молча давал 200.
    const { data: pkg, error: pkgErr } = await admin
      .from("content_packages")
      .select("id")
      .eq("id", contentId as string)
      .eq("status", "published")
      .maybeSingle();
    if (pkgErr) {
      console.error("[page-events] lookup error:", pkgErr);
      return NextResponse.json({ error: "Failed to record page event" }, { status: 500 });
    }
    const decision = pageEventDecision({ rateAllowed: true, contentId, eventType, published: Boolean(pkg) });
    if (!decision.ok) return NextResponse.json({ error: decision.error }, { status: decision.status });

    const { error } = await admin.rpc("increment_page_metric", {
      p_content_id: contentId as string,
      p_event_type: eventType as string,
    });

    if (error) {
      console.error("[page-events] RPC error:", error);
      return NextResponse.json(
        { error: "Failed to record page event" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[page-events] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
