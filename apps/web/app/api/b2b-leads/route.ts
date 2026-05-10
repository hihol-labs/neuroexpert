import { NextRequest, NextResponse } from "next/server";
import { tgFetch } from "shared/http/telegram-fetch";

// Rate limit: 3 per hour per IP
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const window = 3600_000;
  const max = 3;

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
      { error: "Слишком много заявок. Попробуйте позже." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const {
      name,
      company,
      contact,
      experts_count,
      city,
      niche,
      website,
      platforms,
      competitors,
      avg_check,
      current_leads,
      message,
    } = body;

    if (!name || !company || !contact) {
      return NextResponse.json(
        { error: "Имя, компания и контакт обязательны" },
        { status: 400 },
      );
    }

    // B2B leads go directly to Telegram (leads table requires expert_id NOT NULL)
    await sendTelegramNotification({
      name,
      company,
      contact,
      expertsCount: experts_count,
      city,
      niche,
      website,
      platforms,
      competitors,
      avgCheck: avg_check,
      currentLeads: current_leads,
      message,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[b2b-leads] Error:", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}

async function sendTelegramNotification(payload: {
  name: string;
  company: string;
  contact: string;
  expertsCount?: string;
  city?: string;
  niche?: string;
  website?: string;
  platforms?: string;
  competitors?: string;
  avgCheck?: string;
  currentLeads?: string;
  message?: string;
}): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!botToken || !adminChatId) return;

  const text = [
    "🏢 Новая B2B-заявка на Local Sales Audit!",
    "",
    `👤 ${payload.name}`,
    `🏢 ${payload.company}`,
    `📱 ${payload.contact}`,
    ...(payload.expertsCount ? [`👥 Экспертов/точек: ${payload.expertsCount}`] : []),
    ...(payload.city ? [`📍 Город: ${payload.city}`] : []),
    ...(payload.niche ? [`🧩 Ниша: ${payload.niche}`] : []),
    ...(payload.website ? [`🌐 Сайт: ${payload.website}`] : []),
    ...(payload.platforms ? ["", `🔗 Площадки:\n${payload.platforms}`] : []),
    ...(payload.competitors ? ["", `🥊 Конкуренты:\n${payload.competitors}`] : []),
    ...(payload.avgCheck ? [`💰 Средний чек: ${payload.avgCheck}`] : []),
    ...(payload.currentLeads ? [`📈 Заявки/потери: ${payload.currentLeads}`] : []),
    ...(payload.message ? ["", `💬 Задача:\n${payload.message}`] : []),
  ].join("\n");

  try {
    await tgFetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: adminChatId, text }),
    });
  } catch (err) {
    console.error("[b2b-leads] Telegram notification failed:", err);
  }
}
