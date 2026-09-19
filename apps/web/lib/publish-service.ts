import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { decidePublish, type PublishCode } from "shared";
import { sendSharingNotification } from "@/lib/publish-notify";

/**
 * R-07: единственный путь публикации контент-пакета - и для сайта (/api/publish), и для Telegram
 * (/api/internal/publish). Решение - чистая decidePublish из shared; здесь только ввод-вывод.
 */
export type PublishResult =
  | { ok: true; url: string; profileUrl: string; profilePublishedNow: boolean; profileVisible: boolean }
  | { ok: false; code: PublishCode | "conflict" | "error"; problems?: string[] };

export const PUBLISH_HTTP_STATUS: Record<string, number> = {
  not_found: 404, already_published: 409, bad_status: 409, conflict: 409, no_slug: 422, faq_required: 422, error: 500,
};

export function publishAdmin(): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const APP_URL = (process.env["APP_URL"] || process.env["NEXT_PUBLIC_APP_URL"] || "https://neuroexpertise.ru").replace(/\/+$/, "");

export async function publishContent(admin: SupabaseClient, contentId: string, expertId: string): Promise<PublishResult> {
  // У profiles две связи с niches (FK niche_id и expert_niches): embed без подсказки PostgREST
  // отклоняет (PGRST201) - раньше это превращало любую публикацию в «пакет не найден».
  const { data: pkg, error: pkgErr } = await admin
    .from("content_packages")
    .select("id, expert_id, order_id, title, slug, status, format_faq, profiles!inner(slug, telegram_id, is_published, niches!profiles_niche_id_fkey(slug))")
    .eq("id", contentId)
    .maybeSingle();
  if (pkgErr) {
    // Ошибка запроса - не «не найдено»: иначе сбой БД маскируется под 404.
    console.error("[publish] select failed", { contentId, error: pkgErr.message });
    return { ok: false, code: "error" };
  }

  const decision = decidePublish(pkg, expertId);
  if (!decision.ok) return decision;

  const profile = pkg!.profiles as unknown as { slug: string; telegram_id: number | null; is_published: boolean | null; niches: { slug: string } | null };
  const expertSlug = profile.slug;
  const publishedUrl = `${APP_URL}/experts/${expertSlug}/${pkg!.slug}`;
  const profileUrl = `${APP_URL}/experts/${expertSlug}`;

  // Условный UPDATE: владелец и исходный статус проверяются самой записью - гонка двух нажатий
  // (сайт и Telegram одновременно) публикует один раз.
  const { data: updated, error: updErr } = await admin
    .from("content_packages")
    .update({ status: "published", published_at: new Date().toISOString(), published_url: publishedUrl })
    .eq("id", contentId)
    .eq("expert_id", expertId)
    .in("status", ["review", "approved"])
    .select("id");
  if (updErr) {
    console.error("[publish] update failed", { contentId, error: updErr.message });
    return { ok: false, code: "error" };
  }
  if (!updated || updated.length === 0) return { ok: false, code: "conflict" };

  if (pkg!.order_id) {
    const { error: orderErr } = await admin.from("orders").update({ status: "published" }).eq("id", pkg!.order_id).eq("expert_id", expertId);
    if (orderErr) console.error("[publish] order status failed", { orderId: pkg!.order_id, error: orderErr.message });
  }

  // E-AUTO-18: опубликованная статья видна только у публичного профиля - профиль публикуется вместе
  // с первой статьёй. Снятие с публикации - вручную в профиле; сервис флаг только включает.
  // Сбой здесь не откатывает статью, но и не замалчивается: profileVisible = false уходит в ответ -
  // сайт и бот просят эксперта включить публичность профиля вручную (иначе статья недоступна).
  let profileVisible = profile.is_published === true;
  let profilePublishedNow = false;
  if (!profileVisible) {
    const { data: prof, error: profErr } = await admin.from("profiles").update({ is_published: true }).eq("id", expertId).select("id");
    if (profErr || !prof || prof.length === 0) console.error("[publish] profile publish failed", { expertId, error: profErr?.message });
    else { profileVisible = true; profilePublishedNow = true; }
  }

  await admin.from("jobs").insert({ type: "crosspost_social", payload: { content_id: contentId, expert_id: expertId }, priority: 7 });

  revalidatePath(`/experts/${expertSlug}/${pkg!.slug}`);
  revalidatePath(`/experts/${expertSlug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/sitemaps/experts.xml");

  if (profile.telegram_id) {
    await sendSharingNotification(profile.telegram_id, (pkg!.title as string) ?? "", publishedUrl, profile.niches?.slug ?? undefined);
  }
  return { ok: true, url: publishedUrl, profileUrl, profilePublishedNow, profileVisible };
}
