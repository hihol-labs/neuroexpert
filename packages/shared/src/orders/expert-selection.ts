/**
 * R-06 «Выбор спроса экспертом»: чистые решения для экспертных заказов (таблица public.orders -
 * не путать с платными package_orders). Без ввода-вывода: роуты, бот и worker только исполняют.
 */
export type ExpertOrderAction = "accept" | "skip";
export type ExpertOrderRow = { expert_id: string; status: string } | null | undefined;
export type SelectionDecision =
  | { ok: true; status: "accepted" | "rejected" }
  | { ok: false; code: "bad_action" | "not_found" | "conflict" };

/**
 * Принять / пропустить тему может только её владелец и только из pending.
 * Чужой заказ неотличим от несуществующего (not_found) - существование не раскрывается.
 * «Пропустить» = rejected: статуса skipped в CHECK таблицы orders нет (так же пишет бот).
 */
export function decideOrderSelection(order: ExpertOrderRow, userId: string, action: string): SelectionDecision {
  if (action !== "accept" && action !== "skip") return { ok: false, code: "bad_action" };
  if (!order || !userId || order.expert_id !== userId) return { ok: false, code: "not_found" };
  if (order.status !== "pending") return { ok: false, code: "conflict" };
  return { ok: true, status: action === "accept" ? "accepted" : "rejected" };
}

/**
 * CSRF-защита state-changing POST с cookie-сессией (формы дашборда): запрос обязан прийти с нашего
 * origin. Браузер шлёт Origin на любой POST; если его нет - верим только Sec-Fetch-Site: same-origin.
 * Кросс-сайтовая форма даёт чужой Origin либо Sec-Fetch-Site: cross-site -> отказ.
 */
export function isSameOriginRequest(origin: string | null | undefined, secFetchSite: string | null | undefined, allowedOrigins: string[]): boolean {
  const allowed = new Set<string>();
  for (const raw of allowedOrigins) { try { allowed.add(new URL(raw).origin); } catch { /* пустой/битый env пропускаем */ } }
  if (origin) {
    if (origin === "null") return false;
    try { return allowed.has(new URL(origin).origin); } catch { return false; }
  }
  return secFetchSite === "same-origin";
}

/** «Подобрать темы сейчас»: не чаще одного запуска на эксперта в сутки. */
export const GENERATE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export type GenerateDecision = { ok: true } | { ok: false; retry_at: string };
export function decideGenerateNow(lastRequestedAt: string | null | undefined, now: number = Date.now()): GenerateDecision {
  if (!lastRequestedAt) return { ok: true };
  const last = Date.parse(lastRequestedAt);
  // Нечитаемая или будущая метка не должна навсегда блокировать эксперта и не должна снимать лимит молча:
  // будущую трактуем как «только что».
  if (!Number.isFinite(last)) return { ok: true };
  const effective = Math.min(last, now);
  if (now - effective >= GENERATE_COOLDOWN_MS) return { ok: true };
  return { ok: false, retry_at: new Date(effective + GENERATE_COOLDOWN_MS).toISOString() };
}

/**
 * Гонка двух кликов «Подобрать темы»: проверка лимита и вставка job не атомарны, поэтому роут после
 * вставки сверяется - выигрывает самый ранний запрос в окне суток (created_at, при равенстве -
 * меньший id), остальные удаляют свои ещё не взятые job и получают отказ по лимиту.
 */
export interface GenerateJobRef { id: string; created_at: string }
export function isFirstGenerateRequest(mine: GenerateJobRef[], others: GenerateJobRef[], now: number = Date.now()): boolean {
  if (mine.length === 0) return false;
  const key = (j: GenerateJobRef): [number, string] => [Date.parse(j.created_at), j.id];
  const before = (a: [number, string], b: [number, string]) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  const myFirst = mine.map(key).reduce((m, k) => (before(k, m) ? k : m));
  return !others.map(key).some((k) => Number.isFinite(k[0]) && now - k[0] < GENERATE_COOLDOWN_MS && before(k, myFirst));
}

export const MAX_TOPICS_PER_EXPERT = 20;
export const TOP_PRIORITY_COUNT = 10;
export interface PlanQuestion { id: string; question_text: string }
export interface PlanExpert { id: string; eligible: boolean; telegram_id?: number | null }
export interface PlannedOrder { expert_id: string; question_id: string; is_priority: boolean }
export interface ExpertOrdersPlan {
  orders: PlannedOrder[];
  notify: Array<{ expert_id: string; telegram_id: number; count: number; samples: string[] }>;
}
/**
 * План выдачи тем: вопросы уже отсортированы продюсером (gap_score, частотность). onlyExpertId -
 * ручной запуск «Подобрать темы сейчас»: темы получает только этот эксперт; без него - недельный
 * cron по всем экспертам ниши (поведение до R-06). Дедуп по уже выданным парам эксперт-вопрос.
 */
export function planExpertOrders(input: {
  questions: PlanQuestion[]; experts: PlanExpert[]; existing: Iterable<string>; onlyExpertId?: string | null;
}): ExpertOrdersPlan {
  const taken = new Set(input.existing);
  const plan: ExpertOrdersPlan = { orders: [], notify: [] };
  for (const expert of input.experts) {
    if (!expert.eligible) continue;
    if (input.onlyExpertId && expert.id !== input.onlyExpertId) continue;
    let count = 0;
    const samples: string[] = [];
    for (const q of input.questions) {
      if (count >= MAX_TOPICS_PER_EXPERT) break;
      const key = `${expert.id}:${q.id}`;
      if (taken.has(key)) continue;
      taken.add(key);
      plan.orders.push({ expert_id: expert.id, question_id: q.id, is_priority: count < TOP_PRIORITY_COUNT });
      if (samples.length < 3) samples.push(q.question_text);
      count += 1;
    }
    // Как в прежнем цикле handler'а: уведомление только при непустом telegram_id (0 и null - нет).
    if (count > 0 && expert.telegram_id) plan.notify.push({ expert_id: expert.id, telegram_id: expert.telegram_id, count, samples });
  }
  return plan;
}
