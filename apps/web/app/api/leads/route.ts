import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { tgFetch } from "shared/http/telegram-fetch";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// Simple rate limit: 5 per minute per IP
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

function generateTrackingToken(): string {
  return randomBytes(16).toString("hex");
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
      expert_id,
      content_id,
      client_name,
      client_contact,
      client_message,
    } = body;

    if (!expert_id || !client_name || !client_contact) {
      return NextResponse.json(
        { error: "expert_id, client_name, client_contact are required" },
        { status: 400 },
      );
    }

    const admin = getAdmin();
    const trackingToken = generateTrackingToken();

    const { data: lead, error } = await admin
      .from("leads")
      .insert({
        expert_id,
        content_id: content_id || null,
        client_name,
        client_contact,
        client_message: client_message || null,
        source: "page_button",
        referrer: request.headers.get("referer") || null,
        status: "new",
        tracking_token: trackingToken,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[leads] Insert error:", error);
      return NextResponse.json(
        { error: "Failed to create lead" },
        { status: 500 },
      );
    }

    if (content_id) {
      await admin.rpc("increment_page_metric", {
        p_content_id: content_id,
        p_event_type: "lead",
      });
    }

    // Telegram notification to expert
    const { data: expert } = await admin
      .from("profiles")
      .select("telegram_id, full_name")
      .eq("id", expert_id)
      .single();

    if (expert?.telegram_id) {
      await sendTelegramNotification(
        expert.telegram_id,
        lead.id,
        client_name,
        client_contact,
        client_message || "",
      );
    }

    // If form submission, redirect to tracking page
    if (!contentType.includes("application/json")) {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";
      return NextResponse.redirect(
        new URL(`/track/${trackingToken}`, appUrl),
      );
    }

    return NextResponse.json({
      ok: true,
      lead_id: lead.id,
      tracking_token: trackingToken,
      tracking_url: `/track/${trackingToken}`,
    });
  } catch (err) {
    console.error("[leads] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function sendTelegramNotification(
  telegramId: number,
  leadId: string,
  name: string,
  contact: string,
  message: string,
): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const text = [
    "🔔 Новая заявка!",
    "",
    `👤 ${name}`,
    `📱 ${contact}`,
    ...(message ? [`💬 ${message}`] : []),
  ].join("\n");

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Принять", callback_data: `accept_lead:${leadId}` },
        { text: "❌ Отклонить", callback_data: `reject_lead:${leadId}` },
      ],
    ],
  };

  try {
    await tgFetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        reply_markup: keyboard,
      }),
    });
  } catch (err) {
    console.error("[leads] Telegram notification failed:", err);
  }
}
