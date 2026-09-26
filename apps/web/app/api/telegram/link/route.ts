import { NextRequest, NextResponse } from "next/server";
import { hashLinkNonce, newLinkNonce, signTelegramLinkToken, LINK_TOKEN_TTL_MS } from "shared/notify/link-token";
import { createClient } from "@/lib/supabase/server";
import { expertOrdersAdmin, isSameOriginPost } from "@/lib/expert-orders";

export const dynamic = "force-dynamic";

/**
 * R-08 (E-AUTO-2): привязка Telegram к существующему аккаунту.
 * POST - выдать подписанную ссылку t.me/<бот>?start=l_<токен> (HMAC, 15 минут, одноразовый номер
 * хранится в профиле и гасится ботом при использовании). Новый запрос заменяет номер - прежняя ссылка
 * перестаёт работать. DELETE - отвязать Telegram. Сессия обязательна (401), форма - только с нашего
 * origin (403). Секрет и username бота - из env рантайма (скобочная запись).
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const secret = process.env["TELEGRAM_LINK_SECRET"];
  if (!secret || secret.length < 32) {
    console.error("[telegram/link] TELEGRAM_LINK_SECRET is missing or too short");
    return NextResponse.json({ error: "Привязка Telegram временно недоступна", code: "not_configured" }, { status: 503 });
  }
  const botUsername = (process.env["TELEGRAM_BOT_USERNAME"] || "neuroexpert_bot").replace(/^@/, "");

  const now = Date.now();
  const nonce = newLinkNonce();
  const { data: updated, error } = await expertOrdersAdmin()
    .from("profiles")
    .update({ telegram_link_nonce: hashLinkNonce(nonce), telegram_link_expires_at: new Date(now + LINK_TOKEN_TTL_MS).toISOString() })
    .eq("id", user.id)
    .select("id");
  if (error || !updated || updated.length === 0) {
    console.error("[telegram/link] nonce update failed", { userId: user.id, error: error?.message });
    return NextResponse.json({ error: "Не удалось подготовить ссылку, попробуйте ещё раз", code: "error" }, { status: 500 });
  }
  const token = signTelegramLinkToken(user.id, nonce, now, secret);
  return NextResponse.json(
    { url: `https://t.me/${botUsername}?start=${token}`, expires_in_seconds: Math.floor(LINK_TOKEN_TTL_MS / 1000) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await expertOrdersAdmin()
    .from("profiles")
    .update({ telegram_id: null, telegram_username: null, telegram_link_nonce: null, telegram_link_expires_at: null })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: "Не удалось отключить Telegram", code: "error" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
