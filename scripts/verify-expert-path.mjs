#!/usr/bin/env node
/**
 * Оракул экспертного контура (ADR-004, R-05+). Стадии:
 *   --stage=infra   R-05: pg_cron установлен и расписания weekly-demand / weekly-generate-orders
 *                   активны; bucket voice приватный и создаётся миграцией; бот и web обязаны
 *                   загрузить аудио в Storage до записи voice_recordings; health отдаёт cron/storage.
 *   (demand / voice / publish — R-06+, пока не реализованы: exit 2.)
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
const STAGES = new Set(["infra", "demand"]);
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
  console.error(`usage: --stage=<${[...STAGES].join("|")}> обязателен (publish — R-07+)`);
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

if (stage === "demand") {
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
