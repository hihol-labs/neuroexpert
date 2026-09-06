// Проба провайдеров для /api/health (DEMAND-3, OPS-DEBT-1).
// Лёгкие вызовы (без генерации, где возможно), кеш PROVIDERS_CACHE_MS на процесс:
// health опрашивают оракулы и мониторинг, провайдеров дёргать на каждый запрос нельзя.
// Классификация ответов — packages/shared/src/providers/probe.ts (чистая, с тестами).
import {
  PROVIDERS_CACHE_MS,
  classifyHttpProbe,
  classifyWordstatBody,
  summarizeProviders,
  type ProviderId,
  type ProviderProbe,
  type ProvidersReport,
  type ProvidersSummary,
} from "shared";

const PROBE_TIMEOUT_MS = 15_000;
// Общее слово с гарантированным спросом: нулевой ответ на него — сигнал, а не факт.
const WORDSTAT_PROBE_QUERY = "стоматология";

let cache: { at: number; report: ProvidersReport; summary: ProvidersSummary } | null = null;
let inflight: Promise<{ report: ProvidersReport; summary: ProvidersSummary }> | null = null;

function probeEnabled(): boolean {
  return process.env.PROVIDERS_PROBE !== "off";
}

function result(state: ProviderProbe["state"], detail: string | null = null): ProviderProbe {
  return { state, detail, checked_at: new Date().toISOString() };
}

type FetchFn = typeof globalThis.fetch;

/**
 * OpenAI/Perplexity с сервера в РФ доступны только через прокси — тот же
 * OPENAI_PROXY_URL, что использует /api/audit (иначе проба видит 403
 * unsupported_country_region_territory при живом ChatGPT в отчётах — канарейка 2026-09-06).
 */
async function proxiedFetch(): Promise<FetchFn> {
  const proxyUrl = process.env.OPENAI_PROXY_URL;
  if (!proxyUrl) return fetch;
  const { ProxyAgent } = await import("undici");
  const dispatcher = new ProxyAgent(proxyUrl);
  return (url, init) =>
    // @ts-expect-error undici dispatcher type
    fetch(url, { ...init, dispatcher });
}

async function httpProbe(url: string, init: RequestInit, doFetch: FetchFn = fetch): Promise<ProviderProbe> {
  try {
    const res = await doFetch(url, { ...init, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    const text = res.ok ? "" : await res.text().catch(() => "");
    const c = classifyHttpProbe(res.status, text);
    return result(c.state, c.detail);
  } catch (err) {
    return result("error", `transport: ${err instanceof Error ? err.message : String(err)}`.slice(0, 120));
  }
}

async function probeWordstat(): Promise<ProviderProbe> {
  const user = process.env.XMLRIVER_USER_ID || process.env.XMLRIVER_USER || "";
  const key = process.env.XMLRIVER_API_KEY || process.env.XMLRIVER_KEY || "";
  if (!user || !key) return result("no_key");
  const url = new URL(process.env.XMLRIVER_WORDSTAT_URL || "https://xmlriver.com/wordstat/new/json");
  url.searchParams.set("user", user);
  url.searchParams.set("key", key);
  url.searchParams.set("query", WORDSTAT_PROBE_QUERY);
  url.searchParams.set("page", "1");
  url.searchParams.set("pagetype", "words");
  try {
    // redirect: "error" — ключ в query не должен уйти на другой хост при неожиданном редиректе.
    const res = await fetch(url.toString(), { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    const text = await res.text().catch(() => "");
    const c = classifyWordstatBody(res.status, text);
    return result(c.state, c.detail);
  } catch (err) {
    return result("error", `transport: ${err instanceof Error ? err.message : String(err)}`.slice(0, 120));
  }
}

async function probeOpenAI(): Promise<ProviderProbe> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return result("no_key");
  // Список моделей — аутентифицированный вызов без расхода токенов; через прокси, как /api/audit.
  return httpProbe("https://api.openai.com/v1/models", { method: "GET", headers: { Authorization: `Bearer ${key}` } }, await proxiedFetch());
}

async function probePerplexity(): Promise<ProviderProbe> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return result("no_key");
  return httpProbe("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "sonar", max_tokens: 1, messages: [{ role: "user", content: "ping" }] }),
  }, await proxiedFetch());
}

async function probeYandexGPT(): Promise<ProviderProbe> {
  const key = process.env.YANDEX_API_KEY;
  const folder = process.env.YANDEX_FOLDER_ID;
  if (!key || !folder) return result("no_key");
  // Минимальная генерация: 403 здесь означает и блокировку облака по биллингу (2026-09-05).
  return httpProbe("https://llm.api.cloud.yandex.net/foundationModels/v1/completion", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Api-Key ${key}`, "x-folder-id": folder },
    body: JSON.stringify({ modelUri: `gpt://${folder}/yandexgpt-lite/latest`, completionOptions: { maxTokens: 1, temperature: 0 }, messages: [{ role: "user", text: "ping" }] }),
  });
}

async function probeGigaChat(): Promise<ProviderProbe> {
  const id = process.env.GIGACHAT_CLIENT_ID;
  const secret = process.env.GIGACHAT_CLIENT_SECRET;
  if (!id || !secret) return result("no_key");
  // Только OAuth-токен: подтверждает ключи и доступ без генерации.
  return httpProbe("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      RqUID: crypto.randomUUID(),
    },
    body: "scope=GIGACHAT_API_PERS",
  });
}

const PROBES: Record<ProviderId, () => Promise<ProviderProbe>> = {
  wordstat: probeWordstat,
  openai: probeOpenAI,
  yandexgpt: probeYandexGPT,
  gigachat: probeGigaChat,
  perplexity: probePerplexity,
};

async function runProbes(): Promise<{ report: ProvidersReport; summary: ProvidersSummary }> {
  const ids = Object.keys(PROBES) as ProviderId[];
  const probes = await Promise.all(ids.map((id) => PROBES[id]().catch((err) => result("error", String(err).slice(0, 120)))));
  const report = Object.fromEntries(ids.map((id, i) => [id, probes[i]])) as ProvidersReport;
  return { report, summary: summarizeProviders(report) };
}

/** Отчёт по провайдерам с кешем; при PROVIDERS_PROBE=off — все `skipped`, health не деградирует. */
export async function getProvidersReport(now: number = Date.now()): Promise<{ report: ProvidersReport; summary: ProvidersSummary; cached: boolean }> {
  if (!probeEnabled()) {
    const ids = Object.keys(PROBES) as ProviderId[];
    const report = Object.fromEntries(ids.map((id) => [id, result("skipped", "PROVIDERS_PROBE=off")])) as ProvidersReport;
    return { report, summary: summarizeProviders(report), cached: false };
  }
  if (cache && now - cache.at < PROVIDERS_CACHE_MS) return { report: cache.report, summary: cache.summary, cached: true };
  if (!inflight) {
    inflight = runProbes().finally(() => { inflight = null; });
  }
  const fresh = await inflight;
  cache = { at: Date.now(), report: fresh.report, summary: fresh.summary };
  return { ...fresh, cached: false };
}
