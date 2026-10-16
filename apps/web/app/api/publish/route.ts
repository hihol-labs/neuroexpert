import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSameOriginPost } from "@/lib/expert-orders";
import { PUBLISH_HTTP_STATUS, publishAdmin, publishContent } from "@/lib/publish-service";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/publish {content_id} - публикация контент-пакета с сайта (R-07). Вся логика - в общем
 * сервисе (lib/publish-service.ts), тем же путём публикует Telegram-бот. Отказ отдаёт code (и
 * problems для FAQ-гейта) - страница переводит его в русский текст.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSameOriginPost(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => null);
    const contentId = typeof body?.content_id === "string" ? body.content_id : "";
    if (!UUID.test(contentId)) return NextResponse.json({ error: "content_id is required", code: "bad_request" }, { status: 400 });

    const result = await publishContent(publishAdmin(), contentId, user.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.code, code: result.code, problems: result.problems ?? [] }, { status: PUBLISH_HTTP_STATUS[result.code] ?? 500 });
    }
    return NextResponse.json({ ok: true, url: result.url, profile_url: result.profileUrl, profile_published_now: result.profilePublishedNow, profile_visible: result.profileVisible });
  } catch (err) {
    console.error("[publish] Error:", err);
    return NextResponse.json({ error: "error", code: "error" }, { status: 500 });
  }
}
