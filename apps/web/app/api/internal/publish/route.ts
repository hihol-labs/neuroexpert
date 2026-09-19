import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { PUBLISH_HTTP_STATUS, publishAdmin, publishContent } from "@/lib/publish-service";

export const dynamic = "force-dynamic";

const BAD_LIMIT = 30, BAD_WINDOW_MS = 60_000;
const badAttempts: number[] = [];
const UUID =/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/internal/publish {content_id, expert_id} - публикация из Telegram-бота (R-07, E-AUTO-3).
 * Бот не публикует напрямую в БД: ревалидация страниц работает только в процессе web. Доступ - по
 * общему секрету PUBLISH_INTERNAL_TOKEN (скобочная запись - рантайм контейнера). Секрет не задан ->
 * 503 для всех (fail-closed). Владельца (expert_id) бот определяет по telegram_id; сервис проверяет,
 * что пакет принадлежит именно ему, - чужой пакет неотличим от несуществующего.
 */
export async function POST(request: NextRequest) {
  const token = process.env["PUBLISH_INTERNAL_TOKEN"];
  if (!token) return NextResponse.json({ error: "internal publish is not configured", code: "not_configured" }, { status: 503 });
  const supplied = request.headers.get("x-internal-token") || "";
  const a = Buffer.from(token), b = Buffer.from(supplied);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    // Роут виден извне (префикс /api публичный): перебор секрета глушится счётчиком неверных
    // попыток на процесс. Верный токен счётчик не трогает - бот под чужим перебором работает.
    const now = Date.now();
    while (badAttempts.length > 0 && now - badAttempts[0] > BAD_WINDOW_MS) badAttempts.shift();
    if (badAttempts.length >= BAD_LIMIT) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    badAttempts.push(now);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const contentId = typeof body?.content_id === "string" ? body.content_id : "";
    const expertId = typeof body?.expert_id === "string" ? body.expert_id : "";
    if (!UUID.test(contentId) || !UUID.test(expertId)) return NextResponse.json({ error: "content_id and expert_id are required", code: "bad_request" }, { status: 400 });

    const result = await publishContent(publishAdmin(), contentId, expertId);
    if (!result.ok) {
      return NextResponse.json({ error: result.code, code: result.code, problems: result.problems ?? [] }, { status: PUBLISH_HTTP_STATUS[result.code] ?? 500 });
    }
    return NextResponse.json({ ok: true, url: result.url, profile_url: result.profileUrl, profile_published_now: result.profilePublishedNow, profile_visible: result.profileVisible });
  } catch (err) {
    console.error("[internal/publish] Error:", err);
    return NextResponse.json({ error: "error", code: "error" }, { status: 500 });
  }
}
