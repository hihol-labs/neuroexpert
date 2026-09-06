/**
 * Проба провайдеров для /api/health (DEMAND-3, OPS-DEBT-1).
 *
 * Два инцидента 2026-09-05 прошли тихо: пустой баланс XMLRIVER дал «успешный» сбор
 * с 0 фраз, заблокированное по биллингу облако Yandex отдавало 403 — отчёты уходили
 * в degraded. Health обязан различать «нет ключа», «нет прав/биллинга», «нет баланса»
 * и «ошибка», а не только «ключ задан». Здесь — чистая классификация ответов
 * (тестируется без сети); HTTP-вызовы и кеш — apps/web/lib/providers-probe.ts.
 */

import { PREFLIGHT_MIN_PLATFORMS } from "../orders/preflight.js";

export const PROVIDER_IDS = ["wordstat", "openai", "yandexgpt", "gigachat", "perplexity"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

/** LLM-платформы, которые считает pre-flight (countConfiguredPlatforms). */
export const LLM_PROVIDER_IDS: readonly ProviderId[] = ["openai", "yandexgpt", "gigachat", "perplexity"];

export type ProviderState = "ok" | "no_key" | "forbidden" | "no_balance" | "empty" | "error" | "skipped";

export interface ProviderProbe {
  state: ProviderState;
  /** Короткая причина без секретов (HTTP-код, фрагмент ошибки). */
  detail: string | null;
  checked_at: string;
}

export type ProvidersReport = Record<ProviderId, ProviderProbe>;

/** Живых LLM-платформ должно быть не меньше порога pre-flight (§6 контракта). */
export const PROVIDERS_MIN_LLM = PREFLIGHT_MIN_PLATFORMS;
/** Проба не дёргает провайдеров чаще раза в 10 минут. */
export const PROVIDERS_CACHE_MS = 10 * 60_000;

const BALANCE_RE = /баланс|средств|balance|insufficient_quota|quota|billing|payment required|не оплачен|заблокирован/i;

/** Классификация HTTP-ответа LLM-провайдера (тело — только для текста ошибки). */
export function classifyHttpProbe(status: number, bodyText: string): { state: ProviderState; detail: string | null } {
  if (status >= 200 && status < 300) return { state: "ok", detail: null };
  const snippet = bodyText.replace(/\s+/g, " ").trim().slice(0, 120);
  if (status === 402 || (status === 429 && BALANCE_RE.test(bodyText))) return { state: "no_balance", detail: `HTTP ${status}: ${snippet}` };
  if (status === 401 || status === 403) {
    // 403 у Yandex Cloud приходит и при блокировке облака по биллингу (инцидент 2026-09-05).
    return { state: BALANCE_RE.test(bodyText) ? "no_balance" : "forbidden", detail: `HTTP ${status}: ${snippet}` };
  }
  return { state: "error", detail: `HTTP ${status}: ${snippet}` };
}

/**
 * Классификация ответа XMLRIVER Wordstat (`pagetype=words`) на общее слово:
 * ошибка сервиса приходит в теле (JSON `error` или XML `<error>`), а не HTTP-кодом;
 * ноль фраз на общий запрос — тоже сигнал (так выглядел пустой баланс).
 */
export function classifyWordstatBody(status: number, bodyText: string): { state: ProviderState; detail: string | null } {
  if (!(status >= 200 && status < 300)) return { state: "error", detail: `HTTP ${status}` };
  const text = bodyText.trim();
  let errorText: string | null = null;
  let items = 0;
  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    const err = json.error ?? json.Error ?? json.message;
    if (typeof err === "string" && err.trim()) errorText = err.trim();
    else if (err && typeof err === "object" && typeof (err as Record<string, unknown>).message === "string") errorText = String((err as Record<string, unknown>).message);
    const content = (json.content ?? {}) as Record<string, { items?: unknown[] }>;
    items = [json.popular, json.associations, content.includingPhrases?.items, content.phrasesAssociations?.items]
      .reduce<number>((n, list) => n + (Array.isArray(list) ? list.length : 0), 0);
  } catch {
    const m = text.match(/<error[^>]*>([\s\S]*?)<\/error>/i);
    if (m) errorText = m[1].trim();
    items = (text.match(/<(?:phrase|item|word)\b/gi) ?? []).length;
  }
  if (errorText) {
    const detail = errorText.slice(0, 120);
    if (BALANCE_RE.test(errorText)) return { state: "no_balance", detail };
    if (/key|ключ|user|auth|denied|запрещ|нет доступа/i.test(errorText)) return { state: "forbidden", detail };
    return { state: "error", detail };
  }
  if (items === 0) return { state: "empty", detail: "0 фраз на общий запрос — похоже на пустой баланс или лимит" };
  return { state: "ok", detail: null };
}

export interface ProvidersSummary {
  /** LLM-платформ в состоянии ok. */
  llm_ok: number;
  /** Порог живых LLM-платформ (pre-flight). */
  llm_required: number;
  wordstat_ok: boolean;
  /** true — health обязан отдавать degraded: сбор спроса или замер не выполнятся штатно. */
  degraded: boolean;
  reasons: string[];
}

/** Сводка: degraded, если Wordstat не ok или живых LLM меньше порога. `skipped` не считается. */
export function summarizeProviders(report: Partial<ProvidersReport>): ProvidersSummary {
  const reasons: string[] = [];
  const llmOk = LLM_PROVIDER_IDS.filter((id) => report[id]?.state === "ok").length;
  const wordstat = report.wordstat?.state ?? "skipped";
  const allSkipped = PROVIDER_IDS.every((id) => (report[id]?.state ?? "skipped") === "skipped");
  if (allSkipped) return { llm_ok: llmOk, llm_required: PROVIDERS_MIN_LLM, wordstat_ok: false, degraded: false, reasons: ["probe skipped"] };
  if (wordstat !== "ok") reasons.push(`wordstat ${wordstat}`);
  if (llmOk < PROVIDERS_MIN_LLM) reasons.push(`llm ok ${llmOk} < ${PROVIDERS_MIN_LLM}`);
  return { llm_ok: llmOk, llm_required: PROVIDERS_MIN_LLM, wordstat_ok: wordstat === "ok", degraded: reasons.length > 0, reasons };
}
