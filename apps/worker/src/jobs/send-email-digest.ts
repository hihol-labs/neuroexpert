import { supabase } from "../supabase.js";
import { createMailer } from "../services/mailer.js";

// Email digest — отправляет подписчикам уведомления о новых статьях эксперта.
// R-03: единый почтовый транспорт — SMTP mailer (тот же, что письма Audit Start); Resend удалён.

const mailer = createMailer();
const FROM_EMAIL = process.env.EMAIL_FROM || process.env.SMTP_ADMIN_EMAIL || "noreply@neuroexpertise.ru";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

interface SendResult {
  sent: number;
  failed: number;
}

export async function handleSendEmailDigest(payload: Record<string, unknown>): Promise<SendResult> {
  const expertId = payload.expert_id as string;
  const contentId = payload.content_id as string;

  if (!expertId) throw new Error("expert_id is required");

  // Получаем эксперта
  const { data: expert } = await supabase
    .from("profiles")
    .select("full_name, slug")
    .eq("id", expertId)
    .single();

  if (!expert) throw new Error(`Expert ${expertId} not found`);

  // Получаем подписчиков
  const { data: subscribers } = await supabase
    .from("email_subscribers")
    .select("email")
    .eq("expert_id", expertId)
    .eq("is_active", true);

  if (!subscribers?.length) {
    console.log(`[email_digest] No subscribers for expert ${expertId}`);
    return { sent: 0, failed: 0 };
  }

  // Получаем новые статьи (или конкретную)
  let articles: Array<{ title: string; slug: string; meta_description: string | null; published_url: string | null }>;

  if (contentId) {
    const { data } = await supabase
      .from("content_packages")
      .select("title, slug, meta_description, published_url")
      .eq("id", contentId)
      .single();
    articles = data ? [data as typeof articles[0]] : [];
  } else {
    // Последние статьи за неделю
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await supabase
      .from("content_packages")
      .select("title, slug, meta_description, published_url")
      .eq("expert_id", expertId)
      .eq("status", "published")
      .gte("published_at", weekAgo)
      .order("published_at", { ascending: false })
      .limit(5);
    articles = (data ?? []) as typeof articles;
  }

  if (!articles.length) {
    console.log(`[email_digest] No new articles for expert ${expertId}`);
    return { sent: 0, failed: 0 };
  }

  // Формируем HTML письма
  const articlesList = articles.map((a) => {
    const url = a.published_url || `${APP_URL}/experts/${expert.slug}/${a.slug}`;
    return `<li style="margin-bottom:12px"><a href="${url}" style="color:#2563eb;text-decoration:none;font-weight:600">${a.title}</a>${a.meta_description ? `<br><span style="color:#6b7280;font-size:14px">${a.meta_description}</span>` : ""}</li>`;
  }).join("");

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;color:#1f2937">
      <h2 style="color:#111827">Новые статьи от ${expert.full_name}</h2>
      <ul style="list-style:none;padding:0">${articlesList}</ul>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="font-size:12px;color:#9ca3af">
        Вы подписаны на рассылку ${expert.full_name} на НейроЭксперт.
        <a href="${APP_URL}" style="color:#6b7280">Отписаться</a>
      </p>
    </div>
  `.trim();

  const subject = articles.length === 1
    ? `Новая статья: ${articles[0].title}`
    : `${articles.length} новых статей от ${expert.full_name}`;

  // Отправляем через Resend API
  let sent = 0;
  let failed = 0;

  // Батч — до 50 за раз, получатели в bcc; отправитель — FROM_EMAIL (тот же SMTP, что письма Audit Start).
  for (let i = 0; i < subscribers.length; i += 50) {
    const batch = subscribers.slice(i, i + 50);
    const bccList = batch.map((s) => s.email);

    try {
      // Текстовая версия: ссылки сохраняются как «текст (URL)», остальные теги убираются.
      const text = html.replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      await mailer({ to: FROM_EMAIL, bcc: bccList, subject, text, html });
      sent += bccList.length;
    } catch (err) {
      console.error("[email_digest] Send error:", err);
      failed += bccList.length;
    }
  }

  console.log(`[email_digest] Sent ${sent}, failed ${failed} for expert ${expertId}`);
  return { sent, failed };
}
