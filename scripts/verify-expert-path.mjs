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
const STAGES = new Set(["infra"]);
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
  console.error(`usage: --stage=<${[...STAGES].join("|")}> обязателен (demand/voice/publish — R-06+)`);
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
  if (missing.length > 0) finding(`[infra:${name}]`, missing.join("; "), fix);
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
  } else if (storage.voice_bucket !== "private") {
    finding("/api/health", `storage.voice_bucket = ${JSON.stringify(storage.voice_bucket)} (ожидается \"private\")`,
      "миграция 031: bucket voice public = false; «missing» — bucket не создан");
  }
}

checkInfraRepo();
if (!repoOnly) {
  try { checkInfraHealth(await getHealth()); await checkAudioRouteLive(); }
  catch (err) { transportErrors.push(err instanceof Error ? err.message : String(err)); }
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
