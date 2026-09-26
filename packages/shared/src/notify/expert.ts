/**
 * R-08: единое уведомление эксперту. Каналы: Telegram, если привязан, и e-mail всегда (решение
 * владельца 2026-09-26: «всегда, как в плане»). Ядро без ввода-вывода: worker даёт адаптеры
 * (дедуп в expert_notifications, tgFetch с проверкой ответа, SMTP-мейлер).
 * Инвариант: notify НИКОГДА не бросает; неудача одного канала не мешает второму.
 */
export type ExpertNotifyKind = "draft_ready" | "published" | "lead" | "booking";
export const EXPERT_NOTIFY_KINDS: readonly ExpertNotifyKind[] = ["draft_ready", "published", "lead", "booking"];

export interface ExpertContact { id: string; email: string | null; telegram_id: number | null; full_name?: string | null }
export interface ExpertChannels { telegram: boolean; email: boolean }

/** Служебный адрес аккаунта, созданного ботом до R-08 (tg_<id>@neuroexpert.bot) - писем не получает. */
export function isServiceEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && /@neuroexpert\.bot$/i.test(email.trim());
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function planExpertChannels(contact: Pick<ExpertContact, "email" | "telegram_id">): ExpertChannels {
  const tg = contact.telegram_id;
  const email = typeof contact.email === "string" ? contact.email.trim() : "";
  return {
    telegram: typeof tg === "number" && Number.isFinite(tg) && tg !== 0,
    email: EMAIL_RE.test(email) && !isServiceEmail(email),
  };
}

export interface TelegramButton { text: string; url?: string; callback_data?: string }
export interface ExpertMessage { telegramText: string; keyboard?: TelegramButton[][]; subject: string; text: string; html: string }

export type ExpertNotifyFields = {
  title?: string | null; content_id?: string | null; needs_review?: boolean | null;
  url?: string | null; profile_url?: string | null;
  lead_id?: string | null; booking_id?: string | null;
  client_name?: string | null; client_contact?: string | null; client_message?: string | null;
  date?: string | null; time?: string | null;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
const clip = (s: string | null | undefined, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");

function render(subject: string, lines: string[], link: { href: string; label: string } | null): Pick<ExpertMessage, "subject" | "text" | "html"> {
  // Тема - одна строка: переводы строк из заголовка статьи не попадают в заголовки письма.
  subject = subject.replace(/[\r\n]+/g, " ").trim();
  const text = [...lines, ...(link ? ["", `${link.label}: ${link.href}`] : []), "", "— НейроЭксперт"].join("\n");
  const html = [
    ...lines.map((l) => (l ? `<p>${esc(l)}</p>` : "")),
    link ? `<p><a href="${esc(link.href)}">${esc(link.label)}</a></p>` : "",
    "<p style=\"color:#888\">— НейроЭксперт</p>",
  ].filter(Boolean).join("\n");
  return { subject, text, html };
}

/**
 * Текст для Telegram (без parse_mode - данные клиента не интерпретируются как разметка) и письмо
 * (HTML с экранированием всего, что пришло от клиента). callback_data укладывается в лимит 64 байта.
 */
export function formatExpertNotification(kind: ExpertNotifyKind, f: ExpertNotifyFields, appUrl: string): ExpertMessage {
  const base = appUrl.replace(/\/+$/, "");
  const title = clip(f.title, 200) || "Без заголовка";
  if (kind === "draft_ready") {
    const editor = `${base}/content/${f.content_id ?? ""}`;
    const note = f.needs_review ? "Автоматическая проверка нашла замечания — посмотрите текст перед публикацией." : "";
    const lines = ["Черновик статьи готов к проверке.", `«${title}»`, ...(note ? [note] : [])];
    return {
      telegramText: `✅ ${lines.join("\n")}`,
      keyboard: f.content_id ? [[{ text: "✅ Опубликовать", callback_data: `approve:${f.content_id}` }, { text: "✏️ Редактировать", callback_data: `edit:${f.content_id}` }]] : undefined,
      ...render(`Черновик готов: ${title}`, lines, { href: editor, label: "Открыть черновик" }),
    };
  }
  if (kind === "published") {
    const url = clip(f.url, 500);
    const lines = ["Статья опубликована.", `«${title}»`, "Поделитесь ссылкой в первые дни — так нейросети и поиск быстрее её найдут."];
    const share = url ? [
      [{ text: "📤 Поделиться в Telegram", url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` }],
      [{ text: "📤 Поделиться во ВКонтакте", url: `https://vk.com/share.php?url=${encodeURIComponent(url)}` }],
    ] : undefined;
    return {
      telegramText: `🎉 ${lines.join("\n")}${url ? `\n${url}` : ""}`,
      keyboard: share,
      ...render(`Опубликовано: ${title}`, lines, url ? { href: url, label: "Открыть статью" } : null),
    };
  }
  const who = [`Имя: ${clip(f.client_name, 200)}`, `Контакт: ${clip(f.client_contact, 200)}`, ...(clip(f.client_message, 1000) ? [`Сообщение: ${clip(f.client_message, 1000)}`] : [])];
  if (kind === "lead") {
    const lines = ["Новая заявка от клиента.", ...who];
    return {
      telegramText: `🔔 ${lines.join("\n")}`,
      keyboard: f.lead_id ? [[{ text: "✅ Принять", callback_data: `accept_lead:${f.lead_id}` }, { text: "❌ Отклонить", callback_data: `reject_lead:${f.lead_id}` }]] : undefined,
      ...render("Новая заявка от клиента", lines, { href: `${base}/leads`, label: "Заявки в кабинете" }),
    };
  }
  const when = `Когда: ${clip(f.date, 20)} ${clip(f.time, 10)}`.trim();
  const lines = ["Новая запись на консультацию.", ...who, when];
  return {
    telegramText: `📅 ${lines.join("\n")}`,
    ...render("Новая запись на консультацию", lines, { href: `${base}/leads`, label: "Открыть кабинет" }),
  };
}

export type ChannelResult = "sent" | "failed" | "skipped";
export type ExpertNotifyOutcome = { outcome: "sent" | "deduped" | "failed" | "skipped"; telegram: ChannelResult; email: ChannelResult };

export interface ExpertNotifierDeps {
  appUrl: string;
  /** true - отправлять (строка дедупа создана); false - уже отправлено раньше. */
  claim: (expertId: string, kind: ExpertNotifyKind, refId: string) => Promise<boolean>;
  /** Итог по каналам (хотя бы один канал дошёл). */
  complete: (expertId: string, kind: ExpertNotifyKind, refId: string, result: { telegram: ChannelResult; email: ChannelResult }) => Promise<void>;
  /** Ни один канал не дошёл - снять строку дедупа, чтобы повтор job отправил снова. */
  release: (expertId: string, kind: ExpertNotifyKind, refId: string, error: string) => Promise<void>;
  /** Бросает, если Telegram не принял сообщение (ответ не ok). */
  sendTelegram: (chatId: number, text: string, keyboard?: TelegramButton[][]) => Promise<void>;
  sendEmail: (to: string, subject: string, text: string, html: string) => Promise<void>;
  log?: (line: string) => void;
}

export type NotifyExpert = (kind: ExpertNotifyKind, refId: string, contact: ExpertContact, fields: ExpertNotifyFields) => Promise<ExpertNotifyOutcome>;

export function createExpertNotifier(deps: ExpertNotifierDeps): NotifyExpert {
  const log = deps.log ?? ((line: string) => console.error(line));
  return async function notifyExpert(kind, refId, contact, fields) {
    const key = `${kind}:${refId}:${contact.id}`;
    const channels = planExpertChannels(contact);
    if (!channels.telegram && !channels.email) {
      log(`[notify-expert] ${key}: no deliverable channel (no telegram, no real e-mail)`);
      return { outcome: "skipped", telegram: "skipped", email: "skipped" };
    }
    try {
      if (!(await deps.claim(contact.id, kind, refId))) return { outcome: "deduped", telegram: "skipped", email: "skipped" };
    } catch (e) {
      log(`[notify-expert] ${key}: claim failed: ${e instanceof Error ? e.message : String(e)}`);
      return { outcome: "failed", telegram: "skipped", email: "skipped" };
    }
    const msg = formatExpertNotification(kind, fields, deps.appUrl);
    const errors: string[] = [];
    let telegram: ChannelResult = "skipped";
    let email: ChannelResult = "skipped";
    if (channels.telegram) {
      try { await deps.sendTelegram(contact.telegram_id as number, msg.telegramText, msg.keyboard); telegram = "sent"; }
      catch (e) { telegram = "failed"; errors.push(`telegram: ${e instanceof Error ? e.message : String(e)}`); }
    }
    if (channels.email) {
      try { await deps.sendEmail((contact.email as string).trim(), msg.subject, msg.text, msg.html); email = "sent"; }
      catch (e) { email = "failed"; errors.push(`email: ${e instanceof Error ? e.message : String(e)}`); }
    }
    if (errors.length) log(`[notify-expert] ${key}: ${errors.join("; ")}`);
    try {
      if (telegram === "sent" || email === "sent") { await deps.complete(contact.id, kind, refId, { telegram, email }); return { outcome: "sent", telegram, email }; }
      await deps.release(contact.id, kind, refId, errors.join("; ").slice(0, 500));
    } catch (e) {
      log(`[notify-expert] ${key}: bookkeeping failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    return { outcome: telegram === "sent" || email === "sent" ? "sent" : "failed", telegram, email };
  };
}
