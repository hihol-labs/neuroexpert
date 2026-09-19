/**
 * R-07 «Approval -> публикация»: чистое решение «можно ли публиковать пакет». Одно для сайта и для
 * Telegram-бота (исполняет apps/web/lib/publish-service.ts). Без ввода-вывода.
 */
export type PublishCode = "not_found" | "already_published" | "bad_status" | "no_slug" | "faq_required";
export interface PublishablePackage { expert_id: string; status: string; slug: string | null; format_faq: unknown }
export type PublishDecision = { ok: true } | { ok: false; code: PublishCode; problems?: string[] };

/** Публиковать можно только проверенный черновик; generating / failed / rejected - нет. */
export const PUBLISHABLE_STATUSES = ["review", "approved"] as const;
export const FAQ_MIN_PAIRS = 3;
export const FAQ_MIN_QUESTION = 9; // «длиннее 8 символов» - правило прежнего hasValidFaq
export const FAQ_MIN_ANSWER = 21; // «длиннее 20 символов»

/**
 * Чего не хватает FAQ для публикации (страница отдаёт FAQPage-разметку). Пустой список = гейт пройден.
 * Правило то же, что у прежнего hasValidFaq: не меньше 3 пар, вопрос > 8 и ответ > 20 символов.
 */
export function faqProblems(faq: unknown): string[] {
  if (!Array.isArray(faq)) return [`Добавьте не меньше ${FAQ_MIN_PAIRS} пар «вопрос — ответ».`];
  const problems: string[] = [];
  if (faq.length < FAQ_MIN_PAIRS) problems.push(`Нужно не меньше ${FAQ_MIN_PAIRS} пар «вопрос — ответ», сейчас ${faq.length}.`);
  faq.forEach((item, i) => {
    const pair = item && typeof item === "object" ? (item as { question?: unknown; answer?: unknown }) : {};
    const q = typeof pair.question === "string" ? pair.question.trim() : "";
    const a = typeof pair.answer === "string" ? pair.answer.trim() : "";
    if (q.length < FAQ_MIN_QUESTION) problems.push(`Пара ${i + 1}: вопрос короче ${FAQ_MIN_QUESTION} символов.`);
    if (a.length < FAQ_MIN_ANSWER) problems.push(`Пара ${i + 1}: ответ короче ${FAQ_MIN_ANSWER} символа.`);
  });
  return problems;
}

/** Чужой пакет неотличим от несуществующего (not_found) - существование не раскрывается. */
export function decidePublish(pkg: PublishablePackage | null | undefined, expertId: string): PublishDecision {
  if (!pkg || !expertId || pkg.expert_id !== expertId) return { ok: false, code: "not_found" };
  if (pkg.status === "published") return { ok: false, code: "already_published" };
  if (!(PUBLISHABLE_STATUSES as readonly string[]).includes(pkg.status)) return { ok: false, code: "bad_status" };
  if (typeof pkg.slug !== "string" || !pkg.slug.trim()) return { ok: false, code: "no_slug" };
  const problems = faqProblems(pkg.format_faq);
  if (problems.length > 0) return { ok: false, code: "faq_required", problems };
  return { ok: true };
}

/**
 * Slug статьи уникален в пределах эксперта (миграция 033): при коллизии добавляется суффикс -2, -3…
 * Пустая основа даёт «article». taken - уже занятые slug этого эксперта.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = base.trim() || "article";
  if (!used.has(root)) return root;
  for (let n = 2; ; n += 1) { const candidate = `${root}-${n}`; if (!used.has(candidate)) return candidate; }
}
