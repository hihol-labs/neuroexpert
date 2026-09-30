#!/usr/bin/env node
/**
 * Оракул экспертного контура (ADR-004, R-05+). Стадии:
 *   --stage=infra   R-05: pg_cron установлен и расписания weekly-demand / weekly-generate-orders
 *                   активны; bucket voice приватный и создаётся миграцией; бот и web обязаны
 *                   загрузить аудио в Storage до записи voice_recordings; health отдаёт cron/storage.
 *   --stage=demand  R-06, --stage=publish R-07, --stage=notify R-08,
 *   --stage=billing R-09: лимиты тарифа применяются на входах и в генерации, подписка кончается,
 *                   сумма сверяется с ценой, аналитика цитирования для всех опубликованных.
 *
 * Слой РЕПО (всегда): needles по миграции 031, боту, web-роуту /api/voice, health.
 * Живой слой (кроме --repo-only): GET /api/health -> cron.extension, cron.jobs[*].active,
 * storage.voice_bucket === "private"; GET /api/audio/<неизвестный|невалидный id> -> JSON 404 без
 * редиректа. Адрес: --base-url / EXPERT_URL / SELFSERVE_URL / CANONICAL_URL; оффлайн — --fixture-dir
 * с health.json и audio.json.
 *
 * Exit: 0 ок; 1 находки; 2 usage; 3 транспорт (живой контур недоступен, находок нет).
 * Граница: оракул ничего не мутирует, cron/Storage не трогает, только читает health.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KNOWN_FLAGS = new Set(["--stage", "--base-url", "--fixture-dir", "--repo-root", "--repo-only"]);
const STAGES = new Set(["infra", "demand", "publish", "notify", "billing"]);
const argv = process.argv.slice(2);
let stage = null;
let baseUrlArg = null;
let fixtureDir = null;
let repoRootArg = null;
let repoOnly = false;

for (let i = 0; i < argv.length; i += 1) {
  let flag = argv[i];
  let inline = null;
  const eq = flag.indexOf("=");
  if (flag.startsWith("--") && eq > 0) { inline = flag.slice(eq + 1); flag = flag.slice(0, eq); }
  if (!KNOWN_FLAGS.has(flag)) { console.error(`usage: неизвестный флаг ${argv[i]}`); process.exit(2); }
  const value = () => { if (inline !== null) return inline; i += 1; return argv[i] ?? null; };
  if (flag === "--stage") { stage = value(); continue; }
  if (flag === "--base-url") { baseUrlArg = value(); continue; }
  if (flag === "--fixture-dir") { fixtureDir = value(); continue; }
  if (flag === "--repo-root") { repoRootArg = value(); continue; }
  if (flag === "--repo-only") { repoOnly = true; continue; }
}

if (!stage || !STAGES.has(stage)) {
  console.error(`usage: --stage=<${[...STAGES].join("|")}> обязателен`);
  process.exit(2);
}
if (fixtureDir && baseUrlArg) { console.error("usage: --fixture-dir и --base-url взаимоисключающи"); process.exit(2); }

// Корень репозитория — от файла скрипта, не от process.cwd().
const repoRoot = repoRootArg ? resolve(repoRootArg) : resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = (baseUrlArg || process.env.EXPERT_URL || process.env.SELFSERVE_URL || process.env.CANONICAL_URL || "").replace(/\/+$/, "");
if (!repoOnly && !fixtureDir && !baseUrl) {
  console.error("usage: нужен живой контур (--base-url / EXPERT_URL / SELFSERVE_URL / CANONICAL_URL), --fixture-dir или явный --repo-only");
  process.exit(2);
}

const MAX_ATTEMPTS = Number(process.env.EXPERT_ATTEMPTS || process.env.PREFLIGHT_ATTEMPTS || 4);
const RETRY_DELAY_MS = Number(process.env.EXPERT_RETRY_DELAY_MS || process.env.PREFLIGHT_RETRY_DELAY_MS || 1500);
const REQUEST_TIMEOUT_MS = Number(process.env.EXPERT_TIMEOUT_MS || process.env.PREFLIGHT_TIMEOUT_MS || 20_000);

const findings = [];
function finding(where, why, fix) { findings.push(`${where}: ${why} — FIX: ${fix}`); }
function readRepoFile(rel) { const abs = join(repoRoot, rel); return existsSync(abs) ? readFileSync(abs, "utf8") : null; }

/** Группа needles: все литералы обязаны присутствовать; файл отсутствует — одна находка. */
function requireGroup(name, files, fix) {
  const missing = [];
  for (const [rel, needles] of files) {
    const text = readRepoFile(rel);
    if (text === null) { missing.push(`${rel}: файл отсутствует`); continue; }
    for (const n of needles) if (!text.includes(n)) missing.push(`${rel}: нет «${n}»`);
  }
  if (missing.length > 0) finding(`[${stage}:${name}]`, missing.join("; "), fix);
}

// ============================================================
// R-05 слой РЕПО
// ============================================================
const MIGRATION = "packages/supabase/migrations/031_cron_and_voice_bucket.sql";

function checkInfraRepo() {
  // Миграция 031: pg_cron + два расписания идемпотентно, bucket voice private, RPC infra_status.
  requireGroup("migration", [[MIGRATION, [
    // Guard: cron.database_name = current_database(), иначе задания регистрируются и не исполняются.
    "current_setting('cron.database_name'",
    "RAISE EXCEPTION",
    // Роль-плейсхолдер для after-create скрипта supautils (без неё CREATE EXTENSION падает на self-hosted).
    "CREATE ROLE supabase_admin SUPERUSER NOLOGIN",
    "CREATE EXTENSION IF NOT EXISTS pg_cron",
    "cron.unschedule(",
    "cron.schedule('weekly-demand'",
    "cron.schedule('weekly-generate-orders'",
    "storage.buckets",
    "public = false",
    "file_size_limit",
    "allowed_mime_types",
    "FUNCTION public.infra_status(",
    "SECURITY DEFINER",
  ]]], "миграция 031 по контракту R-05: CREATE EXTENSION pg_cron, cron.unschedule+schedule для weekly-demand и weekly-generate-orders, bucket voice ON CONFLICT ... public = false, RPC infra_status() SECURITY DEFINER");

  // Миграция 032: штатные гранты Supabase для Storage. Инцидент 2026-09-18: на self-hosted БД
  // supabase_storage_admin не был членом service_role, а у service_role не было прав на схему storage -
  // любая загрузка через API падала 403 «row-level security», в bucket voice 0 объектов за всё время.
  requireGroup("storage-grants", [["packages/supabase/migrations/032_storage_role_grants.sql", [
    "GRANT anon, authenticated, service_role TO supabase_storage_admin",
    "GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role",
    "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE storage.objects TO service_role",
    "GRANT SELECT ON TABLE storage.buckets TO service_role",
    "upload_ready",
    "pg_has_role('supabase_storage_admin', 'service_role', 'MEMBER')",
    // upload_ready обязан проверять весь выданный набор, иначе частичный отзыв прав даст ложный true.
    "has_table_privilege('service_role', 'storage.objects', 'DELETE')",
    "has_table_privilege('service_role', 'storage.buckets', 'SELECT')",
  ]]], "миграция 032: членство supabase_storage_admin в anon/authenticated/service_role, USAGE на схему storage, права service_role на таблицы storage, infra_status().storage.upload_ready");

  // Бот: аудио обязано лечь в Storage до записи voice_recordings; ошибка -> ответ и выход.
  requireGroup("bot", [["apps/bot/src/handlers/voice.ts", [
    ".storage",
    ".from(\"voice\")",
    ".upload(filePath, audioBuffer",
    "error: uploadError",
    "Не удалось сохранить запись",
  ]]], "в handlers/voice.ts загрузить audioBuffer в bucket voice по filePath ДО insert voice_recordings; при uploadError ответить «Не удалось сохранить запись» и выйти без записи и без STT");

  // Web /api/voice: upload обязателен, ошибка -> 500 до insert.
  requireGroup("web-voice", [["apps/web/app/api/voice/route.ts", [
    "error: uploadError",
    "{ error: \"Failed to store audio\" }, { status: 500 }",
  ]]], "в /api/voice проверять результат storage.upload: при ошибке вернуть 500 {error:\"Failed to store audio\"} до создания voice_recordings");

  // Читатели bucket voice: приватный bucket => стабильная ссылка /api/audio/<voice_id> (подпись в момент
  // запроса, 302, только опубликованные статьи); публичных ссылок и «запечённых» подписей не остаётся.
  const READERS = ["apps/web/app/experts/[slug]/[articleSlug]/page.tsx", "apps/web/app/api/v1/answers/route.ts"];
  requireGroup("readers", [
    ...READERS.map((rel) => [rel, ["/api/audio/"]]),
    ["apps/web/app/api/audio/[id]/route.ts", ["createSignedUrl(", "\"published\"", "NextResponse.redirect(", "voice_id"]],
  ], "плеер статьи и /api/v1/answers ведут на /api/audio/<voice_id>; роут подписывает ссылку service role в момент запроса (createSignedUrl), отдаёт только опубликованные статьи и делает 302");
  for (const rel of READERS) {
    const text = readRepoFile(rel);
    if (text !== null && text.includes("createSignedUrl(")) {
      finding("[infra:readers]", `${rel}: подписанный URL запекается в ответ/ISR-страницу (createSignedUrl в читателе)`, "подписывать только в /api/audio/[id] в момент запроса - в ISR-HTML подпись протухает");
    }
  }
  for (const rel of READERS) {
    const text = readRepoFile(rel);
    if (text !== null && text.includes("/storage/v1/object/public/voice/")) {
      finding("[infra:readers]", `${rel}: остался публичный URL /storage/v1/object/public/voice/`, "убрать публичную ссылку — bucket voice приватный (миграция 031)");
    }
  }

  // Health: блок cron/storage через RPC infra_status (PostgREST не видит схемы cron и storage).
  requireGroup("health", [["apps/web/app/api/health/route.ts", [
    "rpc(\"infra_status\"",
    "cron:",
    "storage:",
    "voice_bucket",
  ]]], "в /api/health вызвать rpc infra_status() и отдать cron {extension, jobs} и storage {voice_bucket}");
}

// ============================================================
// Живой слой
// ============================================================
const transportErrors = [];
function sleep(ms) { return new Promise((r) => { setTimeout(r, ms); }); }
async function fetchWithRetry(url, init) {
  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try { return await fetch(url, { ...init, signal: controller.signal }); } finally { clearTimeout(timer); }
    } catch (err) { lastErr = err; if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS); }
  }
  throw lastErr;
}
async function getHealth() {
  if (fixtureDir) {
    const abs = join(fixtureDir, "health.json");
    if (!existsSync(abs)) { finding("fixture:health.json", "фикстура отсутствует", "положить health.json в --fixture-dir"); return null; }
    return JSON.parse(readFileSync(abs, "utf8"));
  }
  const res = await fetchWithRetry(`${baseUrl}/api/health`, { method: "GET" });
  if (!res.ok) { finding("/api/health", `HTTP ${res.status}`, "health обязан отвечать 200"); return null; }
  return res.json();
}

/**
 * Живая проба /api/audio/<id>: роут существует и на неизвестный/невалидный id отвечает JSON 404 без
 * редиректа (нет утечки; отсутствующий роут дал бы HTML 404 от Next, открытый - 302/200).
 * redirect:"manual": undici (Node fetch) возвращает 3xx-ответ как есть (status 302), браузерные
 * реализации - opaqueredirect со status 0; в обоих случаях status !== 404 и проба краснеет.
 * Оффлайн - фикстура audio.json: [{"id": "...", "status": 404, "contentType": "application/json"}].
 */
const AUDIO_PROBES = ["00000000-0000-0000-0000-000000000000", "not-a-uuid"];
async function getAudioProbe(id) {
  if (fixtureDir) {
    const abs = join(fixtureDir, "audio.json");
    if (!existsSync(abs)) { finding("fixture:audio.json", "фикстура отсутствует", "положить audio.json в --fixture-dir"); return null; }
    const rows = JSON.parse(readFileSync(abs, "utf8"));
    return rows.find((r) => r.id === id) ?? null;
  }
  const res = await fetchWithRetry(`${baseUrl}/api/audio/${id}`, { method: "GET", redirect: "manual" });
  return { id, status: res.status, contentType: res.headers.get("content-type") || "" };
}
async function checkAudioRouteLive() {
  for (const id of AUDIO_PROBES) {
    const p = await getAudioProbe(id);
    if (!p) { finding(`/api/audio/${id}`, "нет данных пробы", "фикстура audio.json обязана содержать этот id"); continue; }
    if (p.status !== 404) finding(`/api/audio/${id}`, `HTTP ${p.status} (ожидается 404 без редиректа)`, "роут обязан отвечать 404 на неизвестный/невалидный id: черновики и перебор не отдаются, 302 только для опубликованных");
    else if (!String(p.contentType).includes("application/json")) finding(`/api/audio/${id}`, `404 без JSON (${p.contentType || "нет content-type"}) - роут отсутствует?`, "создать apps/web/app/api/audio/[id]/route.ts (JSON 404)");
  }
}

const REQUIRED_JOBS = ["weekly-demand", "weekly-generate-orders"];
function checkInfraHealth(health) {
  if (!health) return;
  const cron = health.cron;
  if (!cron || typeof cron !== "object") {
    finding("/api/health", "блок cron отсутствует", "отдать cron из rpc infra_status() (миграция 031 применена?)");
  } else {
    if (cron.extension !== true) finding("/api/health", "cron.extension !== true (pg_cron не установлен)", "применить миграцию 031: CREATE EXTENSION pg_cron");
    const jobs = cron.jobs && typeof cron.jobs === "object" ? cron.jobs : {};
    for (const name of REQUIRED_JOBS) {
      const j = jobs[name];
      if (!j || typeof j !== "object") { finding("/api/health", `cron.jobs.${name} отсутствует`, "применить миграцию 031: cron.schedule"); continue; }
      if (j.active !== true) finding("/api/health", `cron.jobs.${name}.active !== true`, "расписание выключено — включить в cron.job");
      if (typeof j.schedule !== "string" || !j.schedule.trim()) finding("/api/health", `cron.jobs.${name}.schedule пуст`, "отдавать schedule из cron.job");
      if (j.last_status === "failed") finding("/api/health", `cron.jobs.${name}: последний запуск failed`, "смотреть cron.job_run_details, чинить тело задания");
    }
  }
  const storage = health.storage;
  if (!storage || typeof storage !== "object") {
    finding("/api/health", "блок storage отсутствует", "отдать storage.voice_bucket из rpc infra_status()");
  } else {
    if (storage.voice_bucket !== "private") {
      finding("/api/health", `storage.voice_bucket = ${JSON.stringify(storage.voice_bucket)} (ожидается \"private\")`,
        "миграция 031: bucket voice public = false; «missing» — bucket не создан");
    }
    // Право записи через API: без грантов 032 storage-api отвечает 403 на любую загрузку.
    if (storage.upload_ready !== true) {
      finding("/api/health", `storage.upload_ready = ${JSON.stringify(storage.upload_ready)} (ожидается true)`,
        "применить миграцию 032: гранты Storage для service_role и членство supabase_storage_admin; без них бот и /api/voice не могут сохранить аудио");
    }
  }
}

// ============================================================
// R-06 стадия demand: выбор спроса экспертом (контракт .itd-memory/contracts/R-06.md)
// ============================================================
const DEMAND_FIX = "реализовать контракт R-06 (.itd-memory/contracts/R-06.md)";
const SEL_LIB = "apps/web/lib/expert-orders.ts";
const DASHBOARD = "apps/web/app/(dashboard)/orders/page.tsx";
const CONTENT_NEW = "apps/web/app/(dashboard)/content/new/page.tsx";
const VOICE_ROUTE = "apps/web/app/api/voice/route.ts";
const BOT_VOICE = "apps/bot/src/handlers/voice.ts";
const BOT_RECORD = "apps/bot/src/commands/record.ts";
const GEN_ROUTE = "apps/web/app/api/expert-orders/generate/route.ts";
const GEN_HANDLER = "apps/worker/src/jobs/generate-orders.ts";
const SHARED_SEL = "packages/shared/src/orders/expert-selection.ts";
/** Литералы, которых в файле быть НЕ должно (старое поведение) - одна находка на группу. */
function forbidGroup(name, files, fix) {
  const present = [];
  for (const [rel, needles] of files) {
    const text = readRepoFile(rel);
    if (text === null) continue;
    for (const n of needles) if (text.includes(n)) present.push(`${rel}: осталось «${n}»`);
  }
  if (present.length > 0) finding(`[${stage}:${name}]`, present.join("; "), fix);
}
function checkDemandRepo() {
  requireGroup("routes", [
    [SHARED_SEL, ["export function decideOrderSelection(", "\"rejected\"", "\"accepted\""]],
    ["packages/shared/src/index.ts", ["./orders/expert-selection.js"]],
    ["packages/shared/tests/expert-selection.test.cjs", ["decideOrderSelection", "decideGenerateNow", "planExpertOrders"]],
    [SEL_LIB, ["decideOrderSelection(", ".eq(\"expert_id\", user.id)", ".eq(\"status\", \"pending\")", "status: 401", "NextResponse.redirect(url, 303)",
      "if (!isSameOriginPost(request)) return NextResponse.json({ error: \"Forbidden\" }, { status: 403 });", "isSameOriginRequest("]],
    ["apps/web/app/api/expert-orders/[id]/accept/route.ts", ["handleExpertOrderSelection(request, params.id, \"accept\")"]],
    ["apps/web/app/api/expert-orders/[id]/skip/route.ts", ["handleExpertOrderSelection(request, params.id, \"skip\")"]],
    ["apps/web/app/api/expert-orders/[id]/route.ts", [".eq(\"expert_id\", user.id)", "question_text", "status: 401"]],
  ], DEMAND_FIX);
  // CSRF-проверка опирается на конфигурацию сервера, а не на заголовки проверяемого запроса.
  requireGroup("csrf-config", [[SEL_LIB, ["process.env[\"APP_URL\"] ?? \"\"", "process.env[\"NEXT_PUBLIC_APP_URL\"] ?? \"\"", "if (process.env.NODE_ENV === \"development\") {"]]], DEMAND_FIX);
  forbidGroup("csrf-headers", [[SEL_LIB, ["x-forwarded-host", "x-forwarded-proto"]]],
    "разрешённый origin нельзя выводить из X-Forwarded-*: эти заголовки приходят вместе с проверяемым запросом");
  // Порядок выкатки - процедурная защита: старый worker раздал бы темы всей нише (не знает expert_id).
  requireGroup("rollout", [["OPERATIONS.md", ["Порядок выкатки: worker → web → bot", "обратный порядок: сначала web"]]],
    "записать в OPERATIONS порядок выкатки R-06 (worker раньше web) и порядок отката");
  requireGroup("dashboard", [
    [DASHBOARD, ["action={`/api/expert-orders/${o.id as string}/accept`}", "action={`/api/expert-orders/${o.id as string}/skip`}",
      "action=\"/api/expert-orders/generate\"", "Подобрать темы сейчас", "href={`/content/new?order_id=${o.id as string}`}", "expired: \"Истекли\""]],
  ], DEMAND_FIX);
  forbidGroup("dashboard-legacy", [[DASHBOARD, ["/api/orders/accept", "/api/orders/skip", "href=\"/content/new\""]]],
    "кнопки дашборда обязаны вести на /api/expert-orders/*: /api/orders/* занят платными заказами Audit Start и отвечал 404/405");
  requireGroup("voice-web", [
    [VOICE_ROUTE, ["formData.get(\"order_id\")", "resolveVoiceOrder(", "order_required"]],
    // Многострочный needle: точечная проверка выбранной темы (владелец + accepted), а не любой accepted-запрос.
    [SEL_LIB, ["export async function resolveVoiceOrder(", ".eq(\"expert_id\", expertId)\n      .eq(\"status\", \"accepted\")\n      .maybeSingle()"]],
    [CONTENT_NEW, ["useSearchParams", "formData.append(\"order_id\"", "question_text"]],
  ], DEMAND_FIX);
  requireGroup("voice-bot", [
    [BOT_VOICE, [".order(\"updated_at\", { ascending: false })", "Вопрос: "]],
    [BOT_RECORD, ["recordOrderKeyboard("]],
    ["apps/bot/src/keyboards.ts", ["export function recordOrderKeyboard(", "record_order:"]],
    ["apps/bot/src/handlers/callback.ts", ["/^record_order:(.+)$/", ".update({ updated_at: new Date().toISOString() })"]],
  ], DEMAND_FIX);
  forbidGroup("voice-legacy", [
    [VOICE_ROUTE, [".order(\"created_at\", { ascending: true })"]],
    [BOT_VOICE, [".order(\"created_at\", { ascending: true })"]],
    [BOT_RECORD, ["к первому из них", ".order(\"created_at\", { ascending: true })"]],
  ], "голос привязывается к выбранной теме, а не к «первому принятому заказу» (E-AUTO-7)");
  requireGroup("generate", [
    [SHARED_SEL, ["export function decideGenerateNow(", "export function planExpertOrders(", "GENERATE_COOLDOWN_MS",
      "export function isFirstGenerateRequest(", "export function isSameOriginRequest("]],
    [GEN_ROUTE, ["type: \"generate_orders\"", "expert_id: user.id", "decideGenerateNow(", "status: 401", "generate_cooldown",
      "if (!isSameOriginPost(request)) return NextResponse.json({ error: \"Forbidden\" }, { status: 403 });", "isFirstGenerateRequest("]],
    [GEN_HANDLER, ["payload.expert_id", "planExpertOrders("]],
  ], DEMAND_FIX);
}
/**
 * Живой слой demand: роуты существуют и закрыты сессией (401 JSON, а не HTML 404 от Next); старые
 * адреса кнопок не отвечают успехом; платный /api/orders/<uuid> по-прежнему 401 (контур не задет).
 * Оффлайн - фикстура demand.json: [{"probe": "<имя>", "status": N}]. Ничего не мутирует: без сессии
 * роуты отказывают до обращения к БД.
 */
const ZERO_UUID = "00000000-0000-4000-8000-000000000001";
const DEMAND_PROBES = [
  { probe: "accept", method: "POST", path: `/api/expert-orders/${ZERO_UUID}/accept`, expect: (s) => s === 401, want: "401" },
  { probe: "skip", method: "POST", path: `/api/expert-orders/${ZERO_UUID}/skip`, expect: (s) => s === 401, want: "401" },
  { probe: "generate", method: "POST", path: "/api/expert-orders/generate", expect: (s) => s === 401, want: "401" },
  { probe: "order-get", method: "GET", path: `/api/expert-orders/${ZERO_UUID}`, expect: (s) => s === 401, want: "401" },
  { probe: "legacy-accept", method: "POST", path: "/api/orders/accept", expect: (s) => s >= 400, want: ">= 400" },
  { probe: "legacy-skip", method: "POST", path: "/api/orders/skip", expect: (s) => s >= 400, want: ">= 400" },
  { probe: "paid-order", method: "GET", path: `/api/orders/${ZERO_UUID}`, expect: (s) => s === 401, want: "401" },
];
async function checkDemandLive() {
  let rows = null;
  if (fixtureDir) {
    const abs = join(fixtureDir, "demand.json");
    if (!existsSync(abs)) { finding("fixture:demand.json", "фикстура отсутствует", "положить demand.json в --fixture-dir"); return; }
    rows = JSON.parse(readFileSync(abs, "utf8"));
  }
  for (const p of DEMAND_PROBES) {
    let status;
    if (rows) {
      const row = rows.find((r) => r.probe === p.probe);
      if (!row) { finding(p.path, "нет данных пробы", `фикстура demand.json обязана содержать probe ${p.probe}`); continue; }
      status = row.status;
    } else {
      const res = await fetchWithRetry(`${baseUrl}${p.path}`, { method: p.method, redirect: "manual" });
      status = res.status;
    }
    if (!p.expect(status)) finding(p.path, `${p.method} без сессии: HTTP ${status} (ожидается ${p.want})`, "роут обязан существовать и отказывать без сессии; старые адреса кнопок не должны отвечать успехом");
  }
}

// ============================================================
// R-07 стадия publish: approval -> публикация (контракт .itd-memory/contracts/R-07.md)
// ============================================================
const PUBLISH_FIX = "реализовать контракт R-07 (.itd-memory/contracts/R-07.md)";
const SHARED_PUB = "packages/shared/src/content/publish.ts";
const PUB_SVC = "apps/web/lib/publish-service.ts";
const PUB_ROUTE = "apps/web/app/api/publish/route.ts";
const PUB_INTERNAL = "apps/web/app/api/internal/publish/route.ts";
const BOT_CB = "apps/bot/src/handlers/callback.ts";
const CONTENT_PAGE = "apps/web/app/(dashboard)/content/[id]/page.tsx";
const CATALOG = "apps/web/app/experts/page.tsx";
const MIG_033 = "packages/supabase/migrations/033_content_slug_unique.sql";
function checkPublishRepo() {
  requireGroup("service", [
    [SHARED_PUB, ["export function decidePublish(", "export function faqProblems(", "export function uniqueSlug(", "\"faq_required\"", "\"bad_status\"", "\"no_slug\""]],
    ["packages/shared/src/index.ts", ["./content/publish.js"]],
    ["packages/shared/tests/publish.test.cjs", ["decidePublish", "faqProblems", "uniqueSlug"]],
    [PUB_SVC, ["export async function publishContent(", "decidePublish(", ".eq(\"expert_id\", expertId)", ".in(\"status\", [\"review\", \"approved\"])",
      ".update({ is_published: true })", "profileVisible = true", "revalidatePath(`/experts/${expertSlug}`)", "revalidatePath(`/experts/${expertSlug}/${pkg!.slug}`)", "revalidatePath(\"/sitemap.xml\")"]],
    [PUB_ROUTE, ["publishContent(", "status: 401", "if (!isSameOriginPost(request)) return NextResponse.json({ error: \"Forbidden\" }, { status: 403 });"]],
  ], PUBLISH_FIX);
  requireGroup("internal", [
    [PUB_INTERNAL, ["process.env[\"PUBLISH_INTERNAL_TOKEN\"]", "timingSafeEqual(", "status: 401", "status: 503", "expert_id", "publishContent("]],
    [".env.example", ["PUBLISH_INTERNAL_TOKEN="]],
  ], PUBLISH_FIX);
  requireGroup("bot", [
    [BOT_CB, ["/api/internal/publish", "\"x-internal-token\"", "expert_id: profileId", "/content/${contentId}"]],
  ], PUBLISH_FIX);
  forbidGroup("bot-legacy", [[BOT_CB, ["status: \"approved\"", "Отправьте текстом, что нужно изменить"]]],
    "«Опубликовать» в Telegram обязан публиковать через общий сервис с проверкой владельца; «Редактировать» - ссылка на веб-редактор");
  requireGroup("faq-ui", [
    [CONTENT_PAGE, ["faqProblems(", "data-faq-warning", "disabled={faqIssues.length > 0", "PUBLISH_ERRORS"]],
  ], PUBLISH_FIX);
  forbidGroup("faq-legacy", [[CONTENT_PAGE, ["JSON.stringify(data.format_faq", "try { faq = JSON.parse(faqJson); } catch"]]],
    "FAQ редактируется формой «вопрос - ответ», а не сырым JSON с молчаливым откатом при ошибке разбора");
  // PGRST201: у profiles две связи с niches - embed без подсказки отклоняется, каталог пуст, публикация 404.
  requireGroup("embed", [
    [CATALOG, ["niches!profiles_niche_id_fkey(name, icon)"]],
    [PUB_SVC, ["niches!profiles_niche_id_fkey(slug)"]],
  ], PUBLISH_FIX);
  forbidGroup("embed-legacy", [[CATALOG, [" niches(name, icon)"]], [PUB_SVC, [" niches(slug)"]], [PUB_ROUTE, ["revalidateTag(", "niches(slug)"]], [PUB_SVC, ["revalidateTag("]]],
    "embed niches из profiles только с подсказкой связи (!profiles_niche_id_fkey); revalidateTag(\"sitemap\") - мёртвый вызов");
  requireGroup("slug", [
    [MIG_033, ["CREATE UNIQUE INDEX IF NOT EXISTS", "(expert_id, slug)", "WHERE slug IS NOT NULL"]],
    ["apps/worker/src/jobs/generate-content.ts", ["uniqueSlug(", "cpErr?.code === \"23505\""]],
  ], PUBLISH_FIX);
  requireGroup("rollout", [["OPERATIONS.md", ["Порядок выкатки R-07: worker → миграция 033 → токен → web → bot"]]],
    "записать в OPERATIONS порядок выкатки R-07: бот вызывает внутренний роут web, которого в старом web нет");
}
/**
 * Живой слой publish: роуты закрыты (401 без сессии и без токена; 503 - токен не задан в env, это
 * находка), каталог показывает опубликованных экспертов, профиль каждого открывается и есть в sitemap.
 * Оффлайн - фикстура publish.json: {"probes": {"publish": 401, "internal": 401}, "catalog": ["slug"],
 * "profiles": {"slug": 200}, "sitemap": ["slug"]}. Ничего не мутирует.
 */
async function checkPublishLive() {
  let fx = null;
  if (fixtureDir) {
    const abs = join(fixtureDir, "publish.json");
    if (!existsSync(abs)) { finding("fixture:publish.json", "фикстура отсутствует", "положить publish.json в --fixture-dir"); return; }
    fx = JSON.parse(readFileSync(abs, "utf8"));
  }
  const post = async (path) => (await fetchWithRetry(`${baseUrl}${path}`, { method: "POST", redirect: "manual", headers: { "content-type": "application/json" }, body: "{}" })).status;
  const probes = fx ? (fx.probes ?? {}) : { publish: await post("/api/publish"), internal: await post("/api/internal/publish") };
  if (probes.publish !== 401) finding("/api/publish", `без сессии: HTTP ${probes.publish} (ожидается 401)`, "отказ до обращения к БД");
  if (probes.internal !== 401) finding("/api/internal/publish", `без токена: HTTP ${probes.internal} (ожидается 401; 503 = PUBLISH_INTERNAL_TOKEN не задан в env web, 404 = роута нет)`, "создать роут и задать токен в .env, пересоздать web");
  let catalog, sitemap;
  if (fx) { catalog = fx.catalog ?? []; sitemap = fx.sitemap ?? []; }
  else {
    const html = await (await fetchWithRetry(`${baseUrl}/experts`, { method: "GET" })).text();
    catalog = [...new Set([...html.matchAll(/href="\/experts\/([a-z0-9-]+)"/g)].map((m) => m[1]))];
    const xml = await (await fetchWithRetry(`${baseUrl}/sitemaps/experts.xml`, { method: "GET" })).text();
    sitemap = [...new Set([...xml.matchAll(/\/experts\/([a-z0-9-]+)</g)].map((m) => m[1]))];
  }
  if (catalog.length === 0) { finding("/experts", "в каталоге нет ни одного эксперта", "проверить запрос каталога (PGRST201) и profiles.is_published у опубликовавших"); return; }
  for (const slug of catalog.slice(0, 5)) {
    const status = fx ? fx.profiles?.[slug] : (await fetchWithRetry(`${baseUrl}/experts/${slug}`, { method: "GET", redirect: "manual" })).status;
    if (status !== 200) finding(`/experts/${slug}`, `HTTP ${status} (эксперт есть в каталоге, профиль обязан открываться)`, "профиль публикуется вместе со статьёй: profiles.is_published = true");
    if (!sitemap.includes(slug)) finding("/sitemaps/experts.xml", `эксперта ${slug} нет в sitemap`, "sitemap строится по is_published = true и ревалидируется при публикации");
  }
}

// ============================================================
// R-08 стадия notify: уведомления эксперту и привязка Telegram (контракт .itd-memory/contracts/R-08.md)
// ============================================================
const NOTIFY_FIX = "реализовать контракт R-08 (.itd-memory/contracts/R-08.md)";
const SHARED_NOTIFY = "packages/shared/src/notify/expert.ts";
const SHARED_LINK = "packages/shared/src/notify/link-token.ts";
const W_NOTIFY_JOB = "apps/worker/src/jobs/notify-expert.ts";
const W_NOTIFY_SVC = "apps/worker/src/services/expert-notify.ts";
const W_VALIDATE = "apps/worker/src/jobs/validate-content.ts";
const W_CROSSPOST = "apps/worker/src/jobs/crosspost-social.ts";
const LINK_ROUTE = "apps/web/app/api/telegram/link/route.ts";
const BOT_START = "apps/bot/src/commands/start.ts";
const BOT_LEADS = "apps/bot/src/handlers/leads.ts";
const MIG_034 = "packages/supabase/migrations/034_expert_notifications.sql";
function checkNotifyRepo() {
  requireGroup("core", [
    [SHARED_NOTIFY, ["export function createExpertNotifier(", "export function planExpertChannels(", "export function formatExpertNotification(",
      "export function isServiceEmail(", "\"draft_ready\"", "\"published\"", "\"lead\"", "\"booking\""]],
    ["packages/shared/src/index.ts", ["./notify/expert.js"]],
    ["packages/shared/tests/notify-expert.test.cjs", ["createExpertNotifier", "planExpertChannels", "formatExpertNotification"]],
  ], NOTIFY_FIX);
  requireGroup("link-token", [
    [SHARED_LINK, ["export function hashLinkNonce(", "export function signTelegramLinkToken(", "export function verifyTelegramLinkToken(", "createHmac(\"sha256\"", "timingSafeEqual(", "LINK_TOKEN_TTL_MS = 15 * 60 * 1000", "raw.toString(\"base64url\") !== encoded"]],
    ["packages/shared/package.json", ["\"./notify/link-token\""]],
    ["packages/shared/tests/link-token.test.cjs", ["signTelegramLinkToken", "verifyTelegramLinkToken"]],
  ], NOTIFY_FIX);
  requireGroup("worker", [
    [W_NOTIFY_JOB, ["export async function handleNotifyExpert(", "createWorkerExpertNotifier(", "data.expert_id !== expertId"]],
    [W_NOTIFY_SVC, ["createExpertNotifier(", "if (!res.ok)", "createMailer(", "expert_notifications"]],
    ["apps/worker/tests/expert-notify.test.cjs", ["createWorkerExpertNotifier"]],
    ["apps/worker/src/index.ts", ["notify_expert: handleNotifyExpert"]],
    [W_VALIDATE, ["type: \"notify_expert\""]],
  ], NOTIFY_FIX);
  requireGroup("web-enqueue", [
    ["apps/web/lib/publish-service.ts", ["type: \"notify_expert\""]],
    ["apps/web/app/api/leads/route.ts", ["type: \"notify_expert\""]],
    ["apps/web/app/api/bookings/route.ts", ["type: \"notify_expert\""]],
  ], NOTIFY_FIX);
  // Прямые отправки эксперту в обход общего ядра: без e-mail, без проверки ответа, без дедупа.
  forbidGroup("direct-sends", [
    [W_VALIDATE, ["sendMessage"]], [W_CROSSPOST, ["chat_id: expert.telegram_id"]],
    ["apps/web/app/api/leads/route.ts", ["sendMessage"]], ["apps/web/app/api/bookings/route.ts", ["sendMessage"]],
    ["apps/web/lib/publish-service.ts", ["sendSharingNotification"]],
  ], "уведомления эксперту - только job notify_expert через createExpertNotifier (Telegram при наличии + e-mail всегда)");
  if (readRepoFile("apps/web/lib/publish-notify.ts") !== null) finding(`[${stage}:direct-sends]`, "apps/web/lib/publish-notify.ts: файл должен быть удалён (второй путь уведомления о публикации)", NOTIFY_FIX);
  requireGroup("link", [
    [LINK_ROUTE, ["status: 401", "if (!isSameOriginPost(request)) return NextResponse.json({ error: \"Forbidden\" }, { status: 403 });",
      "signTelegramLinkToken(", "telegram_link_nonce: hashLinkNonce(", "process.env[\"TELEGRAM_LINK_SECRET\"]", "process.env[\"TELEGRAM_BOT_USERNAME\"]", "export async function DELETE("]],
    [BOT_START, ["verifyTelegramLinkToken(", ".eq(\"telegram_link_nonce\", hashLinkNonce(", ".gt(\"telegram_link_expires_at\", ", "process.env[\"TELEGRAM_LINK_SECRET\"]"]],
    [BOT_LEADS, [".eq(\"expert_id\", profileId)"]],
    ["apps/web/app/(dashboard)/profile/page.tsx", ["Подключить Telegram", "/api/telegram/link"]],
    [".env.example", ["TELEGRAM_LINK_SECRET=", "TELEGRAM_BOT_USERNAME="]],
  ], NOTIFY_FIX);
  forbidGroup("link-legacy", [[BOT_START, ["auth.admin.createUser", ".eq(\"id\", token)"]]],
    "/start без подписанной ссылки не создаёт аккаунт (дубль tg_…@neuroexpert.bot); сырой id профиля - не токен привязки");
  requireGroup("migration", [
    [MIG_034, ["CREATE TABLE IF NOT EXISTS public.expert_notifications", "UNIQUE (expert_id, kind, ref_id)", "ENABLE ROW LEVEL SECURITY",
      "telegram_link_nonce", "'notify_expert'", "cron.schedule('weekly-email-digest'", "j.type = 'send_email_digest' AND j.payload->>'content_id' = cp.id::text"]],
  ], NOTIFY_FIX);
  requireGroup("rollout", [["OPERATIONS.md", ["Порядок выкатки R-08: миграция 034 → worker → секрет → bot → web"]]],
    "записать в OPERATIONS порядок выкатки R-08: web и worker ставят job notify_expert, которого нет в CHECK до миграции 034");
}
/** Живой слой notify: роут привязки существует и закрыт сессией (401, а не HTML 404). Ничего не мутирует. */
async function checkNotifyLive() {
  let rows = null;
  if (fixtureDir) {
    const abs = join(fixtureDir, "notify.json");
    if (!existsSync(abs)) { finding("fixture:notify.json", "фикстура отсутствует", "положить notify.json в --fixture-dir"); return; }
    rows = JSON.parse(readFileSync(abs, "utf8"));
  }
  for (const method of ["POST", "DELETE"]) {
    const status = rows ? rows[method] : (await fetchWithRetry(`${baseUrl}/api/telegram/link`, { method, redirect: "manual" })).status;
    if (status !== 401) finding("/api/telegram/link", `${method} без сессии: HTTP ${status} (ожидается 401; 404 = роута нет)`, "роут привязки обязан существовать и отказывать без сессии");
  }
}

// ============================================================
// R-09 стадия billing: тарифы применяются, подписка кончается, аналитика для всех (контракт .itd-memory/contracts/R-09.md)
// ============================================================
const BILLING_FIX = "реализовать контракт R-09 (.itd-memory/contracts/R-09.md)";
const SHARED_LIMITS = "packages/shared/src/billing/limits.ts";
const WEB_SUB = "apps/web/lib/subscription.ts";
const W_GEN = "apps/worker/src/jobs/generate-content.ts";
const WEB_ORDERS_LIB = "apps/web/lib/expert-orders.ts";
const WEB_VOICE = "apps/web/app/api/voice/route.ts";
const WEB_WEBHOOK = "apps/web/app/api/webhooks/yukassa/route.ts";
const WEB_BILLING = "apps/web/app/(dashboard)/billing/page.tsx";
const WEB_ANALYTICS = "apps/web/app/(dashboard)/analytics/page.tsx";
const WEB_ORDERS_PAGE = "apps/web/app/(dashboard)/orders/page.tsx";
const BOT_KEYS = "apps/bot/src/keyboards.ts";
const MIG_035 = "packages/supabase/migrations/035_billing_and_analytics.sql";
const BILLING_CRON = ["weekly-citations", "weekly-serp", "monthly-trust", "daily-subscription-expiry"];
function checkBillingRepo() {
  // Одна таблица тарифов и одни проверки - в shared; web больше не держит свою копию цен.
  requireGroup("core", [
    [SHARED_LIMITS, ["export function checkPackageLimit(", "export function getAllowedFormats(", "export function checkNicheLimit(",
      "export function monthStartUtc(", "export function checkSubscriptionAmount(", "export async function packageAllowance(", "SUBSCRIPTION_TIERS",
      "export function nextSubscriptionExpiry(", "Object.hasOwn(SUBSCRIPTION_TIERS", "currency", "\"expert_package_ledger\""]],
    ["packages/shared/src/index.ts", ["./billing/limits.js"]],
    ["packages/shared/tests/billing-limits.test.cjs", ["checkPackageLimit", "getAllowedFormats", "checkNicheLimit", "checkSubscriptionAmount", "packageAllowance"]],
    [WEB_SUB, ["SUBSCRIPTION_TIERS"]],
  ], BILLING_FIX);
  forbidGroup("core-copy", [[WEB_SUB, ["price: 1490", "packagesPerMonth: 3", "maxNiches: 1"]],
    // Сумма сверяется точно и в рублях; счётчик - по леджеру, а не по content_packages (владелец удаляет/меняет свои пакеты по RLS 002).
    [SHARED_LIMITS, ["Math.round(amountRub)", ".neq(\"status\", \"failed\")", "from(\"content_packages\")"]]],
    "цены и лимиты в web берутся из shared SUBSCRIPTION_TIERS, а не из второй таблицы TIER_CONFIG; сумма подписки без округления, счётчик пакетов по леджеру expert_package_ledger");
  // Лимит пакетов в месяц - на каждом входе (выбор темы и запись голоса, сайт и бот) с понятным отказом.
  requireGroup("entries", [
    [WEB_ORDERS_LIB, ["packageAllowance(", "\"package_limit\"", "action === \"accept\""]],
    [WEB_ORDERS_PAGE, ["package_limit:", "/billing"]],
    [WEB_VOICE, ["packageAllowance(", "code: \"package_limit\"", "status: 402"]],
    [BOT_CB, ["packageAllowance(", "/billing"]],
    [BOT_VOICE, ["packageAllowance(", "/billing"]],
  ], BILLING_FIX);
  // Генерация: только форматы тарифа (cards / reels_script не вызывают LLM у free) и страховка лимита без повторов.
  requireGroup("generate", [[W_GEN, ["getAllowedFormats(", "allowed.has(\"cards\")", "allowed.has(\"reels_script\")", "packageAllowance(", "subscription_tier", "skipped: \"package_limit\""]]], BILLING_FIX);
  // Ниши: клавиатура бота берёт лимит тарифа, а не жёсткие 3.
  requireGroup("niches", [[BOT_KEYS, ["maxNiches: number"]], [BOT_CB, ["nicheKeyboard(selectedIds, maxNiches)", "otherNichesKeyboard(selectedIds, maxNiches)"]]], BILLING_FIX);
  forbidGroup("niches-hardcode", [[BOT_KEYS, ["const MAX_NICHES = 3"]]], "лимит ниш - из тарифа (checkNicheLimit / getMaxNiches), не константа");
  // Подписка: сумма сверяется с ценой тарифа; срок кончается sweep'ом; «Отменить» заменена честным текстом.
  requireGroup("subscription", [
    // Тариф только за точную сумму, один раз на платёж, срок без потери остатка; возврат отзывает тариф.
    [WEB_WEBHOOK, ["checkSubscriptionAmount(", "amountCheck.ok", "alreadyApplied", "typeof priorMeta.tier_applied_at === \"string\"", "nextSubscriptionExpiry(", "legacy?.type === \"subscription\"",
      "priorPayment?.status === \"refunded\"", "if (priorErr) {", "error: markErr"]],
    [WEB_BILLING, ["не продлевается автоматически"]],
    [MIG_035, ["cron.schedule('daily-subscription-expiry'", "subscription_tier <> 'free'", "subscription_expires_at < now()", "SET subscription_tier = 'free'",
      // Security-аудит R-09: пользователь не может сам выставить тариф / публикацию (RLS 002 без WITH CHECK);
      // счётчик пакетов - неудаляемый леджер (владелец удаляет свои пакеты по RLS 002); миграцию применяет серверная роль.
      "WITH CHECK (auth.uid() = id)", "CREATE TRIGGER profiles_protect_billing", "BEFORE UPDATE ON public.profiles",
      "current_user NOT IN ('postgres', 'service_role', 'supabase_admin')", "NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier",
      "NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at", "NEW.trust_score IS DISTINCT FROM OLD.trust_score",
      "NEW.is_published IS DISTINCT FROM OLD.is_published", "ERRCODE = '42501'",
      "CREATE TABLE IF NOT EXISTS public.expert_package_ledger", "ALTER TABLE public.expert_package_ledger ENABLE ROW LEVEL SECURITY",
      "REVOKE ALL ON TABLE public.expert_package_ledger FROM PUBLIC, anon, authenticated", "CREATE TRIGGER content_packages_ledger",
      "AFTER INSERT ON public.content_packages", "SELECT id, expert_id, created_at FROM public.content_packages",
      "IF current_user NOT IN ('postgres', 'supabase_admin') THEN"]],
  ], BILLING_FIX);
  // Функция защиты биллинга обязана быть БЕЗ SECURITY DEFINER: иначе current_user = владелец функции и проверка роли пуста.
  const mig = readRepoFile(MIG_035);
  const fnBody = (name, until) => {
    if (mig === null) return "";
    const a = mig.indexOf(`CREATE OR REPLACE FUNCTION public.${name}()`); const b = mig.indexOf(until);
    return a >= 0 && b > a ? mig.slice(a, b) : "";
  };
  if (mig !== null) {
    const protect = fnBody("protect_billing_columns", "CREATE TRIGGER profiles_protect_billing");
    if (protect.length === 0 || protect.includes("SECURITY DEFINER")) finding(`[${stage}:subscription-definer]`, `${MIG_035}: protect_billing_columns отсутствует или объявлена SECURITY DEFINER (current_user внутри = владелец, проверка роли не работает)`, "функция BEFORE UPDATE без SECURITY DEFINER");
    // Триггеры под ролью пользователя (UPDATE профиля / INSERT пакета по RLS) пишут в таблицы под RLS 035 - нужен SECURITY DEFINER,
    // и созданная им запись не должна зависеть от клиентских значений (created_at леджера = now()).
    const sync = fnBody("sync_expert_niche_from_profile", "CREATE TRIGGER profiles_sync_expert_niche");
    if (!sync.includes("SECURITY DEFINER")) finding(`[${stage}:expert-niches-definer]`, `${MIG_035}: sync_expert_niche_from_profile отсутствует или без SECURITY DEFINER (вставка в expert_niches под RLS пользователя не пройдёт)`, "объявить функцию SECURITY DEFINER SET search_path = public");
    const ledger = fnBody("record_package_in_ledger", "CREATE TRIGGER content_packages_ledger");
    if (!ledger.includes("SECURITY DEFINER")) finding(`[${stage}:ledger-definer]`, `${MIG_035}: record_package_in_ledger отсутствует или без SECURITY DEFINER (вставка в леджер под RLS пользователя не пройдёт)`, "объявить функцию SECURITY DEFINER SET search_path = public");
    if (ledger.length > 0 && !ledger.includes("VALUES (NEW.id, NEW.expert_id, now())")) finding(`[${stage}:ledger-definer]`, `${MIG_035}: леджер берёт created_at из клиентской строки, а не now() (вставка «задним числом» выпадает из месячного окна)`, "VALUES (NEW.id, NEW.expert_id, now())");
    if (!mig.includes("REVOKE ALL ON FUNCTION public.record_package_in_ledger() FROM PUBLIC, anon, authenticated")) finding(`[${stage}:ledger-definer]`, `${MIG_035}: нет REVOKE на SECURITY DEFINER-функции леджера`, "REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated");
  }
  forbidGroup("subscription-legacy", [[WEB_BILLING, ["subscribe(\"free\")"]]], "кнопка «Отменить подписку» вела в /api/subscribe с free (400, ничего не происходило)");
  // Аналитика для всех опубликованных (решение владельца 2026-09-06): расписания без гейта по тарифу.
  requireGroup("analytics", [
    [MIG_035, ["cron.schedule('weekly-citations'", "cron.schedule('weekly-serp'", "cron.schedule('monthly-trust'", "'track_citations'", "'track_serp'", "is_published = TRUE",
      "cron.unschedule(jobid) FROM cron.job WHERE jobname IN (", "current_setting('cron.database_name'", "j.status IN ('pending', 'processing')"]],
    [WEB_ANALYTICS, ["select(\"trust_score, subscription_tier\")"]],
  ], BILLING_FIX);
  forbidGroup("analytics-gate", [[MIG_035, ["subscription_tier NOT IN", "subscription_tier IN ('expert'"]], [WEB_ANALYTICS, ["\"trust_score, tier\""]]],
    "аналитика цитирования открыта всем опубликованным; страница читает существующую колонку subscription_tier");
  // Ниши эксперта с сайта: backfill из profiles.niche_id и триггер синхронизации (иначе тем не будет никогда).
  requireGroup("expert-niches", [[MIG_035, ["INSERT INTO public.expert_niches (expert_id, niche_id)", "SELECT p.id, p.niche_id FROM public.profiles p", "ON CONFLICT DO NOTHING", "CREATE OR REPLACE FUNCTION public.sync_expert_niche_from_profile()",
    "CREATE TRIGGER profiles_sync_expert_niche", "AFTER INSERT OR UPDATE OF niche_id ON public.profiles",
    // Только первая ниша (пока строк нет): лишняя строка превысила бы лимит ниш тарифа. RLS: 007 её не включал.
    "NOT EXISTS (SELECT 1 FROM public.expert_niches e WHERE e.expert_id = NEW.id)",
    "ALTER TABLE public.expert_niches ENABLE ROW LEVEL SECURITY", "ON public.expert_niches FOR SELECT", "USING (auth.uid() = expert_id)"]]], BILLING_FIX);
  requireGroup("rollout", [["OPERATIONS.md", ["Порядок выкатки R-09: миграция 035 → worker → bot → web"]]],
    "записать в OPERATIONS порядок выкатки R-09: старый worker генерирует 5 форматов всем, а web/bot уже отказывают по лимиту");
}
/**
 * Живой слой billing: /api/subscribe без сессии - 401; health показывает активные расписания аналитики и
 * sweep подписки. Оффлайн - фикстура billing.json: {"subscribe": 401, "jobs": {"weekly-citations": {"active": true}, …}}.
 */
async function checkBillingLive() {
  let fx = null;
  if (fixtureDir) {
    const abs = join(fixtureDir, "billing.json");
    if (!existsSync(abs)) { finding("fixture:billing.json", "фикстура отсутствует", "положить billing.json в --fixture-dir"); return; }
    fx = JSON.parse(readFileSync(abs, "utf8"));
  }
  const subscribe = fx ? fx.subscribe : (await fetchWithRetry(`${baseUrl}/api/subscribe`, { method: "POST", redirect: "manual", headers: { "content-type": "application/json" }, body: JSON.stringify({ tier: "pro" }) })).status;
  if (subscribe !== 401) finding("/api/subscribe", `без сессии: HTTP ${subscribe} (ожидается 401)`, "отказ до создания платежа");
  let jobs;
  if (fx) jobs = fx.jobs ?? null;
  else {
    const health = await getHealth();
    jobs = health?.cron?.jobs ?? null;
  }
  if (!jobs || typeof jobs !== "object") { finding("/api/health", "нет блока cron.jobs", "миграция 031/035 и RPC infra_status"); return; }
  for (const name of BILLING_CRON) {
    const job = jobs[name];
    if (!job) { finding("/api/health", `расписание ${name} отсутствует (миграция 035 не применена)`, "применить 035: cron.schedule без гейта по тарифу"); continue; }
    if (job.active !== true) finding("/api/health", `расписание ${name} неактивно`, "включить расписание");
    if (job.last_status === "failed") finding("/api/health", `последний запуск ${name} failed`, "смотреть cron.job_run_details");
  }
}

if (stage === "billing") {
  checkBillingRepo();
  if (!repoOnly) {
    try { await checkBillingLive(); }
    catch (err) { transportErrors.push(err instanceof Error ? err.message : String(err)); }
  }
} else if (stage === "notify") {
  checkNotifyRepo();
  if (!repoOnly) {
    try { await checkNotifyLive(); }
    catch (err) { transportErrors.push(err instanceof Error ? err.message : String(err)); }
  }
} else if (stage === "publish") {
  checkPublishRepo();
  if (!repoOnly) {
    try { await checkPublishLive(); }
    catch (err) { transportErrors.push(err instanceof Error ? err.message : String(err)); }
  }
} else if (stage === "demand") {
  checkDemandRepo();
  if (!repoOnly) {
    try { await checkDemandLive(); }
    catch (err) { transportErrors.push(err instanceof Error ? err.message : String(err)); }
  }
} else {
  checkInfraRepo();
  if (!repoOnly) {
    try { checkInfraHealth(await getHealth()); await checkAudioRouteLive(); }
    catch (err) { transportErrors.push(err instanceof Error ? err.message : String(err)); }
  }
}

// Находки доминируют над транспортом (exit 3 не маскирует repo-находки).
if (findings.length > 0) {
  for (const f of findings) console.error(f);
  console.error(`\n${findings.length} finding(s).`);
  if (transportErrors.length > 0) console.error(`transport (дополнительно): живой контур недоступен: ${transportErrors.join("; ")}`);
  process.exit(1);
}
if (transportErrors.length > 0) { console.error(`transport: живой контур недоступен: ${transportErrors.join("; ")}`); process.exit(3); }
const target = repoOnly ? "repo-only" : (fixtureDir ? `fixtures:${fixtureDir}` : baseUrl);
console.log(`Expert-path ${stage} stage verification passed for ${target}`);
