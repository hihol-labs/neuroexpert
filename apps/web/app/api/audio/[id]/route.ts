import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * R-05: аудио экспертов лежит в ПРИВАТНОМ bucket voice. Стабильная ссылка /api/audio/<voice_id>
 * подписывает URL в момент запроса (TTL 1 ч) и делает 302 - её можно запекать в ISR-страницу и
 * отдавать в /api/v1/answers без риска протухания. Отдаётся только аудио опубликованной статьи
 * (content_packages.status = published), иначе 404 - черновики экспертов наружу не уходят.
 */
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNED_TTL_SECONDS = 3600;
// Ни один ответ роута не кэшируется (ни 302 с подписью, ни 404/503): черновик может стать
// опубликованным, а кэшированный 404 скрыл бы его; подпись - одноразовая.
const NO_STORE = { "Cache-Control": "private, no-store" };
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!UUID_RE.test(id)) return notFound();

  const admin = getAdmin();
  // Только опубликованная статья с этой записью: voice_id - FK content_packages -> voice_recordings.
  const { data: published } = await admin
    .from("content_packages")
    .select("id")
    .eq("voice_id", id)
    .eq("status", "published")
    .limit(1)
    .maybeSingle();
  if (!published) return notFound();

  const { data: recording } = await admin
    .from("voice_recordings")
    .select("file_path")
    .eq("id", id)
    .maybeSingle();
  if (!recording?.file_path) return notFound();

  const { data: signed, error: signError } = await admin.storage
    .from("voice")
    .createSignedUrl(recording.file_path, SIGNED_TTL_SECONDS);
  if (signError || !signed?.signedUrl) {
    console.error(`[audio] createSignedUrl failed for ${id}:`, signError?.message ?? "no url");
    return NextResponse.json({ error: "Audio unavailable" }, { status: 503, headers: NO_STORE });
  }
  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: NO_STORE });
}
