/**
 * Оракул юнита AF-0 «Контракты и runtime-preflight автономной delivery» (ADR-003).
 *
 * Проверяет предпосылки автономной delivery, зафиксированные в acceptance AF-0:
 *
 *   РЕПО (по исходникам, без сети — работает в isolated-staged-tree):
 *     - раздел «Контракт продукта Audit Start v1» в docs/plan/SELF_SERVE_PLAN.md
 *       присутствует целиком: шесть секций и нормативные маркеры (7 900 ₽,
 *       порог ≥ 2 платформ и 8 из 10 вопросов, SLA p95 ≤ 15 минут / 60 минут,
 *       автоматический 100% возврат, sub_queries НЕ входят в отчёт);
 *     - явное решение по 754 историческим expand_query в CURRENT_PLAN.md:
 *       пункт закрыт ([x]) и содержит «выбран archive»;
 *     - фаза C (ADR-002/ADR-003): SALES_LOG.md существует и последняя строка
 *       валидна по формату `YYYY-MM-DD | касания N | ответы N | демо N | оплаты N`.
 *       Флаг --check-sales-today дополнительно требует строку за СЕГОДНЯ —
 *       этот режим предназначен для pre-commit hook фазы C (пункт C3 плана);
 *       его подключение к hook — отдельное решение владельца.
 *
 *   ЖИВОЙ КОНТУР (по --base-url, штатно гоняется с прод-сервера):
 *     - canary magic-link/SMTP: /api/health -> auth.magic_link_ready === true
 *       и auth.smtp_configured === true;
 *     - canary expand_query: worker.last_expand_query.status === "completed"
 *       И worker.last_expand_query.subqueries >= 1 — свидетельство по
 *       существу (QUEUE-4: «completed» с нулём подзапросов — пустой успех, а
 *       не канарейка);
 *     - canary кассы: POST /api/webhooks/yukassa пустым JSON -> 4xx, но не 404
 *       (маршрут существует и отвергает неавторизованный/мусорный вход; 2xx на
 *       мусор или 5xx — дефект). Честная граница: при настроенных IP-allowlist
 *       или shared-secret ответ 401/403 приходит ДО payload-валидации, так что
 *       канарейка доказывает «webhook жив и закрыт», а не полную валидацию тела;
 *     - граница автоматизации: на /pricing размечены блоки
 *       data-automation-boundary для audit-start, launch-start и managed-lite;
 *       на /audit — блок audit-start.
 *
 * ЗАЯВЛЕННАЯ ГРАНИЦА (не расширять молча):
 *   Оракул не создаёт jobs, не проводит и не возвращает платежи, не дергает
 *   LLM-провайдеров (runtime pre-flight провайдеров — код G-018) и не судит
 *   СМЫСЛ контракта или текста границы автоматизации — только наличие,
 *   разметку и машинные свидетельства. «Канарейка прошла» доказывается
 *   следами в /api/health, а не мутацией со стороны оракула.
 *
 * Коды выхода (как у verify-payment-path.mjs):
 *   0 — находок нет;
 *   1 — есть находки (построчно: где и что);
 *   2 — ошибка использования;
 *   3 — транспорт: живой контур недоступен. НЕ находка юнита — канал
 *       WSL -> прод рвётся регулярно (инцидент 2026-08-27).
 *
 * Тестируемость: --fixture-dir <dir> полностью заменяет сеть файлами
 * health.json, webhook.json ({"status": N}), pricing.html, audit.html;
 * --repo-root подменяет корень репозитория. Оба флага — для мутационного
 * теста scripts/tests/preflight.test.mjs.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { findElementsWithAttribute } from "./lib/html-blocks.mjs";

const KNOWN_FLAGS = new Set([
  "--base-url",
  "--fixture-dir",
  "--repo-root",
  "--repo-only",
  "--check-sales-today",
  "--check-alerts",
  "--check-paid-alert",
]);

const argv = process.argv.slice(2);
let baseUrlArg = null;
let fixtureDir = null;
let repoRootArg = null;
let repoOnly = false;
let checkSalesToday = false;
let checkAlerts = false; // R-02: алерты оператору (репо + health.alerts)
let checkPaidAlert = false; // R-04' (R-04b): алерт order_paid при оплате — триггер ручного чека самозанятого

for (let i = 0; i < argv.length; i += 1) {
  const flag = argv[i];
  if (!KNOWN_FLAGS.has(flag)) {
    console.error(`usage: неизвестный флаг ${flag}`);
    process.exit(2);
  }
  if (flag === "--base-url") { baseUrlArg = argv[++i] ?? null; continue; }
  if (flag === "--fixture-dir") { fixtureDir = argv[++i] ?? null; continue; }
  if (flag === "--repo-root") { repoRootArg = argv[++i] ?? null; continue; }
  if (flag === "--repo-only") { repoOnly = true; continue; }
  if (flag === "--check-sales-today") { checkSalesToday = true; continue; }
  if (flag === "--check-alerts") { checkAlerts = true; continue; }
  // Триггер чека без канала алертов бессмыслен: --check-paid-alert включает и контракт R-02.
  if (flag === "--check-paid-alert") { checkPaidAlert = true; checkAlerts = true; continue; }
}

if (fixtureDir && baseUrlArg) {
  console.error("usage: --fixture-dir и --base-url взаимоисключающи");
  process.exit(2);
}

// Корень репозитория — от файла скрипта, не от process.cwd() (запуск из
// другого каталога иначе молча отключал бы проверки по исходникам).
const repoRoot = repoRootArg
  ? resolve(repoRootArg)
  : resolve(dirname(fileURLToPath(import.meta.url)), "..");

const baseUrl = (baseUrlArg
  || process.env.PREFLIGHT_URL
  || process.env.CANONICAL_URL
  || "").replace(/\/+$/, "");

if (!repoOnly && !fixtureDir && !baseUrl) {
  console.error(
    "usage: нужен живой контур (--base-url / PREFLIGHT_URL / CANONICAL_URL), "
    + "--fixture-dir для оффлайн-фикстур или явный --repo-only",
  );
  process.exit(2);
}

const MAX_ATTEMPTS = Number(process.env.PREFLIGHT_ATTEMPTS || 4);
const RETRY_DELAY_MS = Number(process.env.PREFLIGHT_RETRY_DELAY_MS || 1500);
const REQUEST_TIMEOUT_MS = Number(process.env.PREFLIGHT_TIMEOUT_MS || 20_000);

const findings = [];
function finding(where, why, fix) {
  findings.push(`${where}: ${why} — FIX: ${fix}`);
}

// ============================================================
// Слой РЕПО
// ============================================================

function readRepoFile(rel) {
  const abs = join(repoRoot, rel);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, "utf8");
}

function checkContractSection() {
  const rel = "docs/plan/SELF_SERVE_PLAN.md";
  const text = readRepoFile(rel);
  if (text === null) {
    finding(rel, "файл не найден", "контракт Audit Start живёт в этом документе");
    return;
  }
  const start = text.indexOf("## Контракт продукта Audit Start v1");
  if (start < 0) {
    finding(rel, "раздел «Контракт продукта Audit Start v1» отсутствует",
      "зафиксировать контракт до кода приёма денег (acceptance AF-0)");
    return;
  }
  // Секция заканчивается на следующем `## `-заголовке того же уровня.
  const tail = text.slice(start + 2);
  const endRel = tail.search(/\n## /);
  const section = text.slice(start, endRel >= 0 ? start + 2 + endRel : text.length);

  const requiredHeadings = [
    ["### 1. SKU", "секция SKU"],
    ["### 2. Report schema", "секция report schema"],
    ["### 3. Provenance", "секция provenance"],
    ["### 4. Degraded mode", "секция degraded mode"],
    ["### 5. SLA", "секция SLA"],
    ["### 6. Refund / failure policy", "секция refund/failure policy"],
  ];
  for (const [marker, label] of requiredHeadings) {
    if (!section.includes(marker)) {
      finding(rel, `${label} («${marker}») отсутствует в контракте`,
        "контракт фиксируется целиком — все шесть решений");
    }
  }

  const requiredMarkers = [
    ["7 900", "цена SKU 7 900 ₽ (заморожена до AF-1-COMM)"],
    ["≥ 2 платформы", "degraded-порог живых платформ"],
    ["8 из 10", "degraded-порог покрытия вопросов"],
    ["p95 ≤ 15 минут", "SLA-цель"],
    ["60 минут", "жёсткая SLA-граница"],
    ["автоматический 100% возврат", "refund policy без заявки"],
  ];
  for (const [marker, label] of requiredMarkers) {
    if (!section.includes(marker)) {
      finding(rel, `нормативный маркер «${marker}» (${label}) отсутствует`,
        "нормативные значения контракта не должны молча меняться");
    }
  }

  // sub_queries вне отчёта — условие окончательности archive-решения по 754.
  if (!(section.includes("sub_queries") && section.includes("НЕ входят"))) {
    finding(rel, "в контракте нет фиксации «sub_queries ... НЕ входят» в отчёт",
      "без неё archive-решение по 754 теряет основание окончательности");
  }
}

function check754Decision() {
  const rel = "CURRENT_PLAN.md";
  const text = readRepoFile(rel);
  if (text === null) {
    finding(rel, "файл не найден", "канонический план обязателен");
    return;
  }
  if (!/-\s\[x\]\s[^\n]*754[^\n]*выбран archive/.test(text)) {
    finding(rel, "закрытый пункт ([x]) с решением «выбран archive» по 754 не найден",
      "явное решение по историческим failures — пункт acceptance AF-0");
  }
}

const SALES_LINE_RE =
  /^(\d{4}-\d{2}-\d{2})\s*\|\s*касания\s+\d+\s*\|\s*ответы\s+\d+\s*\|\s*демо\s+\d+\s*\|\s*оплаты\s+\d+\s*(\|.*)?$/;

function checkSalesLog() {
  const rel = "SALES_LOG.md";
  const text = readRepoFile(rel);
  if (text === null) {
    finding(rel, "файл не существует",
      "фаза C (ADR-002/ADR-003): строка на день формата "
      + "«YYYY-MM-DD | касания N | ответы N | демо N | оплаты N»");
    return;
  }
  const entries = text.split("\n").filter((l) => /^\d{4}-\d{2}-\d{2}\s*\|/.test(l.trim()));
  if (entries.length === 0) {
    finding(rel, "нет ни одной строки-записи", "формат: «YYYY-MM-DD | касания N | ответы N | демо N | оплаты N»");
    return;
  }
  const last = entries[entries.length - 1].trim();
  const m = last.match(SALES_LINE_RE);
  if (!m) {
    finding(rel, `последняя запись не соответствует формату: «${last.slice(0, 80)}»`,
      "формат: «YYYY-MM-DD | касания N | ответы N | демо N | оплаты N»");
    return;
  }
  if (checkSalesToday) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (m[1] !== today) {
      finding(rel, `последняя запись за ${m[1]}, сегодня ${today}`,
        "фаза C идёт ДО implementation unit: внести сегодняшнюю строку");
    }
  }
}

// ============================================================
// Живой контур (сеть или фикстуры)
// ============================================================

const transportErrors = [];

function sleep(ms) {
  return new Promise((r) => { setTimeout(r, ms); });
}

async function fetchWithRetry(url, init) {
  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        return await fetch(url, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }
  throw lastErr;
}

function readFixture(name) {
  const abs = join(fixtureDir, name);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, "utf8");
}

async function getHealth() {
  if (fixtureDir) {
    const raw = readFixture("health.json");
    if (raw === null) {
      finding("fixture:health.json", "фикстура отсутствует", "положить health.json в --fixture-dir");
      return null;
    }
    return JSON.parse(raw);
  }
  const res = await fetchWithRetry(`${baseUrl}/api/health`, { method: "GET" });
  if (!res.ok) {
    finding("/api/health", `HTTP ${res.status}`, "health обязан отвечать 200");
    return null;
  }
  return res.json();
}

function checkHealthPayload(health) {
  if (!health) return;
  const auth = health.auth ?? {};
  if (auth.smtp_configured !== true) {
    finding("/api/health", "auth.smtp_configured !== true",
      "canary SMTP: без почты magic link и письма статуса заказа не уходят");
  }
  if (auth.magic_link_ready !== true) {
    finding("/api/health", "auth.magic_link_ready !== true",
      "canary magic-link: SMTP сконфигурирован И auth-сервис здоров");
  }
  // Канарейка доказывается СУЩЕСТВОМ, а не статусом: 2026-09-01 job закрылся
  // «completed» с нулём подзапросов (QUEUE-4). Health отдаёт число реально
  // созданных sub_queries последнего expand_query — требуем его.
  const last = health.worker?.last_expand_query;
  if (!last || typeof last !== "object") {
    finding("/api/health", "worker.last_expand_query отсутствует",
      "health обязан отдавать свидетельство последнего expand_query "
      + "(status + subqueries) — иначе пустой успех невидим");
  } else if (last.status !== "completed") {
    finding("/api/health", `последний expand_query в статусе «${last.status}»`
      + (last.error ? ` (${String(last.error).slice(0, 100)})` : ""),
      "canary expand_query: один НОВЫЙ прогон должен завершиться успешно "
      + "(после архивации QUEUE-1; массовый replay запрещён)");
  } else if (!(Number(last.subqueries) >= 1)) {
    finding("/api/health", `последний expand_query completed, но subqueries=${last.subqueries ?? "null"}`,
      "пустой fan-out — не успех: провайдер вернул ноль подзапросов");
  }
  // DEMAND-3 (OPS-DEBT-1): живость провайдеров, а не наличие ключей. Пустой баланс
  // XMLRIVER и заблокированное облако Yandex проходили тихо (2026-09-05) — health
  // обязан отдавать блок providers и не деградировать по нему.
  const providers = health.providers;
  const summary = health.providers_summary;
  if (!providers || typeof providers !== "object" || !summary || typeof summary !== "object") {
    finding("/api/health", "блок providers / providers_summary отсутствует",
      "health обязан пробовать Wordstat и LLM-платформы (DEMAND-3) и отдавать состояния ok|no_key|forbidden|no_balance|empty|error");
  } else if (summary.degraded === true) {
    const reasons = Array.isArray(summary.reasons) ? summary.reasons.join("; ") : "";
    const wordstat = providers.wordstat?.state ?? "missing";
    finding("/api/health", `providers degraded (${reasons || `wordstat ${wordstat}, llm_ok ${summary.llm_ok}`})`,
      "пополнить баланс XMLRIVER / разблокировать биллинг облака / проверить ключи — сбор спроса и замер не выполнятся штатно");
  }
}

async function checkWebhookRoute() {
  let status;
  if (fixtureDir) {
    const raw = readFixture("webhook.json");
    if (raw === null) {
      finding("fixture:webhook.json", "фикстура отсутствует", "положить webhook.json ({\"status\": N})");
      return;
    }
    status = Number(JSON.parse(raw).status);
  } else {
    const res = await fetchWithRetry(`${baseUrl}/api/webhooks/yukassa`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    status = res.status;
  }
  if (status === 404) {
    finding("/api/webhooks/yukassa", "маршрут отсутствует (404)",
      "canary кассы: webhook ЮKassa обязан существовать");
  } else if (status >= 500) {
    finding("/api/webhooks/yukassa", `пустой запрос валит маршрут (HTTP ${status})`,
      "мусорный вход должен отвергаться 4xx, а не падать");
  } else if (status < 400) {
    finding("/api/webhooks/yukassa", `пустой запрос принят (HTTP ${status})`,
      "webhook без валидации принимает мусор — идемпотентность и подпись обязательны");
  }
}

const BOUNDARY_ATTR = "data-automation-boundary";
const BOUNDARY_REQUIREMENTS = [
  { route: "/pricing", fixture: "pricing.html", required: ["audit-start", "launch-start", "managed-lite"] },
  { route: "/audit", fixture: "audit.html", required: ["audit-start"] },
];

async function checkAutomationBoundary() {
  for (const { route, fixture, required } of BOUNDARY_REQUIREMENTS) {
    let html;
    if (fixtureDir) {
      html = readFixture(fixture);
      if (html === null) {
        finding(`fixture:${fixture}`, "фикстура отсутствует", `положить ${fixture} в --fixture-dir`);
        continue;
      }
    } else {
      const res = await fetchWithRetry(`${baseUrl}${route}`, { method: "GET" });
      if (!res.ok) {
        finding(route, `HTTP ${res.status}`, "страница платного SKU обязана отвечать 200");
        continue;
      }
      html = await res.text();
    }
    const blocks = findElementsWithAttribute(html, BOUNDARY_ATTR);
    const values = new Set(blocks.map((b) => (b.attrs.get(BOUNDARY_ATTR) || "").trim()));
    for (const sku of required) {
      if (!values.has(sku)) {
        finding(route, `нет блока ${BOUNDARY_ATTR}="${sku}"`,
          "граница автоматизации: на каждом платном SKU явно указать, что "
          + "делает система сама, а что требует человека/доступов клиента");
      }
    }
  }
}

// ============================================================
// Прогон
// ============================================================

/**
 * R-02 «Алерты оператору» (ADR-004): единый notifyOperator с дедупликацией в БД, точки вызова во
 * всех исключениях штатного пути, health.alerts. Каждая группа = один шаг контракта
 * .itd-memory/contracts/R-02.md = одна находка (какие бы needles ни отсутствовали).
 */
function checkAlertsRepo() {
  const groups = {
    migration: [["packages/supabase/migrations/030_operator_alerts.sql", [
      "operator_alerts", "claim_operator_alert", "record_operator_alert_error", "last_sent_at", "p_dedup_seconds"]]],
    shared: [
      ["packages/shared/src/ops/alerts.ts", ["formatOperatorAlert", "alertDedupSeconds", "\"health_degraded\"", "\"service_order\"", "\"quota_exhausted\""]],
      ["packages/shared/src/ops/notify-operator.ts", ["createOperatorNotifier", "deps.claim(", "recordError", "\"deduped\""]],
    ],
    worker: [
      ["apps/worker/src/services/operator-alerts.ts", ["claim_operator_alert", "TELEGRAM_ADMIN_CHAT_ID", "tgFetch", "createOperatorNotifier"]],
      ["apps/worker/src/services/audit-delivery.ts", ["notifyOperator?.(\"order_failed\"", "notifyOperator?.(\"order_refunded\"", "notifyOperator?.(\"sla_breached\"", "notifyOperator?.(\"email_failed\""]],
      ["apps/worker/src/services/payment-reconcile.ts", ["notifyOperator?.(\"reconcile_mismatch\"", "notifyOperator?.(\"reconcile_errors\""]],
      ["apps/worker/src/index.ts", ["notifyOperator(\"quota_exhausted\"", "notifyOperator(\"health_degraded\"", "/api/health"]],
    ],
    web: [
      ["apps/web/lib/operator-alerts.ts", ["claim_operator_alert", "createOperatorNotifier"]],
      ["apps/web/app/api/service-orders/route.ts", ["notifyOperator(\"service_order\""]],
      ["apps/web/app/api/health/route.ts", ["operator_alerts", "sent_24h", "failed_24h", "alerts:"]],
    ],
  };
  for (const [name, files] of Object.entries(groups)) {
    const missing = [];
    for (const [rel, needles] of files) {
      const text = readRepoFile(rel);
      if (text === null) { missing.push(`${rel}: файл отсутствует`); continue; }
      for (const n of needles) if (!text.includes(n)) missing.push(`${rel}: нет «${n}»`);
    }
    if (missing.length > 0) finding(`[alerts:${name}]`, missing.join("; "), "реализовать контракт R-02 (.itd-memory/contracts/R-02.md)");
  }
}

/**
 * R-04' (R-04b): триггер чека самозанятого. ЮKassa чеки самозанятых не формирует (сервис закрыт
 * 29.12.2025), поэтому при переходе заказа в paid оператор обязан получить алерт order_paid из обоих
 * мест перехода — webhook payment.succeeded и сверка R-01 (markPaid). Needles — литералы вызовов,
 * чтобы «алерт в логе» или «алерт другого вида» не проходили.
 */
function checkPaidAlertRepo() {
  const files = [
    ["packages/shared/src/ops/alerts.ts", ["\"order_paid\"", "Мой налог"]],
    ["apps/web/app/api/webhooks/yukassa/route.ts", ["@/lib/operator-alerts", "notifyOperator(\"order_paid\""]],
    ["apps/worker/src/services/payment-reconcile.ts", ["notifyOperator?.(\"order_paid\""]],
    // Канарейка оплаты без реальных денег: под канареечным заголовком магазин всегда тестовый.
    ["apps/web/app/api/orders/route.ts", ["canaryAllowed(request) ? \"dark\" : mode"]],
  ];
  const missing = [];
  for (const [rel, needles] of files) {
    const text = readRepoFile(rel);
    if (text === null) { missing.push(`${rel}: файл отсутствует`); continue; }
    for (const n of needles) if (!text.includes(n)) missing.push(`${rel}: нет «${n}»`);
  }
  if (missing.length > 0) finding("[paid-alert]", missing.join("; "), "реализовать контракт R-04b (.itd-memory/contracts/R-04b.md): алерт order_paid в webhook и сверке");
}

/** R-02 живой слой: health.alerts — last_sent_at (строка ISO или null), sent_24h/failed_24h целые >= 0. */
function checkAlertsHealth(health) {
  const a = health?.alerts;
  if (!a || typeof a !== "object") { finding("/api/health", "блок alerts отсутствует", "вернуть alerts из таблицы operator_alerts"); return; }
  if (!(a.last_sent_at === null || (typeof a.last_sent_at === "string" && !Number.isNaN(Date.parse(a.last_sent_at))))) {
    finding("/api/health", "alerts.last_sent_at не ISO-строка и не null", "отдавать max(last_sent_at) или null");
  }
  for (const k of ["sent_24h", "failed_24h"]) {
    if (!Number.isInteger(a[k]) || a[k] < 0) finding("/api/health", `alerts.${k} отсутствует или неверен (миграция 030 не применена?)`, "применить 030 и считать за 24 часа");
  }
}

checkContractSection();
check754Decision();
checkSalesLog();
if (checkAlerts) checkAlertsRepo();
if (checkPaidAlert) checkPaidAlertRepo();

if (!repoOnly) {
  try {
    const health = await getHealth();
    checkHealthPayload(health);
    if (checkAlerts) checkAlertsHealth(health);
    await checkWebhookRoute();
    await checkAutomationBoundary();
  } catch (err) {
    transportErrors.push(err instanceof Error ? err.message : String(err));
  }
}

// Находки печатаются ВСЕГДА и доминируют над транспортом: repo-слой не зависит
// от сети, и exit 3 не имеет права маскировать реальную находку (находка ревью
// 2026-08-31: транспортная ошибка теряла накопленные repo-находки).
if (findings.length > 0) {
  for (const f of findings) console.error(f);
  console.error(`\n${findings.length} finding(s).`);
  if (transportErrors.length > 0) {
    console.error(`transport (дополнительно): живой контур недоступен: ${transportErrors.join("; ")}`);
  }
  process.exit(1);
}

if (transportErrors.length > 0) {
  console.error(`transport: живой контур недоступен: ${transportErrors.join("; ")}`);
  process.exit(3);
}

const target = repoOnly ? "repo-only" : (fixtureDir ? `fixtures:${fixtureDir}` : baseUrl);
console.log(`Preflight verification passed for ${target}`);
process.exit(0);
