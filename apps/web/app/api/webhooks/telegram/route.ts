import { NextRequest, NextResponse } from "next/server";
import { getBotInstance } from "@/lib/bot-instance";

const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    if (secret) {
      const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
      if (headerSecret !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();
    const bot = getBotInstance();
    await bot.handleUpdate(body);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] Error processing update:", err);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}
