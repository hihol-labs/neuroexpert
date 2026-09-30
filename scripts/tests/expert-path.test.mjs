#!/usr/bin/env node
/**
 * Мутационный тест оракула verify-expert-path.mjs --stage=infra (R-05): зелёное фикстурное репо и
 * health проходят; каждая заведомая регрессия (репо и живой слой) обязана краснить оракул.
 * Защита от оракула-тавтологии (как preflight.test.mjs / selfserve-path.test.mjs).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const oracle = resolve(here, "..", "verify-expert-path.mjs");

const GREEN_FILES = {
  "packages/supabase/migrations/031_cron_and_voice_bucket.sql": [
    "DO $$ BEGIN IF current_setting('cron.database_name', true) IS DISTINCT FROM current_database() THEN RAISE EXCEPTION 'cron.database_name mismatch'; END IF; END $$;",
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN CREATE ROLE supabase_admin SUPERUSER NOLOGIN; END IF; END $$;",
    "CREATE EXTENSION IF NOT EXISTS pg_cron;",
    "SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('weekly-demand','weekly-generate-orders');",
    "SELECT cron.schedule('weekly-demand', '0 3 * * 1', $$INSERT INTO public.jobs (type, payload) SELECT 'collect_demand', jsonb_build_object('niche_id', id) FROM public.niches WHERE is_active = TRUE$$);",
    "SELECT cron.schedule('weekly-generate-orders', '0 4 * * 1', $$INSERT INTO public.jobs (type, payload, priority) SELECT 'generate_orders', jsonb_build_object('niche_id', id), 3 FROM public.niches WHERE is_active = TRUE$$);",
    "INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('voice', 'voice', false, 26214400, ARRAY['audio/*']) ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 26214400, allowed_mime_types = ARRAY['audio/*'];",
    "CREATE OR REPLACE FUNCTION public.infra_status() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN '{}'::jsonb; END $$;",
  ].join("\n") + "\n",
  "packages/supabase/migrations/032_storage_role_grants.sql": [
    "GRANT anon, authenticated, service_role TO supabase_storage_admin;",
    "GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;",
    "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE storage.objects TO service_role;",
    "GRANT SELECT ON TABLE storage.buckets TO service_role;",
    "CREATE OR REPLACE FUNCTION public.infra_status() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN jsonb_build_object('storage', jsonb_build_object('upload_ready', pg_has_role('supabase_storage_admin', 'service_role', 'MEMBER') AND has_table_privilege('service_role', 'storage.objects', 'DELETE') AND has_table_privilege('service_role', 'storage.buckets', 'SELECT'))); END $$;",
  ].join("\n") + "\n",
  "apps/bot/src/handlers/voice.ts": [
    "const { error: uploadError } = await supabase.storage.from(\"voice\").upload(filePath, audioBuffer, { contentType: \"audio/ogg\", upsert: false });",
    "if (uploadError) { console.error(\"[voice] Upload error:\", uploadError); await ctx.reply(\"Не удалось сохранить запись, попробуйте еще раз.\"); return; }",
  ].join("\n") + "\n",
  "apps/web/app/api/voice/route.ts": [
    "const { error: uploadError } = await admin.storage.from(\"voice\").upload(filePath, buffer, { contentType: audioFile.type || \"audio/webm\", upsert: false });",
    "if (uploadError) { return NextResponse.json({ error: \"Failed to store audio\" }, { status: 500 }); }",
  ].join("\n") + "\n",
  "apps/web/app/experts/[slug]/[articleSlug]/page.tsx": "const audioUrl = voice?.file_path && voiceId ? `/api/audio/${voiceId}` : null;\n",
  "apps/web/app/api/v1/answers/route.ts": "audio_url: voice?.file_path && voiceId ? `${appUrl}/api/audio/${voiceId}` : null,\n",
  "apps/web/app/api/audio/[id]/route.ts": "const { data: published } = await admin.from(\"content_packages\").select(\"id\").eq(\"voice_id\", id).eq(\"status\", \"published\").maybeSingle();\nconst { data: signed } = await admin.storage.from(\"voice\").createSignedUrl(recording.file_path, 3600);\nreturn NextResponse.redirect(signed.signedUrl, { status: 302 });\n",
  "apps/web/app/api/health/route.ts": [
    "const { data: infra } = await supabase.rpc(\"infra_status\");",
    "return NextResponse.json({ cron: infra?.cron ?? null, storage: infra?.storage ?? { voice_bucket: null } });",
  ].join("\n") + "\n",
};

const GREEN_HEALTH = {
  status: "ok",
  cron: {
    extension: true,
    jobs: {
      "weekly-demand": { schedule: "0 3 * * 1", active: true, last_status: "succeeded", last_run_at: "2026-09-07T03:00:01Z" },
      "weekly-generate-orders": { schedule: "0 4 * * 1", active: true, last_status: null, last_run_at: null },
    },
  },
  storage: { voice_bucket: "private", upload_ready: true },
};

function writeRepo(root, files) {
  for (const [rel, body] of Object.entries(files)) {
    if (body === null) continue;
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  mkdirSync(root, { recursive: true });
}
const GREEN_AUDIO = [
  { id: "00000000-0000-0000-0000-000000000000", status: 404, contentType: "application/json" },
  { id: "not-a-uuid", status: 404, contentType: "application/json" },
];
function writeFixtures(dir, health, audio = GREEN_AUDIO) {
  mkdirSync(dir, { recursive: true });
  if (health !== null) writeFileSync(join(dir, "health.json"), JSON.stringify(health));
  if (audio !== null) writeFileSync(join(dir, "audio.json"), JSON.stringify(audio));
}
function run(args, env = {}) {
  try {
    const stdout = execFileSync(process.execPath, [oracle, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...env } });
    return { code: 0, out: stdout };
  } catch (err) {
    return { code: err.status ?? -1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}
function runOracle(repoRoot, fixtureDir, extra = []) {
  return run(["--stage=infra", "--repo-root", repoRoot, ...(fixtureDir ? ["--fixture-dir", fixtureDir] : ["--repo-only"]), ...extra]);
}

const failures = [];
let caseNo = 0;
function expect(label, actual, expected, out) {
  caseNo += 1;
  if (actual === expected) console.log(`  OK  [${caseNo}] ${label} -> exit ${actual}`);
  else { failures.push(label); console.error(`FAIL  [${caseNo}] ${label}: exit ${actual}, ожидался ${expected}\n${out}`); }
}

const work = mkdtempSync(join(tmpdir(), "expert-path-test-"));
try {
  // ===== usage =====
  {
    const repo = join(work, "usage"); writeRepo(repo, GREEN_FILES);
    expect("usage: без --stage -> exit 2", run(["--repo-root", repo, "--repo-only"]).code, 2, "");
    expect("usage: неизвестная стадия -> exit 2", run(["--stage=tariffs", "--repo-root", repo, "--repo-only"]).code, 2, "");
    expect("usage: неизвестный флаг -> exit 2", run(["--stage=infra", "--repo-root", repo, "--repo-only", "--base_url", "x"]).code, 2, "");
    expect("usage: без живого контура и без --repo-only -> exit 2", run(["--stage=infra", "--repo-root", repo], { EXPERT_URL: "", SELFSERVE_URL: "", CANONICAL_URL: "" }).code, 2, "");
    const fx = join(work, "usage-fx"); writeFixtures(fx, GREEN_HEALTH);
    expect("usage: --fixture-dir и --base-url взаимоисключающи -> exit 2", run(["--stage=infra", "--repo-root", repo, "--fixture-dir", fx, "--base-url", "http://127.0.0.1:1"]).code, 2, "");
  }

  // ===== позитив =====
  {
    const repo = join(work, "green"); writeRepo(repo, GREEN_FILES);
    const fx = join(work, "green-fx"); writeFixtures(fx, GREEN_HEALTH);
    const r = runOracle(repo, fx); expect("зелёное репо + зелёный health -> exit 0", r.code, 0, r.out);
    const r2 = runOracle(repo, null); expect("--repo-only на зелёном репо -> exit 0", r2.code, 0, r2.out);
    const bare = join(work, "bare"); mkdirSync(bare, { recursive: true });
    const r3 = runOracle(bare, null); expect("пустое репо -> exit 1", r3.code, 1, r3.out);
    const m = /(\d+) finding\(s\)/.exec(r3.out); expect("пустое репо даёт ровно 6 групповых находок", m ? Number(m[1]) : -1, 6, r3.out);
  }

  // ===== мутации репо =====
  const F = GREEN_FILES; const MIG = "packages/supabase/migrations/031_cron_and_voice_bucket.sql";
  const repoMutations = [
    ["миграция: нет CREATE EXTENSION pg_cron (инцидент прода: расширение никогда не ставилось)", { [MIG]: F[MIG].replace("CREATE EXTENSION IF NOT EXISTS pg_cron;", "") }],
    ["миграция: нет guard cron.database_name (задания регистрируются, но не исполняются)", { [MIG]: F[MIG].replace("current_setting('cron.database_name', true)", "current_setting('cron.db', true)") }],
    ["миграция: guard не падает (нет RAISE EXCEPTION)", { [MIG]: F[MIG].replace("RAISE EXCEPTION", "RAISE NOTICE") }],
    ["миграция: нет роли-плейсхолдера supabase_admin (CREATE EXTENSION падает на self-hosted, прод 2026-09-08)", { [MIG]: F[MIG].replace("CREATE ROLE supabase_admin SUPERUSER NOLOGIN;", "") }],
    ["миграция: плейсхолдер с LOGIN (лишний суперпользователь с входом)", { [MIG]: F[MIG].replace("SUPERUSER NOLOGIN", "SUPERUSER LOGIN") }],
    ["миграция: нет weekly-demand", { [MIG]: F[MIG].replace("cron.schedule('weekly-demand'", "cron.schedule('weekly-demand-old'") }],
    ["миграция: нет weekly-generate-orders", { [MIG]: F[MIG].replace("cron.schedule('weekly-generate-orders'", "cron.schedule('weekly-orders'") }],
    ["миграция: расписания не идемпотентны (нет cron.unschedule)", { [MIG]: F[MIG].replace("cron.unschedule(", "cron.noop(") }],
    ["миграция: bucket voice остаётся публичным", { [MIG]: F[MIG].replace("public = false", "public = true") }],
    ["миграция: bucket не создаётся миграцией", { [MIG]: F[MIG].replace("storage.buckets", "storage.objects") }],
    ["миграция: bucket без лимита размера и типов", { [MIG]: F[MIG].replace("INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('voice', 'voice', false, 26214400, ARRAY['audio/*']) ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 26214400, allowed_mime_types = ARRAY['audio/*'];", "INSERT INTO storage.buckets (id, name, public) VALUES ('voice', 'voice', false) ON CONFLICT (id) DO UPDATE SET public = false;") }],
    ["миграция: нет RPC infra_status", { [MIG]: F[MIG].replace("FUNCTION public.infra_status(", "FUNCTION public.cron_status(") }],
    ["миграция: RPC без SECURITY DEFINER (PostgREST не увидит cron/storage)", { [MIG]: F[MIG].replace("SECURITY DEFINER", "SECURITY INVOKER") }],
    ["гранты: supabase_storage_admin не член service_role (инцидент 2026-09-18: 403 на любую загрузку)", { "packages/supabase/migrations/032_storage_role_grants.sql": F["packages/supabase/migrations/032_storage_role_grants.sql"].replace("GRANT anon, authenticated, service_role TO supabase_storage_admin;", "") }],
    ["гранты: нет USAGE на схему storage", { "packages/supabase/migrations/032_storage_role_grants.sql": F["packages/supabase/migrations/032_storage_role_grants.sql"].replace("GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;", "") }],
    ["гранты: service_role без прав на таблицы storage", { "packages/supabase/migrations/032_storage_role_grants.sql": F["packages/supabase/migrations/032_storage_role_grants.sql"].replace("GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE storage.objects TO service_role;", "") }],
    ["гранты: service_role не видит buckets (upload не найдёт bucket)", { "packages/supabase/migrations/032_storage_role_grants.sql": F["packages/supabase/migrations/032_storage_role_grants.sql"].replace("GRANT SELECT ON TABLE storage.buckets TO service_role;", "") }],
    ["гранты: на buckets выдан лишний DML (шире проверяемого набора)", { "packages/supabase/migrations/032_storage_role_grants.sql": F["packages/supabase/migrations/032_storage_role_grants.sql"].replace("GRANT SELECT ON TABLE storage.buckets TO service_role;", "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE storage.buckets TO service_role;") }],
    ["гранты: health не отдаёт upload_ready", { "packages/supabase/migrations/032_storage_role_grants.sql": F["packages/supabase/migrations/032_storage_role_grants.sql"].replace("upload_ready", "ready") }],
    ["гранты: upload_ready не проверяет права на buckets (ложный true при частичном отзыве)", { "packages/supabase/migrations/032_storage_role_grants.sql": F["packages/supabase/migrations/032_storage_role_grants.sql"].replace(" AND has_table_privilege('service_role', 'storage.buckets', 'SELECT')", "") }],
    ["гранты: upload_ready не проверяет DELETE на objects", { "packages/supabase/migrations/032_storage_role_grants.sql": F["packages/supabase/migrations/032_storage_role_grants.sql"].replace(" AND has_table_privilege('service_role', 'storage.objects', 'DELETE')", "") }],
    ["гранты: миграция 032 отсутствует", { "packages/supabase/migrations/032_storage_role_grants.sql": null }],
    ["бот: аудио не заливается в Storage (E-AUTO-6)", { "apps/bot/src/handlers/voice.ts": "await ctx.reply(\"Получил голосовое сообщение. Расшифровываю...\");\n" }],
    ["бот: ошибка upload игнорируется", { "apps/bot/src/handlers/voice.ts": F["apps/bot/src/handlers/voice.ts"].replace("error: uploadError", "error: _ignored").replace("Не удалось сохранить запись", "Получил") }],
    ["web: upload best-effort без 500", { "apps/web/app/api/voice/route.ts": "await admin.storage.from(\"voice\").upload(filePath, buffer);\n" }],
    ["читатели: плеер статьи строит публичный URL на приватный bucket", { "apps/web/app/experts/[slug]/[articleSlug]/page.tsx": "const audioUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/voice/${voice.file_path}`;\n" }],
    ["читатели: плеер запекает подписанный URL в ISR-страницу (протухает)", { "apps/web/app/experts/[slug]/[articleSlug]/page.tsx": "const { data: signed } = await supabase.storage.from(\"voice\").createSignedUrl(voice.file_path, 86400);\nconst audioUrl = signed?.signedUrl ?? `/api/audio/${voiceId}`;\n" }],
    ["читатели: /api/v1/answers без ссылки на /api/audio", { "apps/web/app/api/v1/answers/route.ts": "const audio_url = null;\n" }],
    ["читатели: ссылка есть, но публичный URL остался", { "apps/web/app/api/v1/answers/route.ts": F["apps/web/app/api/v1/answers/route.ts"] + "const legacy = `${storageUrl}/storage/v1/object/public/voice/${voice.file_path}`;\n" }],
    ["роут /api/audio отдаёт неопубликованные записи (нет проверки published)", { "apps/web/app/api/audio/[id]/route.ts": F["apps/web/app/api/audio/[id]/route.ts"].replace(".eq(\"status\", \"published\")", "") }],
    ["роут /api/audio без подписи (redirect на public URL)", { "apps/web/app/api/audio/[id]/route.ts": F["apps/web/app/api/audio/[id]/route.ts"].replace("createSignedUrl(", "getPublicUrl(") }],
    ["роут /api/audio отсутствует", { "apps/web/app/api/audio/[id]/route.ts": null }],
    ["health: нет блока cron/storage", { "apps/web/app/api/health/route.ts": "return NextResponse.json({ status: \"ok\" });\n" }],
    ["health: файл отсутствует", { "apps/web/app/api/health/route.ts": null }],
  ];
  repoMutations.forEach(([label, ov], i) => {
    const repo = join(work, `m${i}`); const files = { ...GREEN_FILES };
    for (const [k, v] of Object.entries(ov)) { if (v === null) delete files[k]; else files[k] = v; }
    writeRepo(repo, files);
    const fx = join(work, `m${i}-fx`); writeFixtures(fx, GREEN_HEALTH);
    const r = runOracle(repo, fx); expect(`мутация репо: ${label}`, r.code, 1, r.out);
  });

  // ===== мутации живого слоя =====
  const H = GREEN_HEALTH;
  const liveMutations = [
    ["health: cron.extension false (pg_cron не установлен — прод 2026-09-08)", { ...H, cron: { ...H.cron, extension: false } }],
    ["health: weekly-demand отсутствует в cron.jobs", { ...H, cron: { ...H.cron, jobs: { "weekly-generate-orders": H.cron.jobs["weekly-generate-orders"] } } }],
    ["health: weekly-generate-orders неактивен", { ...H, cron: { ...H.cron, jobs: { ...H.cron.jobs, "weekly-generate-orders": { ...H.cron.jobs["weekly-generate-orders"], active: false } } } }],
    ["health: последний запуск weekly-demand failed", { ...H, cron: { ...H.cron, jobs: { ...H.cron.jobs, "weekly-demand": { ...H.cron.jobs["weekly-demand"], last_status: "failed" } } } }],
    ["health: блока cron нет (миграция 031 не применена)", { status: "ok", storage: H.storage }],
    ["health: bucket voice публичный", { ...H, storage: { voice_bucket: "public", upload_ready: true } }],
    ["health: bucket voice отсутствует", { ...H, storage: { voice_bucket: "missing", upload_ready: true } }],
    ["health: upload_ready false (гранты 032 не применены — прод 2026-09-18)", { ...H, storage: { voice_bucket: "private", upload_ready: false } }],
    ["health: upload_ready отсутствует (старая infra_status)", { ...H, storage: { voice_bucket: "private" } }],
    ["health: блока storage нет", { status: "ok", cron: H.cron }],
  ];
  liveMutations.forEach(([label, health], i) => {
    const repo = join(work, `lm${i}`); writeRepo(repo, GREEN_FILES);
    const fx = join(work, `lm${i}-fx`); writeFixtures(fx, health);
    const r = runOracle(repo, fx); expect(`мутация live: ${label}`, r.code, 1, r.out);
  });
  {
    const repo = join(work, "nofx"); writeRepo(repo, GREEN_FILES);
    const fx = join(work, "nofx-fx"); writeFixtures(fx, null);
    const r = runOracle(repo, fx); expect("фикстура health.json отсутствует -> exit 1", r.code, 1, r.out);
  }
  // ===== живой слой /api/audio =====
  const A = GREEN_AUDIO;
  const audioMutations = [
    ["/api/audio: роут отсутствует (HTML 404 от Next)", A.map((p) => ({ ...p, contentType: "text/html; charset=utf-8" }))],
    ["/api/audio: неизвестный id отдаёт 302 (утечка/перебор)", [{ ...A[0], status: 302 }, A[1]]],
    ["/api/audio: невалидный id -> 500", [A[0], { ...A[1], status: 500 }]],
    ["/api/audio: неизвестный id -> 200", [{ ...A[0], status: 200 }, A[1]]],
    ["/api/audio: фикстура без пробы not-a-uuid", [A[0]]],
    ["/api/audio: фикстура audio.json отсутствует", null],
  ];
  audioMutations.forEach(([label, audio], i) => {
    const repo = join(work, `am${i}`); writeRepo(repo, GREEN_FILES);
    const fx = join(work, `am${i}-fx`); writeFixtures(fx, GREEN_HEALTH, audio);
    const r = runOracle(repo, fx); expect(`мутация live: ${label}`, r.code, 1, r.out);
  });

  // ===== транспорт: мёртвый URL -> exit 3; находки репо доминируют -> exit 1 =====
  {
    const env = { EXPERT_ATTEMPTS: "1", EXPERT_TIMEOUT_MS: "800", EXPERT_RETRY_DELAY_MS: "0" };
    const repo = join(work, "live-green"); writeRepo(repo, GREEN_FILES);
    const r = run(["--stage=infra", "--repo-root", repo, "--base-url", "http://127.0.0.1:1"], env);
    expect("живой контур недоступен при зелёном репо -> exit 3", r.code, 3, r.out);
    const bare = join(work, "live-bare"); mkdirSync(bare, { recursive: true });
    const r2 = run(["--stage=infra", "--repo-root", bare, "--base-url", "http://127.0.0.1:1"], env);
    expect("находки репо доминируют над транспортом -> exit 1", r2.code, 1, r2.out);
  }

  // ===== R-06: стадия demand =====
  {
    const D = {
      shared: "packages/shared/src/orders/expert-selection.ts",
      index: "packages/shared/src/index.ts",
      sharedTest: "packages/shared/tests/expert-selection.test.cjs",
      lib: "apps/web/lib/expert-orders.ts",
      accept: "apps/web/app/api/expert-orders/[id]/accept/route.ts",
      skip: "apps/web/app/api/expert-orders/[id]/skip/route.ts",
      get: "apps/web/app/api/expert-orders/[id]/route.ts",
      gen: "apps/web/app/api/expert-orders/generate/route.ts",
      dash: "apps/web/app/(dashboard)/orders/page.tsx",
      contentNew: "apps/web/app/(dashboard)/content/new/page.tsx",
      voice: "apps/web/app/api/voice/route.ts",
      botVoice: "apps/bot/src/handlers/voice.ts",
      botRecord: "apps/bot/src/commands/record.ts",
      botKeys: "apps/bot/src/keyboards.ts",
      botCb: "apps/bot/src/handlers/callback.ts",
      handler: "apps/worker/src/jobs/generate-orders.ts",
    };
    const GREEN_DEMAND = {
      [D.shared]: "export const GENERATE_COOLDOWN_MS = 86400000;\nexport function decideOrderSelection(order, userId, action) { return { ok: true, status: action === \"accept\" ? \"accepted\" : \"rejected\" }; }\nexport function decideGenerateNow(last, now) {}\nexport function planExpertOrders(input) {}\nexport function isFirstGenerateRequest(mine, others) {}\nexport function isSameOriginRequest(origin, site, allowed) {}\n",
      [D.index]: "export * from \"./orders/expert-selection.js\";\n",
      [D.sharedTest]: "const {decideOrderSelection, decideGenerateNow, planExpertOrders} = require('../dist/orders/expert-selection.js');\n",
      [D.lib]: "if (!user) return NextResponse.json({ error: \"Unauthorized\" }, { status: 401 });\nif (!isSameOriginPost(request)) return NextResponse.json({ error: \"Forbidden\" }, { status: 403 });\nexport function isSameOriginPost(request) {\n  const allowed = [process.env[\"APP_URL\"] ?? \"\", process.env[\"NEXT_PUBLIC_APP_URL\"] ?? \"\"];\n  if (process.env.NODE_ENV === \"development\") { allowed.push(`http://${request.headers.get(\"host\")}`); }\n  return isSameOriginRequest(o, s, allowed);\n}\nawait admin.from(\"orders\").update({ status }).eq(\"id\", id).eq(\"expert_id\", user.id).eq(\"status\", \"pending\");\nconst d = decideOrderSelection(order, user.id, action);\nreturn NextResponse.redirect(url, 303);\nexport async function resolveVoiceOrder(admin, expertId, orderId) { return admin.from(\"orders\").select(\"id\")\n      .eq(\"expert_id\", expertId)\n      .eq(\"status\", \"accepted\")\n      .maybeSingle(); }\n",
      [D.accept]: "export async function POST(request, { params }) { return handleExpertOrderSelection(request, params.id, \"accept\"); }\n",
      [D.skip]: "export async function POST(request, { params }) { return handleExpertOrderSelection(request, params.id, \"skip\"); }\n",
      [D.get]: "if (!user) return NextResponse.json({ error: \"Unauthorized\" }, { status: 401 });\nadmin.from(\"orders\").select(\"id, status, questions(question_text)\").eq(\"expert_id\", user.id);\n",
      [D.gen]: "if (!user) return NextResponse.json({ error: \"Unauthorized\" }, { status: 401 });\nif (!isSameOriginPost(request)) return NextResponse.json({ error: \"Forbidden\" }, { status: 403 });\nif (!isFirstGenerateRequest(mine, others)) return redirect(\"generate_cooldown\");\nconst d = decideGenerateNow(last, Date.now());\nif (!d.ok) return redirect(\"generate_cooldown\");\nawait admin.from(\"jobs\").insert({ type: \"generate_orders\", payload: { niche_id, expert_id: user.id } });\n",
      [D.dash]: "const STATUS_LABELS = { expired: \"Истекли\" };\n<form action=\"/api/expert-orders/generate\" method=\"POST\"><button>Подобрать темы сейчас</button></form>\n<form action={`/api/expert-orders/${o.id as string}/skip`} method=\"POST\" />\n<form action={`/api/expert-orders/${o.id as string}/accept`} method=\"POST\" />\n<Link href={`/content/new?order_id=${o.id as string}`}>Записать ответ</Link>\n",
      [D.contentNew]: "const params = useSearchParams();\nformData.append(\"order_id\", orderId);\n<p>{order.question_text}</p>\n",
      [D.voice]: "const orderId = formData.get(\"order_id\");\nconst resolved = await resolveVoiceOrder(admin, profile.id, orderId);\nif (resolved.code === \"order_required\") return NextResponse.json({ error: \"x\" }, { status: 400 });\n",
      [D.botVoice]: "const { data } = await supabase.from(\"orders\").select(\"id\").eq(\"status\", \"accepted\").order(\"updated_at\", { ascending: false }).limit(1);\nawait ctx.reply(`Вопрос: ${q}`);\n",
      [D.botRecord]: "await ctx.reply(\"Выберите тему\", { reply_markup: recordOrderKeyboard(accepted) });\n",
      [D.botKeys]: "export function recordOrderKeyboard(orders) { return new InlineKeyboard().text(\"x\", `record_order:${orders[0].id}`); }\n",
      [D.botCb]: "bot.callbackQuery(/^record_order:(.+)$/, async (ctx) => { await supabase.from(\"orders\").update({ updated_at: new Date().toISOString() }); });\n",
      "OPERATIONS.md": "### 9f\n- **Порядок выкатки: worker → web → bot.** При откате — обратный порядок: сначала web, потом worker.\n",
      [D.handler]: "const onlyExpertId = expertIdFrom(payload.expert_id);\nconst plan = planExpertOrders({ questions, experts, existing, onlyExpertId });\n",
    };
    const GREEN_DEMAND_FX = ["accept", "skip", "generate", "order-get", "paid-order"].map((probe) => ({ probe, status: 401 }))
      .concat([{ probe: "legacy-accept", status: 405 }, { probe: "legacy-skip", status: 405 }]);
    const writeDemandFx = (dir, rows) => { mkdirSync(dir, { recursive: true }); if (rows !== null) writeFileSync(join(dir, "demand.json"), JSON.stringify(rows)); };
    const runDemand = (repo, fx) => run(["--stage=demand", "--repo-root", repo, ...(fx ? ["--fixture-dir", fx] : ["--repo-only"])]);

    const repo = join(work, "demand-green"); writeRepo(repo, GREEN_DEMAND);
    const fx = join(work, "demand-green-fx"); writeDemandFx(fx, GREEN_DEMAND_FX);
    { const r = runDemand(repo, fx); expect("demand: зелёное репо + зелёные пробы -> exit 0", r.code, 0, r.out); }
    { const r = runDemand(repo, null); expect("demand: --repo-only на зелёном репо -> exit 0", r.code, 0, r.out); }
    {
      const bare = join(work, "demand-bare"); mkdirSync(bare, { recursive: true });
      const r = runDemand(bare, null); expect("demand: пустое репо -> exit 1", r.code, 1, r.out);
      const m = /(\d+) finding\(s\)/.exec(r.out); expect("demand: пустое репо даёт ровно 7 групповых находок (forbid-группы молчат)", m ? Number(m[1]) : -1, 7, r.out);
    }
    {
      // Репо до R-06: старые кнопки и «первый принятый заказ» - legacy-группы обязаны краснеть.
      const before = join(work, "demand-before");
      writeRepo(before, { ...GREEN_DEMAND,
        [D.dash]: GREEN_DEMAND[D.dash] + "<form action=\"/api/orders/accept\" method=\"POST\" />\n",
        [D.voice]: GREEN_DEMAND[D.voice] + "q.order(\"created_at\", { ascending: true })\n" });
      const r = runDemand(before, null); expect("demand: остатки старого поведения -> exit 1", r.code, 1, r.out);
      const m = /(\d+) finding\(s\)/.exec(r.out); expect("demand: остатки дают ровно 2 legacy-находки", m ? Number(m[1]) : -1, 2, r.out);
    }
    const G = GREEN_DEMAND;
    const demandMutations = [
      ["shared: skip не пишет rejected (статуса skipped в CHECK нет)", { [D.shared]: G[D.shared].replace("\"rejected\"", "\"skipped\"") }],
      ["shared: решение не экспортировано", { [D.index]: "export {};\n" }],
      ["shared: нет unit-тестов решения", { [D.sharedTest]: "// todo\n" }],
      ["web: обновление без проверки владельца", { [D.lib]: G[D.lib].replace(".eq(\"expert_id\", user.id)", "") }],
      ["web: можно принять уже обработанный заказ (нет фильтра pending)", { [D.lib]: G[D.lib].replace(".eq(\"status\", \"pending\")", "") }],
      ["web: нет отказа без сессии", { [D.lib]: G[D.lib].replace("status: 401", "status: 200") }],
      ["web: форма не получает редирект 303", { [D.lib]: G[D.lib].replace("redirect(url, 303)", "redirect(url, 307)") }],
      ["web: роут accept отсутствует", { [D.accept]: null }],
      ["web: skip вызывает accept", { [D.skip]: G[D.skip].replace("\"skip\")", "\"accept\")") }],
      ["web: GET заказа без проверки владельца", { [D.get]: G[D.get].replace(".eq(\"expert_id\", user.id)", "") }],
      ["дашборд: кнопка принять ведёт на старый путь", { [D.dash]: G[D.dash].replace("action={`/api/expert-orders/${o.id as string}/accept`}", "action=\"/api/orders/accept\"") }],
      ["дашборд: нет кнопки «Подобрать темы сейчас»", { [D.dash]: G[D.dash].replace("Подобрать темы сейчас", "Обновить") }],
      ["дашборд: ссылка записи без order_id", { [D.dash]: G[D.dash].replace("href={`/content/new?order_id=${o.id as string}`}", "href=\"/content/new\"") }],
      ["дашборд: статус expired без подписи", { [D.dash]: G[D.dash].replace("expired: \"Истекли\"", "") }],
      ["voice web: order_id не читается", { [D.voice]: G[D.voice].replace("formData.get(\"order_id\")", "null") }],
      ["voice web: остался «первый принятый заказ»", { [D.voice]: G[D.voice] + ".order(\"created_at\", { ascending: true })\n" }],
      ["voice web: запись без выбора темы не отклоняется", { [D.voice]: G[D.voice].replace("order_required", "ok") }],
      ["voice web: привязка к заказу не в статусе accepted", { [D.lib]: G[D.lib].replace("      .eq(\"status\", \"accepted\")\n", "") }],
      ["страница записи не передаёт order_id", { [D.contentNew]: G[D.contentNew].replace("formData.append(\"order_id\"", "formData.append(\"x\"") }],
      ["страница записи не показывает вопрос", { [D.contentNew]: G[D.contentNew].replace("question_text", "id") }],
      ["бот: привязка к первому по created_at", { [D.botVoice]: G[D.botVoice].replace(".order(\"updated_at\", { ascending: false })", ".order(\"created_at\", { ascending: true })") }],
      ["бот: вопрос не назван в ответе", { [D.botVoice]: G[D.botVoice].replace("Вопрос: ", "") }],
      ["бот: /record без выбора темы", { [D.botRecord]: "await ctx.reply(\"ответ будет привязан к первому из них\");\n" }],
      ["бот: колбэк выбора темы отсутствует", { [D.botCb]: "// none\n" }],
      ["web: accept/skip без проверки origin (CSRF)", { [D.lib]: G[D.lib].replace("if (!isSameOriginPost(request)) return", "if (false) return") }],
      ["CSRF: разрешённый origin выводится из X-Forwarded-Host запроса", { [D.lib]: G[D.lib] + "const h = request.headers.get(\"x-forwarded-host\");\n" }],
      ["CSRF: хост запроса разрешён вне явного режима разработки", { [D.lib]: G[D.lib].replace("if (process.env.NODE_ENV === \"development\") {", "if (process.env.NODE_ENV !== \"production\") {") }],
      ["CSRF: канонический origin не из конфигурации", { [D.lib]: G[D.lib].replace("process.env[\"APP_URL\"] ?? \"\"", "request.url") }],
      ["CSRF: NEXT_PUBLIC_APP_URL читается точечной записью (инлайнится при сборке)", { [D.lib]: G[D.lib].replace("process.env[\"NEXT_PUBLIC_APP_URL\"]", "process.env.NEXT_PUBLIC_APP_URL") }],
      ["runbook: порядок выкатки не записан", { "OPERATIONS.md": "### 9f\nвыкатывать как обычно\n" }],
      ["runbook: порядок выкатки web раньше worker", { "OPERATIONS.md": "### 9f\n- **Порядок выкатки: web → worker → bot.** При откате — обратный порядок: сначала web.\n" }],
      ["генерация: без проверки origin (CSRF)", { [D.gen]: G[D.gen].replace("if (!isSameOriginPost(request)) return", "if (false) return") }],
      ["генерация: гонка двух кликов обходит лимит", { [D.gen]: G[D.gen].replace("isFirstGenerateRequest(", "always(") }],
      ["shared: нет проверки origin", { [D.shared]: G[D.shared].replace("export function isSameOriginRequest(", "function sameOrigin(") }],
      ["генерация: нет лимита 24 ч", { [D.gen]: G[D.gen].replace("decideGenerateNow(", "allow(") }],
      ["генерация: job без expert_id (темы всем экспертам ниши)", { [D.gen]: G[D.gen].replace("expert_id: user.id", "") }],
      ["генерация: роут без отказа без сессии", { [D.gen]: G[D.gen].replace("status: 401", "status: 200") }],
      ["worker: handler игнорирует expert_id", { [D.handler]: G[D.handler].replace("payload.expert_id", "payload.x") }],
      ["worker: план не через planExpertOrders", { [D.handler]: G[D.handler].replace("planExpertOrders(", "plan(") }],
    ];
    demandMutations.forEach(([label, ov], i) => {
      const d = join(work, `demand-m${i}`); writeRepo(d, { ...GREEN_DEMAND, ...ov });
      const r = runDemand(d, null); expect(`demand мутация репо: ${label}`, r.code, 1, r.out);
    });
    const setProbe = (probe, status) => GREEN_DEMAND_FX.map((r) => (r.probe === probe ? { ...r, status } : r));
    const demandLiveMutations = [
      ["роут accept отсутствует (HTML 404)", setProbe("accept", 404)],
      ["роут skip открыт без сессии", setProbe("skip", 303)],
      ["роут generate открыт без сессии", setProbe("generate", 200)],
      ["GET заказа открыт без сессии", setProbe("order-get", 200)],
      ["старый адрес кнопки отвечает успехом", setProbe("legacy-accept", 200)],
      ["платный /api/orders/<uuid> задет", setProbe("paid-order", 404)],
      ["проба отсутствует в фикстуре", GREEN_DEMAND_FX.filter((r) => r.probe !== "generate")],
      ["фикстура demand.json отсутствует", null],
    ];
    demandLiveMutations.forEach(([label, rows], i) => {
      const d = join(work, `demand-fx-m${i}`); writeDemandFx(d, rows);
      const r = runDemand(repo, d); expect(`demand мутация live: ${label}`, r.code, 1, r.out);
    });
  }

  // ===== R-07: стадия publish =====
  {
    const P = {
      shared: "packages/shared/src/content/publish.ts", index: "packages/shared/src/index.ts", sharedTest: "packages/shared/tests/publish.test.cjs",
      svc: "apps/web/lib/publish-service.ts", route: "apps/web/app/api/publish/route.ts", internal: "apps/web/app/api/internal/publish/route.ts",
      env: ".env.example", bot: "apps/bot/src/handlers/callback.ts", page: "apps/web/app/(dashboard)/content/[id]/page.tsx",
      catalog: "apps/web/app/experts/page.tsx", mig: "packages/supabase/migrations/033_content_slug_unique.sql",
      gen: "apps/worker/src/jobs/generate-content.ts", ops: "OPERATIONS.md",
    };
    const GREEN_PUBLISH = {
      [P.shared]: "export type PublishCode = \"not_found\" | \"already_published\" | \"bad_status\" | \"no_slug\" | \"faq_required\";\nexport function faqProblems(faq) {}\nexport function decidePublish(pkg, expertId) {}\nexport function uniqueSlug(base, taken) {}\n",
      [P.index]: "export * from \"./content/publish.js\";\n",
      [P.sharedTest]: "const {decidePublish, faqProblems, uniqueSlug} = require('../dist/content/publish.js');\n",
      [P.svc]: "export async function publishContent(admin, contentId, expertId) {\n  const q = admin.from(\"content_packages\").select(\"id, profiles!inner(slug, niches!profiles_niche_id_fkey(slug))\");\n  const d = decidePublish(pkg, expertId);\n  await admin.from(\"content_packages\").update(x).eq(\"id\", contentId).eq(\"expert_id\", expertId).in(\"status\", [\"review\", \"approved\"]);\n  await admin.from(\"profiles\").update({ is_published: true }).eq(\"id\", expertId);\n  if (!profErr) { profileVisible = true; }\n  revalidatePath(`/experts/${expertSlug}/${pkg!.slug}`);\n  revalidatePath(`/experts/${expertSlug}`);\n  revalidatePath(\"/sitemap.xml\");\n}\n",
      [P.route]: "if (!user) return NextResponse.json({ error: \"Unauthorized\" }, { status: 401 });\nif (!isSameOriginPost(request)) return NextResponse.json({ error: \"Forbidden\" }, { status: 403 });\nconst result = await publishContent(admin, content_id, user.id);\n",
      [P.internal]: "const token = process.env[\"PUBLISH_INTERNAL_TOKEN\"];\nif (!token) return NextResponse.json({ error: \"x\" }, { status: 503 });\nif (!timingSafeEqual(a, b)) return NextResponse.json({ error: \"Unauthorized\" }, { status: 401 });\nconst { content_id, expert_id } = body;\nconst result = await publishContent(admin, content_id, expert_id);\n",
      [P.env]: "PUBLISH_INTERNAL_TOKEN=\n",
      [P.bot]: "const res = await fetch(new URL(\"/api/internal/publish\", base), { headers: { \"x-internal-token\": token }, body: JSON.stringify({ content_id: contentId, expert_id: profileId }) });\nawait ctx.reply(`${appUrl}/content/${contentId}`);\n",
      [P.page]: "const PUBLISH_ERRORS = {};\nconst faqIssues = faqProblems(faq);\n<div data-faq-warning>{faqIssues}</div>\n<Button disabled={faqIssues.length > 0 || publishing}>Опубликовать</Button>\n",
      [P.catalog]: "select(\"id, slug, niches!profiles_niche_id_fkey(name, icon)\")\n",
      [P.mig]: "CREATE UNIQUE INDEX IF NOT EXISTS content_packages_expert_slug_uniq ON public.content_packages (expert_id, slug) WHERE slug IS NOT NULL;\n",
      [P.gen]: "const slug = uniqueSlug(base, taken);\nfor (let a = 0; a < 3 && cpErr?.code === \"23505\"; a += 1) { retry(); }\n",
      [P.ops]: "- **Порядок выкатки R-07: worker → миграция 033 → токен → web → bot.**\n",
    };
    const GREEN_PUBLISH_FX = { probes: { publish: 401, internal: 401 }, catalog: ["ivan-petrov"], profiles: { "ivan-petrov": 200 }, sitemap: ["ivan-petrov"] };
    const writePubFx = (dir, fx) => { mkdirSync(dir, { recursive: true }); if (fx !== null) writeFileSync(join(dir, "publish.json"), JSON.stringify(fx)); };
    const runPublish = (repo, fx) => run(["--stage=publish", "--repo-root", repo, ...(fx ? ["--fixture-dir", fx] : ["--repo-only"])]);

    const repo = join(work, "publish-green"); writeRepo(repo, GREEN_PUBLISH);
    const fx = join(work, "publish-green-fx"); writePubFx(fx, GREEN_PUBLISH_FX);
    { const r = runPublish(repo, fx); expect("publish: зелёное репо + зелёные пробы -> exit 0", r.code, 0, r.out); }
    { const r = runPublish(repo, null); expect("publish: --repo-only на зелёном репо -> exit 0", r.code, 0, r.out); }
    {
      const bare = join(work, "publish-bare"); mkdirSync(bare, { recursive: true });
      const r = runPublish(bare, null); expect("publish: пустое репо -> exit 1", r.code, 1, r.out);
      const m = /(\d+) finding\(s\)/.exec(r.out); expect("publish: пустое репо даёт ровно 7 групповых находок (forbid-группы молчат)", m ? Number(m[1]) : -1, 7, r.out);
    }
    const G = GREEN_PUBLISH;
    const publishMutations = [
      ["shared: нет кода отказа faq_required", { [P.shared]: G[P.shared].replace("\"faq_required\"", "\"x\"") }],
      ["shared: публикация из любого статуса (нет bad_status)", { [P.shared]: G[P.shared].replace(" | \"bad_status\"", "") }],
      ["shared: решение не экспортировано", { [P.index]: "export {};\n" }],
      ["shared: нет unit-тестов", { [P.sharedTest]: "// todo\n" }],
      ["сервис: UPDATE без владельца", { [P.svc]: G[P.svc].replace(".eq(\"expert_id\", expertId)", "") }],
      ["сервис: UPDATE без фильтра статуса", { [P.svc]: G[P.svc].replace(".in(\"status\", [\"review\", \"approved\"])", "") }],
      ["сервис: профиль не публикуется (E-AUTO-18)", { [P.svc]: G[P.svc].replace(".update({ is_published: true })", ".select()") }],
      ["сервис: сбой публикации профиля замалчивается (profileVisible всегда true)", { [P.svc]: G[P.svc].replace("if (!profErr) { profileVisible = true; }", "") }],
      ["сервис: профиль эксперта не ревалидируется", { [P.svc]: G[P.svc].replace("  revalidatePath(`/experts/${expertSlug}`);\n", "") }],
      ["сервис: sitemap не ревалидируется", { [P.svc]: G[P.svc].replace("revalidatePath(\"/sitemap.xml\")", "noop()") }],
      ["сервис: мёртвый revalidateTag", { [P.svc]: G[P.svc] + "revalidateTag(\"sitemap\");\n" }],
      ["сервис: embed niches без подсказки связи (PGRST201 -> 404)", { [P.svc]: G[P.svc].replace("niches!profiles_niche_id_fkey(slug)", "niches(slug)") }],
      ["каталог: embed niches без подсказки связи (пустой каталог)", { [P.catalog]: "select(\"id, slug, niches(name, icon)\")\n" }],
      ["роут: публикация мимо общего сервиса", { [P.route]: G[P.route].replace("publishContent(", "inlinePublish(") }],
      ["роут: без проверки origin (CSRF)", { [P.route]: G[P.route].replace("if (!isSameOriginPost(request)) return", "if (false) return") }],
      ["роут: нет отказа без сессии", { [P.route]: G[P.route].replace("status: 401", "status: 200") }],
      ["internal: сравнение токена не constant-time", { [P.internal]: G[P.internal].replace("timingSafeEqual(a, b)", "a === b") }],
      ["internal: без токена в env не отказывает (fail-open)", { [P.internal]: G[P.internal].replace("status: 503", "status: 200") }],
      ["internal: токен читается точечной записью", { [P.internal]: G[P.internal].replace("process.env[\"PUBLISH_INTERNAL_TOKEN\"]", "process.env.PUBLISH_INTERNAL_TOKEN") }],
      ["internal: владелец не передаётся", { [P.internal]: G[P.internal].replace(/expert_id/g, "x") }],
      ["internal: роут отсутствует", { [P.internal]: null }],
      [".env.example без PUBLISH_INTERNAL_TOKEN", { [P.env]: "SMTP_HOST=\n" }],
      ["бот: approve пишет status approved напрямую (тупик, без владельца)", { [P.bot]: G[P.bot] + "await supabase.from(\"content_packages\").update({ status: \"approved\" });\n" }],
      ["бот: не передаёт владельца", { [P.bot]: G[P.bot].replace("expert_id: profileId", "x: 1") }],
      ["бот: без токена", { [P.bot]: G[P.bot].replace("\"x-internal-token\"", "\"x\"") }],
      ["бот: «Редактировать» осталась заглушкой", { [P.bot]: G[P.bot].replace("/content/${contentId}", "") + "await ctx.reply(\"Отправьте текстом, что нужно изменить в контенте.\");\n" }],
      ["UI: нет предупреждения FAQ до нажатия", { [P.page]: G[P.page].replace("data-faq-warning", "data-x") }],
      ["UI: кнопка активна при непройденном гейте", { [P.page]: G[P.page].replace("disabled={faqIssues.length > 0", "disabled={false") }],
      ["UI: отказы не переведены", { [P.page]: G[P.page].replace("PUBLISH_ERRORS", "ERR") }],
      ["UI: FAQ снова сырой JSON", { [P.page]: G[P.page] + "setFaqJson(JSON.stringify(data.format_faq ?? [], null, 2));\n" }],
      ["миграция: индекс не уникальный", { [P.mig]: G[P.mig].replace("CREATE UNIQUE INDEX IF NOT EXISTS", "CREATE INDEX IF NOT EXISTS") }],
      ["миграция: индекс падает на slug NULL-дублях (нет WHERE)", { [P.mig]: G[P.mig].replace(" WHERE slug IS NOT NULL", "") }],
      ["worker: гонка slug роняет генерацию (нет повтора при 23505)", { [P.gen]: "const slug = uniqueSlug(base, taken);\n" }],
      ["worker: slug без защиты от коллизии", { [P.gen]: "const slug = slugifyLatin(title);\n" }],
      ["runbook: порядок выкатки не записан", { [P.ops]: "выкатывать как обычно\n" }],
    ];
    publishMutations.forEach(([label, ov], i) => {
      const d = join(work, `publish-m${i}`); writeRepo(d, { ...GREEN_PUBLISH, ...ov });
      const r = runPublish(d, null); expect(`publish мутация репо: ${label}`, r.code, 1, r.out);
    });
    const publishLiveMutations = [
      ["/api/publish открыт без сессии", { ...GREEN_PUBLISH_FX, probes: { publish: 200, internal: 401 } }],
      ["внутреннего роута нет", { ...GREEN_PUBLISH_FX, probes: { publish: 401, internal: 404 } }],
      ["токен не задан в env web (503)", { ...GREEN_PUBLISH_FX, probes: { publish: 401, internal: 503 } }],
      ["каталог пуст", { ...GREEN_PUBLISH_FX, catalog: [] }],
      ["эксперт в каталоге, профиль 404", { ...GREEN_PUBLISH_FX, profiles: { "ivan-petrov": 404 } }],
      ["эксперта нет в sitemap", { ...GREEN_PUBLISH_FX, sitemap: [] }],
      ["пробы отсутствуют в фикстуре", { catalog: ["ivan-petrov"], profiles: { "ivan-petrov": 200 }, sitemap: ["ivan-petrov"] }],
      ["фикстура publish.json отсутствует", null],
    ];
    publishLiveMutations.forEach(([label, fxRows], i) => {
      const d = join(work, `publish-fx-m${i}`); writePubFx(d, fxRows);
      const r = runPublish(repo, d); expect(`publish мутация live: ${label}`, r.code, 1, r.out);
    });
  }

  // ===== R-08: стадия notify =====
  {
    const N = {
      core: "packages/shared/src/notify/expert.ts", index: "packages/shared/src/index.ts", coreTest: "packages/shared/tests/notify-expert.test.cjs",
      link: "packages/shared/src/notify/link-token.ts", pkg: "packages/shared/package.json", linkTest: "packages/shared/tests/link-token.test.cjs",
      job: "apps/worker/src/jobs/notify-expert.ts", svc: "apps/worker/src/services/expert-notify.ts", widx: "apps/worker/src/index.ts",
      validate: "apps/worker/src/jobs/validate-content.ts", crosspost: "apps/worker/src/jobs/crosspost-social.ts",
      publish: "apps/web/lib/publish-service.ts", leads: "apps/web/app/api/leads/route.ts", bookings: "apps/web/app/api/bookings/route.ts",
      route: "apps/web/app/api/telegram/link/route.ts", start: "apps/bot/src/commands/start.ts", botLeads: "apps/bot/src/handlers/leads.ts",
      profile: "apps/web/app/(dashboard)/profile/page.tsx", env: ".env.example", mig: "packages/supabase/migrations/034_expert_notifications.sql", ops: "OPERATIONS.md",
    };
    const ENQ = "await admin.from(\"jobs\").insert({ type: \"notify_expert\", payload: { kind, ref_id, expert_id } });\n";
    const GREEN_NOTIFY = {
      [N.core]: "export type ExpertNotifyKind = \"draft_ready\" | \"published\" | \"lead\" | \"booking\";\nexport function isServiceEmail(e) {}\nexport function planExpertChannels(p) {}\nexport function formatExpertNotification(k, f) {}\nexport function createExpertNotifier(deps) {}\n",
      [N.index]: "export * from \"./notify/expert.js\";\n",
      [N.coreTest]: "const {createExpertNotifier, planExpertChannels, formatExpertNotification} = require('../dist/notify/expert.js');\n",
      [N.link]: "export const LINK_TOKEN_TTL_MS = 15 * 60 * 1000;\nexport function hashLinkNonce(n) {}\nexport function signTelegramLinkToken(p, n, now, s) { return createHmac(\"sha256\", s); }\nexport function verifyTelegramLinkToken(t, s, now) { if (raw.toString(\"base64url\") !== encoded) return bad; return timingSafeEqual(a, b); }\n",
      [N.pkg]: "{\"exports\": {\"./notify/link-token\": {}}}\n",
      [N.linkTest]: "const {signTelegramLinkToken, verifyTelegramLinkToken} = require('../dist/notify/link-token.js');\n",
      [N.job]: "export async function handleNotifyExpert(payload) { if (!data || data.expert_id !== expertId) return null; const notify = createWorkerExpertNotifier(deps); }\n",
      [N.svc]: "return createExpertNotifier({});\nconst mailer = createMailer(env);\nif (!res.ok) throw new Error(\"telegram\");\nawait supabase.from(\"expert_notifications\").insert(row);\n",
      "apps/worker/tests/expert-notify.test.cjs": "const {createWorkerExpertNotifier} = require('../dist/services/expert-notify.js');\n",
      [N.widx]: "const handlers = { notify_expert: handleNotifyExpert };\n",
      [N.validate]: "await supabase.from(\"jobs\").insert({ type: \"notify_expert\", payload });\n",
      [N.crosspost]: "// share-ссылки готовятся здесь, уведомление - job notify_expert\n",
      [N.publish]: "await admin.from(\"jobs\").insert({ type: \"notify_expert\", payload });\n",
      [N.leads]: ENQ, [N.bookings]: ENQ,
      [N.route]: "if (!user) return NextResponse.json({ error: \"Unauthorized\" }, { status: 401 });\nif (!isSameOriginPost(request)) return NextResponse.json({ error: \"Forbidden\" }, { status: 403 });\nconst secret = process.env[\"TELEGRAM_LINK_SECRET\"]; const bot = process.env[\"TELEGRAM_BOT_USERNAME\"];\nconst token = signTelegramLinkToken(user.id, nonce, now, secret);\nawait admin.from(\"profiles\").update({ telegram_link_nonce: hashLinkNonce(nonce) });\nexport async function DELETE(request) {}\n",
      [N.start]: "const secret = process.env[\"TELEGRAM_LINK_SECRET\"];\nconst v = verifyTelegramLinkToken(token, secret, Date.now());\nawait supabase.from(\"profiles\").update(x).eq(\"id\", v.profileId).eq(\"telegram_link_nonce\", hashLinkNonce(v.nonce)).gt(\"telegram_link_expires_at\", now);\n",
      [N.botLeads]: "await supabase.from(\"leads\").update(x).eq(\"id\", leadId).eq(\"expert_id\", profileId);\n",
      [N.profile]: "<button>Подключить Telegram</button> fetch(\"/api/telegram/link\")\n",
      [N.env]: "TELEGRAM_LINK_SECRET=\nTELEGRAM_BOT_USERNAME=\n",
      [N.mig]: "CREATE TABLE IF NOT EXISTS public.expert_notifications (id uuid, UNIQUE (expert_id, kind, ref_id));\nALTER TABLE public.expert_notifications ENABLE ROW LEVEL SECURITY;\nALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_link_nonce text;\n'notify_expert'\nSELECT cron.schedule('weekly-email-digest', '0 7 * * 1', $$ AND NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.type = 'send_email_digest' AND j.payload->>'content_id' = cp.id::text)$$);\n",
      [N.ops]: "- **Порядок выкатки R-08: миграция 034 → worker → секрет → bot → web.**\n",
    };
    const writeNotifyFx = (dir, rows) => { mkdirSync(dir, { recursive: true }); if (rows !== null) writeFileSync(join(dir, "notify.json"), JSON.stringify(rows)); };
    const runNotify = (repo, fx) => run(["--stage=notify", "--repo-root", repo, ...(fx ? ["--fixture-dir", fx] : ["--repo-only"])]);
    const repo = join(work, "notify-green"); writeRepo(repo, GREEN_NOTIFY);
    const fx = join(work, "notify-green-fx"); writeNotifyFx(fx, { POST: 401, DELETE: 401 });
    { const r = runNotify(repo, fx); expect("notify: зелёное репо + зелёные пробы -> exit 0", r.code, 0, r.out); }
    { const r = runNotify(repo, null); expect("notify: --repo-only на зелёном репо -> exit 0", r.code, 0, r.out); }
    {
      const bare = join(work, "notify-bare"); mkdirSync(bare, { recursive: true });
      const r = runNotify(bare, null); expect("notify: пустое репо -> exit 1", r.code, 1, r.out);
      const m = /(\d+) finding\(s\)/.exec(r.out); expect("notify: пустое репо даёт ровно 7 групповых находок (forbid-группы молчат)", m ? Number(m[1]) : -1, 7, r.out);
    }
    const G = GREEN_NOTIFY;
    const notifyMutations = [
      ["ядро: нет события «заявка»", { [N.core]: G[N.core].replace(" | \"lead\"", "") }],
      ["ядро: нет выбора каналов (e-mail всегда)", { [N.core]: G[N.core].replace("export function planExpertChannels(", "function channels(") }],
      ["ядро: служебные адреса tg_ не отсекаются", { [N.core]: G[N.core].replace("export function isServiceEmail(", "function x(") }],
      ["ядро не экспортировано", { [N.index]: "export {};\n" }],
      ["нет unit-тестов ядра", { [N.coreTest]: "// todo\n" }],
      ["токен: подпись не HMAC-SHA256", { [N.link]: G[N.link].replace("createHmac(\"sha256\"", "createHash(\"md5\"") }],
      ["токен: сравнение подписи не constant-time", { [N.link]: G[N.link].replace("timingSafeEqual(a, b)", "a === b") }],
      ["токен: неканоническая запись base64url принимается", { [N.link]: G[N.link].replace("if (raw.toString(\"base64url\") !== encoded) return bad; ", "") }],
      ["токен: срок жизни не 15 минут", { [N.link]: G[N.link].replace("15 * 60 * 1000", "24 * 60 * 60 * 1000") }],
      ["токен: нет subpath-экспорта", { [N.pkg]: "{}\n" }],
      ["worker: адаптер мимо общего ядра", { [N.svc]: G[N.svc].replace("createExpertNotifier(", "ownNotifier(") }],
      ["worker: поля сообщения не сверяются с экспертом (чужая заявка уйдёт не тому)", { [N.job]: G[N.job].replace(" || data.expert_id !== expertId", "") }],
      ["worker: нет теста адаптера", { "apps/worker/tests/expert-notify.test.cjs": "// todo\n" }],
      ["worker: отправка без проверки ответа Telegram", { [N.svc]: G[N.svc].replace("if (!res.ok)", "if (false)") }],
      ["worker: нет e-mail канала", { [N.svc]: G[N.svc].replace("createMailer(", "noMail(") }],
      ["worker: нет дедупа", { [N.svc]: G[N.svc].replace("expert_notifications", "x") }],
      ["worker: job не зарегистрирован", { [N.widx]: "const handlers = {};\n" }],
      ["worker: черновик уведомляет напрямую", { [N.validate]: G[N.validate] + "tgFetch(`https://api.telegram.org/bot${t}/sendMessage`);\n" }],
      ["worker: второе сообщение о публикации", { [N.crosspost]: "body: JSON.stringify({ chat_id: expert.telegram_id, text })\n" }],
      ["web: публикация уведомляет напрямую", { [N.publish]: "await sendSharingNotification(id, title, url);\n" }],
      ["web: publish-notify.ts не удалён", { "apps/web/lib/publish-notify.ts": "export async function sendSharingNotification() {}\n" }],
      ["web: заявка шлёт Telegram напрямую", { [N.leads]: ENQ + "await tgFetch(`https://api.telegram.org/bot${t}/sendMessage`);\n" }],
      ["web: запись не ставит job", { [N.bookings]: "// нет уведомления\n" }],
      ["привязка: роут без сессии", { [N.route]: G[N.route].replace("status: 401", "status: 200") }],
      ["привязка: без проверки origin", { [N.route]: G[N.route].replace("if (!isSameOriginPost(request)) return", "if (false) return") }],
      ["привязка: без одноразового номера", { [N.route]: G[N.route].replace("telegram_link_nonce", "x") }],
      ["привязка: номер хранится открыто (виден anon у опубликованных профилей)", { [N.route]: G[N.route].replace("telegram_link_nonce: hashLinkNonce(nonce)", "telegram_link_nonce: nonce") }],
      ["бот: сравнивает открытый номер", { [N.start]: G[N.start].replace("hashLinkNonce(v.nonce)", "v.nonce") }],
      ["привязка: секрет точечной записью", { [N.route]: G[N.route].replace("process.env[\"TELEGRAM_LINK_SECRET\"]", "process.env.TELEGRAM_LINK_SECRET") }],
      ["привязка: нельзя отключить", { [N.route]: G[N.route].replace("export async function DELETE(", "async function del(") }],
      ["бот: номер привязки не гасится", { [N.start]: G[N.start].replace(".eq(\"telegram_link_nonce\", ", ".eq(\"x\", ") }],
      ["бот: /start снова создаёт аккаунт", { [N.start]: G[N.start] + "await supabase.auth.admin.createUser({ email });\n" }],
      ["бот: токен = сырой id профиля", { [N.start]: G[N.start] + "await supabase.from(\"profiles\").update(x).eq(\"id\", token);\n" }],
      ["бот: кнопки заявки без владельца", { [N.botLeads]: "await supabase.from(\"leads\").update(x).eq(\"id\", leadId);\n" }],
      ["профиль: нет кнопки подключения", { [N.profile]: "Напишите боту /start\n" }],
      [".env.example без секрета привязки", { [N.env]: "TELEGRAM_BOT_USERNAME=\n" }],
      ["миграция: дедуп без уникальности", { [N.mig]: G[N.mig].replace("UNIQUE (expert_id, kind, ref_id)", "") }],
      ["миграция: таблица без RLS", { [N.mig]: G[N.mig].replace("ENABLE ROW LEVEL SECURITY", "") }],
      ["миграция: notify_expert не в CHECK", { [N.mig]: G[N.mig].replace("'notify_expert'", "") }],
      ["миграция: повтор cron дайджеста шлёт статью второй раз", { [N.mig]: G[N.mig].replace(" AND NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.type = 'send_email_digest' AND j.payload->>'content_id' = cp.id::text)", "") }],
      ["бот: срок ссылки не сверяется с профилем", { [N.start]: G[N.start].replace(".gt(\"telegram_link_expires_at\", now)", "") }],
      ["миграция: нет cron дайджеста", { [N.mig]: G[N.mig].replace("cron.schedule('weekly-email-digest'", "") }],
      ["runbook: порядок выкатки не записан", { [N.ops]: "выкатывать как обычно\n" }],
    ];
    notifyMutations.forEach(([label, ov], i) => {
      const d = join(work, `notify-m${i}`); writeRepo(d, { ...GREEN_NOTIFY, ...ov });
      const r = runNotify(d, null); expect(`notify мутация репо: ${label}`, r.code, 1, r.out);
    });
    const notifyLiveMutations = [
      ["POST привязки без сессии не 401", { POST: 200, DELETE: 401 }],
      ["роута привязки нет", { POST: 404, DELETE: 404 }],
      ["DELETE привязки открыт", { POST: 401, DELETE: 200 }],
      ["фикстура notify.json отсутствует", null],
    ];
    notifyLiveMutations.forEach(([label, rows], i) => {
      const d = join(work, `notify-fx-m${i}`); writeNotifyFx(d, rows);
      const r = runNotify(repo, d); expect(`notify мутация live: ${label}`, r.code, 1, r.out);
    });
  }

  // ===== R-09: стадия billing =====
  {
    const B = {
      limits: "packages/shared/src/billing/limits.ts", index: "packages/shared/src/index.ts", test: "packages/shared/tests/billing-limits.test.cjs",
      webSub: "apps/web/lib/subscription.ts", gen: "apps/worker/src/jobs/generate-content.ts", ordersLib: "apps/web/lib/expert-orders.ts",
      ordersPage: "apps/web/app/(dashboard)/orders/page.tsx", voice: "apps/web/app/api/voice/route.ts", webhook: "apps/web/app/api/webhooks/yukassa/route.ts",
      billing: "apps/web/app/(dashboard)/billing/page.tsx", analytics: "apps/web/app/(dashboard)/analytics/page.tsx",
      botCb: "apps/bot/src/handlers/callback.ts", botVoice: "apps/bot/src/handlers/voice.ts", botKeys: "apps/bot/src/keyboards.ts",
      mig: "packages/supabase/migrations/035_billing_and_analytics.sql", ops: "OPERATIONS.md",
    };
    const GREEN_BILLING = {
      [B.limits]: "import { SUBSCRIPTION_TIERS } from \"../constants.js\";\nexport function findTier(t) { return Object.hasOwn(SUBSCRIPTION_TIERS, t) ? SUBSCRIPTION_TIERS[t] : undefined; }\nexport function monthStartUtc(now) {}\nexport function nextSubscriptionExpiry(now, cur) {}\nexport function checkPackageLimit(tier, used) {}\nexport function getAllowedFormats(tier) {}\nexport function checkNicheLimit(tier, n) {}\nexport function checkSubscriptionAmount(tier, amount, currency) { if (currency !== \"RUB\") return bad; }\nexport async function packageAllowance(db, tier, expertId, now) { return db.from(\"expert_package_ledger\").select(\"id\").eq(\"expert_id\", expertId).gte(\"created_at\", monthStartUtc(now)); }\n",
      [B.index]: "export * from \"./billing/limits.js\";\n",
      [B.test]: "const {checkPackageLimit, getAllowedFormats, checkNicheLimit, checkSubscriptionAmount, packageAllowance} = require('../dist/billing/limits.js');\n",
      [B.webSub]: "import { SUBSCRIPTION_TIERS } from \"shared\";\nexport const TIER_CONFIG = Object.fromEntries(Object.values(SUBSCRIPTION_TIERS).map((t) => [t.id, { name: t.name, price: t.price }]));\n",
      [B.gen]: "const { data: expert } = await supabase.from(\"profiles\").select(\"full_name, subscription_tier\");\nconst allowance = await packageAllowance(supabase, expert.subscription_tier, expertId);\nif (!allowance.allowed) return { content_package_id: null, skipped: \"package_limit\" };\nconst allowed = new Set(getAllowedFormats(expert.subscription_tier));\nconst cards = allowed.has(\"cards\") ? await callLLMJson(buildCardsPrompt(params)) : [];\nconst reelsScript = allowed.has(\"reels_script\") ? await callLLM(buildReelsScriptPrompt(params)) : \"\";\n",
      [B.ordersLib]: "if (action === \"accept\") { const a = await packageAllowance(admin, tier, user.id); if (!a.allowed) return backToOrders(request, \"package_limit\"); }\n",
      [B.ordersPage]: "const NOTICES = { package_limit: { tone: \"warn\", text: \"Лимит пакетов в этом месяце исчерпан.\", href: \"/billing\" } };\n",
      [B.voice]: "const a = await packageAllowance(admin, profile.subscription_tier, profile.id);\nif (!a.allowed) return NextResponse.json({ error: \"x\", code: \"package_limit\" }, { status: 402 });\n",
      [B.webhook]: "if (priorErr) { return NextResponse.json({ error: \"x\" }, { status: 503 }); }\nif (priorPayment?.status === \"refunded\") { return NextResponse.json({ ok: true }); }\nconst { error: markErr } = await admin.from(\"payments\").update({ metadata: { tier_applied_at: appliedAt } });\nconst alreadyApplied = priorPayment?.status === \"succeeded\" && typeof priorMeta.tier_applied_at === \"string\";\nconst amountCheck = checkSubscriptionAmount(verifiedMetadata.tier, amountRub, verified.amount.currency);\nif (paymentType === \"subscription\" && !alreadyApplied && amountCheck.ok) { const expiresAt = nextSubscriptionExpiry(new Date(), current?.subscription_expires_at); await admin.from(\"profiles\").update({ subscription_tier: amountCheck.tier.id, subscription_expires_at: expiresAt }); }\nif (event === \"refund.succeeded\" && legacy?.type === \"subscription\") { await admin.from(\"profiles\").update({ subscription_tier: \"free\" }); }\n",
      [B.billing]: "<p>Подписка не продлевается автоматически: после {date} тариф станет бесплатным.</p>\n",
      [B.analytics]: "const { data: profile } = await supabase.from(\"profiles\").select(\"trust_score, subscription_tier\").eq(\"id\", user.id).single();\n",
      [B.botCb]: "const a = await packageAllowance(supabase, tier, profileId); if (!a.allowed) { await ctx.reply(`Лимит. ${appUrl()}/billing`); return; }\nnicheKeyboard(selectedIds, maxNiches)\notherNichesKeyboard(selectedIds, maxNiches)\n",
      [B.botVoice]: "const a = await packageAllowance(supabase, profile.subscription_tier, profile.id); if (!a.allowed) { await ctx.reply(`Лимит. ${appUrl()}/billing`); return; }\n",
      [B.botKeys]: "export function nicheKeyboard(selectedIds = [], maxNiches: number = 1) {}\n",
      [B.mig]: [
        "DO $$ BEGIN IF current_setting('cron.database_name', true) IS DISTINCT FROM current_database() THEN RAISE EXCEPTION 'x'; END IF; END $$;",
        "SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('weekly-citations','weekly-serp','monthly-trust','daily-subscription-expiry');",
        "SELECT cron.schedule('weekly-citations', '0 4 * * 3', $$INSERT INTO public.jobs (type, payload) SELECT 'track_citations', jsonb_build_object('expert_id', p.id) FROM public.profiles p WHERE p.is_published = TRUE AND NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.type = 'track_citations' AND j.status IN ('pending', 'processing') AND j.payload->>'expert_id' = p.id::text)$$);",
        "SELECT cron.schedule('weekly-serp', '0 5 * * 4', $$INSERT INTO public.jobs (type, payload) SELECT 'track_serp', jsonb_build_object('expert_id', id) FROM public.profiles WHERE is_published = TRUE$$);",
        "SELECT cron.schedule('monthly-trust', '0 2 1 * *', $$INSERT INTO public.jobs (type, payload) SELECT 'calculate_trust_score', jsonb_build_object('expert_id', id) FROM public.profiles WHERE is_published = TRUE$$);",
        "SELECT cron.schedule('daily-subscription-expiry', '15 0 * * *', $$UPDATE public.profiles SET subscription_tier = 'free', updated_at = now() WHERE subscription_tier <> 'free' AND subscription_expires_at IS NOT NULL AND subscription_expires_at < now()$$);",
        "INSERT INTO public.expert_niches (expert_id, niche_id) SELECT p.id, p.niche_id FROM public.profiles p WHERE p.niche_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.expert_niches e WHERE e.expert_id = p.id) ON CONFLICT DO NOTHING;",
        "CREATE OR REPLACE FUNCTION public.sync_expert_niche_from_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF NEW.niche_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.expert_niches e WHERE e.expert_id = NEW.id) THEN INSERT INTO public.expert_niches (expert_id, niche_id) VALUES (NEW.id, NEW.niche_id) ON CONFLICT DO NOTHING; END IF; RETURN NEW; END $$;",
        "CREATE TRIGGER profiles_sync_expert_niche AFTER INSERT OR UPDATE OF niche_id ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_expert_niche_from_profile();",
        "DO $$ BEGIN IF current_user NOT IN ('postgres', 'supabase_admin') THEN RAISE EXCEPTION 'apply as postgres'; END IF; END $$;",
        "DROP POLICY IF EXISTS \"Users can update own profile\" ON public.profiles;",
        "CREATE POLICY \"Users can update own profile\" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);",
        "CREATE OR REPLACE FUNCTION public.protect_billing_columns() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') AND (NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at OR NEW.trust_score IS DISTINCT FROM OLD.trust_score OR NEW.is_published IS DISTINCT FROM OLD.is_published) THEN RAISE EXCEPTION 'read-only' USING ERRCODE = '42501'; END IF; RETURN NEW; END $$;",
        "CREATE TRIGGER profiles_protect_billing BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_billing_columns();",
        "CREATE TABLE IF NOT EXISTS public.expert_package_ledger (package_id uuid PRIMARY KEY, expert_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());",
        "ALTER TABLE public.expert_package_ledger ENABLE ROW LEVEL SECURITY;",
        "REVOKE ALL ON TABLE public.expert_package_ledger FROM PUBLIC, anon, authenticated;",
        "CREATE OR REPLACE FUNCTION public.record_package_in_ledger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO public.expert_package_ledger (package_id, expert_id, created_at) VALUES (NEW.id, NEW.expert_id, now()) ON CONFLICT DO NOTHING; RETURN NEW; END $$;",
        "REVOKE ALL ON FUNCTION public.record_package_in_ledger() FROM PUBLIC, anon, authenticated;",
        "CREATE TRIGGER content_packages_ledger AFTER INSERT ON public.content_packages FOR EACH ROW EXECUTE FUNCTION public.record_package_in_ledger();",
        "INSERT INTO public.expert_package_ledger (package_id, expert_id, created_at) SELECT id, expert_id, created_at FROM public.content_packages ON CONFLICT DO NOTHING;",
        "ALTER TABLE public.expert_niches ENABLE ROW LEVEL SECURITY;",
        "CREATE POLICY \"Expert can view own niches\" ON public.expert_niches FOR SELECT USING (auth.uid() = expert_id);",
      ].join("\n") + "\n",
      [B.ops]: "- **Порядок выкатки R-09: миграция 035 → worker → bot → web.**\n",
    };
    const GREEN_BILLING_FX = { subscribe: 401, jobs: Object.fromEntries(["weekly-citations", "weekly-serp", "monthly-trust", "daily-subscription-expiry"].map((n) => [n, { active: true, last_status: null }])) };
    const writeBillingFx = (dir, fx) => { mkdirSync(dir, { recursive: true }); if (fx !== null) writeFileSync(join(dir, "billing.json"), JSON.stringify(fx)); };
    const runBilling = (repo, fx) => run(["--stage=billing", "--repo-root", repo, ...(fx ? ["--fixture-dir", fx] : ["--repo-only"])]);
    const repo = join(work, "billing-green"); writeRepo(repo, GREEN_BILLING);
    const fx = join(work, "billing-green-fx"); writeBillingFx(fx, GREEN_BILLING_FX);
    { const r = runBilling(repo, fx); expect("billing: зелёное репо + зелёные пробы -> exit 0", r.code, 0, r.out); }
    { const r = runBilling(repo, null); expect("billing: --repo-only на зелёном репо -> exit 0", r.code, 0, r.out); }
    {
      const bare = join(work, "billing-bare"); mkdirSync(bare, { recursive: true });
      const r = runBilling(bare, null); expect("billing: пустое репо -> exit 1", r.code, 1, r.out);
      const m = /(\d+) finding\(s\)/.exec(r.out); expect("billing: пустое репо даёт ровно 8 групповых находок (forbid-группы молчат)", m ? Number(m[1]) : -1, 8, r.out);
    }
    const G = GREEN_BILLING;
    const billingMutations = [
      ["shared: нет лимита пакетов", { [B.limits]: G[B.limits].replace("export function checkPackageLimit(", "function limit(") }],
      ["shared: нет форматов по тарифу", { [B.limits]: G[B.limits].replace("export function getAllowedFormats(", "function f(") }],
      ["shared: нет сверки суммы подписки", { [B.limits]: G[B.limits].replace("export function checkSubscriptionAmount(", "function s(") }],
      ["shared: своя таблица тарифов вместо SUBSCRIPTION_TIERS", { [B.limits]: G[B.limits].replace(/SUBSCRIPTION_TIERS/g, "TIERS") }],
      ["shared: тариф по прототипному ключу (нет Object.hasOwn)", { [B.limits]: G[B.limits].replace("Object.hasOwn(SUBSCRIPTION_TIERS, t) ? SUBSCRIPTION_TIERS[t] : undefined", "SUBSCRIPTION_TIERS[t]") }],
      ["shared: сумма с округлением копеек", { [B.limits]: G[B.limits] + "const same = Math.round(amountRub) === found.price;\n" }],
      ["shared: валюта не проверяется", { [B.limits]: G[B.limits].replace("export function checkSubscriptionAmount(tier, amount, currency) { if (currency !== \"RUB\") return bad; }", "export function checkSubscriptionAmount(tier, amount) {}") }],
      ["shared: нет расчёта срока без потери остатка", { [B.limits]: G[B.limits].replace("export function nextSubscriptionExpiry(", "function expiry(") }],
      ["shared: счётчик исключает статус failed (владелец меняет status по RLS 002)", { [B.limits]: G[B.limits].replace(".gte(\"created_at\", monthStartUtc(now))", ".gte(\"created_at\", monthStartUtc(now)).neq(\"status\", \"failed\")") }],
      ["shared: счётчик по content_packages (владелец удаляет свои пакеты - счётчик обнуляется)", { [B.limits]: G[B.limits].replace("db.from(\"expert_package_ledger\")", "db.from(\"content_packages\")") }],
      ["миграция: нет леджера пакетов", { [B.mig]: G[B.mig].replace("CREATE TABLE IF NOT EXISTS public.expert_package_ledger", "CREATE TABLE IF NOT EXISTS public.x") }],
      ["миграция: леджер читают anon/authenticated (нет REVOKE)", { [B.mig]: G[B.mig].replace("REVOKE ALL ON TABLE public.expert_package_ledger FROM PUBLIC, anon, authenticated;\n", "") }],
      ["миграция: леджер без RLS", { [B.mig]: G[B.mig].replace("ALTER TABLE public.expert_package_ledger ENABLE ROW LEVEL SECURITY;\n", "") }],
      ["миграция: нет триггера леджера на вставку пакета", { [B.mig]: G[B.mig].replace("CREATE TRIGGER content_packages_ledger AFTER INSERT ON public.content_packages", "CREATE TRIGGER y BEFORE UPDATE ON public.content_packages") }],
      ["миграция: леджер без backfill (текущий месяц не считается)", { [B.mig]: G[B.mig].replace("SELECT id, expert_id, created_at FROM public.content_packages", "SELECT 1 WHERE false") }],
      ["миграция: леджер берёт created_at из клиентской строки (вставка задним числом обходит лимит)", { [B.mig]: G[B.mig].replace("VALUES (NEW.id, NEW.expert_id, now())", "VALUES (NEW.id, NEW.expert_id, NEW.created_at)") }],
      ["миграция: функция леджера без SECURITY DEFINER", { [B.mig]: G[B.mig].replace("record_package_in_ledger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS", "record_package_in_ledger() RETURNS trigger LANGUAGE plpgsql AS") }],
      ["миграция: нет REVOKE на функции леджера", { [B.mig]: G[B.mig].replace("REVOKE ALL ON FUNCTION public.record_package_in_ledger() FROM PUBLIC, anon, authenticated;\n", "") }],
      ["миграция: функции защиты биллинга нет вовсе (проверка DEFINER была бы вакуумной)", { [B.mig]: G[B.mig].replace("CREATE OR REPLACE FUNCTION public.protect_billing_columns()", "CREATE OR REPLACE FUNCTION public.x()") }],
      ["webhook: повтор payment.succeeded после возврата снова выдаёт тариф", { [B.webhook]: G[B.webhook].replace("if (priorPayment?.status === \"refunded\") { return NextResponse.json({ ok: true }); }\n", "") }],
      ["webhook: ошибка чтения платежа игнорируется (fail-open)", { [B.webhook]: G[B.webhook].replace("if (priorErr) { return NextResponse.json({ error: \"x\" }, { status: 503 }); }\n", "") }],
      ["webhook: ошибка записи маркера не проверяется", { [B.webhook]: G[B.webhook].replace("const { error: markErr } = await", "await") }],
      ["миграция: защита не проверяет is_published (самопубликация -> аналитика за счёт владельца)", { [B.mig]: G[B.mig].replace(" OR NEW.is_published IS DISTINCT FROM OLD.is_published", "") }],
      ["миграция: защита биллинга объявлена SECURITY DEFINER (проверка роли пуста)", { [B.mig]: G[B.mig].replace("public.protect_billing_columns() RETURNS trigger LANGUAGE plpgsql AS", "public.protect_billing_columns() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS") }],
      ["миграция: нет guard роли применения (cron от чужой роли молча упадёт на триггере)", { [B.mig]: G[B.mig].replace("IF current_user NOT IN ('postgres', 'supabase_admin') THEN", "IF false THEN") }],
      ["миграция: expert_niches без RLS (любой меняет ниши любого эксперта)", { [B.mig]: G[B.mig].replace("ALTER TABLE public.expert_niches ENABLE ROW LEVEL SECURITY;\n", "") }],
      ["миграция: expert_niches - владелец не видит свои ниши", { [B.mig]: G[B.mig].replace("ON public.expert_niches FOR SELECT USING (auth.uid() = expert_id)", "ON public.expert_niches FOR SELECT USING (true)") }],
      ["webhook: повтор payment.succeeded продлевает тариф снова", { [B.webhook]: G[B.webhook].replace("const alreadyApplied = priorPayment?.status === \"succeeded\" && typeof priorMeta.tier_applied_at === \"string\";\n", "").replace("!alreadyApplied && ", "") }],
      ["webhook: признак применения - статус платежа, а не факт записи профиля (сбой профиля теряет тариф)", { [B.webhook]: G[B.webhook].replace(" && typeof priorMeta.tier_applied_at === \"string\"", "") }],
      ["миграция: защита не проверяет срок подписки", { [B.mig]: G[B.mig].replace(" OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at", "") }],
      ["webhook: срок setMonth от now (остаток теряется, 31-е переполняется)", { [B.webhook]: G[B.webhook].replace("nextSubscriptionExpiry(new Date(), current?.subscription_expires_at)", "new Date(Date.now() + 2592000000)") }],
      ["webhook: возврат не отзывает тариф", { [B.webhook]: G[B.webhook].replace("if (event === \"refund.succeeded\" && legacy?.type === \"subscription\") { await admin.from(\"profiles\").update({ subscription_tier: \"free\" }); }\n", "") }],
      ["миграция: политика профиля без WITH CHECK", { [B.mig]: G[B.mig].replace(" WITH CHECK (auth.uid() = id)", "") }],
      ["миграция: нет защиты колонок тарифа (пользователь сам ставит enterprise)", { [B.mig]: G[B.mig].replace("CREATE TRIGGER profiles_protect_billing", "CREATE TRIGGER x") }],
      ["миграция: защита не проверяет subscription_tier", { [B.mig]: G[B.mig].replace("NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier OR ", "") }],
      ["миграция: защита пропускает всех (нет проверки роли)", { [B.mig]: G[B.mig].replace(/current_user NOT IN \('postgres', 'service_role', 'supabase_admin'\)/g, "false") }],
      ["миграция: нет guard очереди у расписаний аналитики", { [B.mig]: G[B.mig].replace(" AND NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.type = 'track_citations' AND j.status IN ('pending', 'processing') AND j.payload->>'expert_id' = p.id::text)", "") }],
      ["миграция: триггер ниши дописывает вторую нишу (лимит free 1)", { [B.mig]: G[B.mig].replace("IF NEW.niche_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.expert_niches e WHERE e.expert_id = NEW.id) THEN", "IF NEW.niche_id IS NOT NULL THEN") }],
      ["shared: модуль не экспортирован", { [B.index]: "export {};\n" }],
      ["shared: нет unit-тестов", { [B.test]: "// todo\n" }],
      ["web: вторая таблица цен (E-AUTO-14, копия расходится)", { [B.webSub]: "export const TIER_CONFIG = { free: { price: 0, packagesPerMonth: 3, maxNiches: 1 }, starter: { price: 1490 } };\n" }],
      ["web: accept без лимита пакетов", { [B.ordersLib]: "if (action === \"accept\") { /* без лимита */ }\n" }],
      ["web: отказ по лимиту без подписи на дашборде", { [B.ordersPage]: "const NOTICES = { conflict: { tone: \"warn\", text: \"x\" } };\n" }],
      ["web: подпись без ссылки на тарифы", { [B.ordersPage]: G[B.ordersPage].replace("/billing", "/orders") }],
      ["web: запись голоса без лимита", { [B.voice]: "// без лимита\n" }],
      ["web: отказ голоса без кода и 402", { [B.voice]: G[B.voice].replace("code: \"package_limit\" }, { status: 402 }", "}, { status: 500 }") }],
      ["worker: генерирует все 5 форматов всем", { [B.gen]: G[B.gen].replace("const allowed = new Set(getAllowedFormats(expert.subscription_tier));\n", "").replace("allowed.has(\"cards\") ? ", "").replace("allowed.has(\"reels_script\") ? ", "") }],
      ["worker: reels генерируется вне тарифа", { [B.gen]: G[B.gen].replace("allowed.has(\"reels_script\") ? ", "") }],
      ["worker: нет страховки лимита", { [B.gen]: G[B.gen].replace("const allowance = await packageAllowance(supabase, expert.subscription_tier, expertId);\n", "") }],
      ["worker: превышение роняет job (повторы)", { [B.gen]: G[B.gen].replace("return { content_package_id: null, skipped: \"package_limit\" }", "throw new Error(\"limit\")") }],
      ["worker: тариф не читается", { [B.gen]: G[B.gen].replace(/subscription_tier/g, "tier") }],
      ["бот: принять тему без лимита", { [B.botCb]: "nicheKeyboard(selectedIds, maxNiches)\notherNichesKeyboard(selectedIds, maxNiches)\n" }],
      ["бот: голосовое без лимита", { [B.botVoice]: "// без лимита\n" }],
      ["бот: отказ без ссылки на тарифы", { [B.botVoice]: G[B.botVoice].replace("/billing", "/orders") }],
      ["бот: клавиатура ниш с жёстким лимитом 3", { [B.botKeys]: "const MAX_NICHES = 3;\nexport function nicheKeyboard(selectedIds = [], maxNiches: number = 1) {}\n" }],
      ["бот: клавиатура не принимает лимит тарифа", { [B.botKeys]: "export function nicheKeyboard(selectedIds = []) {}\n" }],
      ["бот: колбэки не передают лимит в клавиатуру", { [B.botCb]: G[B.botCb].replace("nicheKeyboard(selectedIds, maxNiches)", "nicheKeyboard(selectedIds)") }],
      ["webhook: тариф выдаётся без сверки суммы (E-AUTO-15)", { [B.webhook]: "if (paymentType === \"subscription\" && verifiedMetadata.tier) { await admin.from(\"profiles\").update({ subscription_tier: verifiedMetadata.tier }); }\n" }],
      ["webhook: сверка есть, но результат не используется", { [B.webhook]: G[B.webhook].replace("&& amountCheck.ok", "") }],
      ["биллинг: «Отменить подписку» ведёт в /api/subscribe с free", { [B.billing]: G[B.billing] + "<Button onClick={() => subscribe(\"free\")}>Отменить подписку</Button>\n" }],
      ["биллинг: нет честного текста о сроке", { [B.billing]: "<p>Подписка активна.</p>\n" }],
      ["миграция: нет sweep срока подписки (платный тариф навсегда)", { [B.mig]: G[B.mig].replace("SELECT cron.schedule('daily-subscription-expiry'", "SELECT cron.schedule('daily-x'") }],
      ["миграция: sweep не сравнивает срок", { [B.mig]: G[B.mig].replace("subscription_expires_at < now()", "subscription_expires_at IS NULL") }],
      ["миграция: sweep не возвращает free", { [B.mig]: G[B.mig].replace("SET subscription_tier = 'free'", "SET subscription_tier = 'starter'") }],
      ["миграция: нет weekly-citations (E-AUTO-11, на проде никогда не было)", { [B.mig]: G[B.mig].replace("cron.schedule('weekly-citations'", "cron.schedule('weekly-cit'") }],
      ["миграция: нет weekly-serp", { [B.mig]: G[B.mig].replace("cron.schedule('weekly-serp'", "cron.schedule('weekly-x'") }],
      ["миграция: нет monthly-trust (trust score всегда 0)", { [B.mig]: G[B.mig].replace("cron.schedule('monthly-trust'", "cron.schedule('monthly-x'") }],
      ["миграция: аналитика снова только платным", { [B.mig]: G[B.mig].replace("FROM public.profiles p WHERE p.is_published = TRUE AND NOT EXISTS", "FROM public.profiles p WHERE p.subscription_tier NOT IN ('free') AND p.is_published = TRUE AND NOT EXISTS") }],
      ["миграция: serp только expert+", { [B.mig]: G[B.mig].replace("'track_serp', jsonb_build_object('expert_id', id) FROM public.profiles WHERE is_published = TRUE", "'track_serp', jsonb_build_object('expert_id', id) FROM public.profiles WHERE subscription_tier IN ('expert','business','enterprise') AND is_published = TRUE") }],
      ["миграция: расписания не идемпотентны", { [B.mig]: G[B.mig].replace("SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN (", "SELECT 1 WHERE false AND (") }],
      ["миграция: нет guard cron.database_name", { [B.mig]: G[B.mig].replace("current_setting('cron.database_name', true)", "current_setting('cron.db', true)") }],
      ["миграция: ниши с сайта не дописываются (тем не будет никогда)", { [B.mig]: G[B.mig].replace("SELECT p.id, p.niche_id FROM public.profiles p", "SELECT 1 WHERE false") }],
      ["миграция: backfill падает на дублях (нет ON CONFLICT)", { [B.mig]: G[B.mig].replace(/ ON CONFLICT DO NOTHING/g, "") }],
      ["миграция: нет триггера синхронизации ниши", { [B.mig]: G[B.mig].replace("CREATE TRIGGER profiles_sync_expert_niche", "CREATE TRIGGER x") }],
      ["миграция: триггер не на смену niche_id", { [B.mig]: G[B.mig].replace("AFTER INSERT OR UPDATE OF niche_id ON public.profiles", "AFTER INSERT ON public.profiles") }],
      ["миграция: функция триггера ниш без SECURITY DEFINER (RLS пользователя)", { [B.mig]: G[B.mig].replace("sync_expert_niche_from_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS", "sync_expert_niche_from_profile() RETURNS trigger LANGUAGE plpgsql AS") }],
      ["аналитика: читает несуществующую колонку tier", { [B.analytics]: G[B.analytics].replace("trust_score, subscription_tier", "trust_score, tier") }],
      ["runbook: порядок выкатки не записан", { [B.ops]: "выкатывать как обычно\n" }],
      ["runbook: web раньше worker", { [B.ops]: "- **Порядок выкатки R-09: web → миграция 035 → worker → bot.**\n" }],
    ];
    billingMutations.forEach(([label, ov], i) => {
      const d = join(work, `billing-m${i}`); writeRepo(d, { ...GREEN_BILLING, ...ov });
      const r = runBilling(d, null); expect(`billing мутация репо: ${label}`, r.code, 1, r.out);
    });
    const FXJ = GREEN_BILLING_FX.jobs;
    const billingLiveMutations = [
      ["/api/subscribe открыт без сессии", { ...GREEN_BILLING_FX, subscribe: 200 }],
      ["weekly-citations отсутствует (035 не применена)", { ...GREEN_BILLING_FX, jobs: Object.fromEntries(Object.entries(FXJ).filter(([k]) => k !== "weekly-citations")) }],
      ["daily-subscription-expiry неактивен", { ...GREEN_BILLING_FX, jobs: { ...FXJ, "daily-subscription-expiry": { active: false } } }],
      ["последний запуск weekly-serp failed", { ...GREEN_BILLING_FX, jobs: { ...FXJ, "weekly-serp": { active: true, last_status: "failed" } } }],
      ["блока cron.jobs нет", { subscribe: 401 }],
      ["фикстура billing.json отсутствует", null],
    ];
    billingLiveMutations.forEach(([label, fxRows], i) => {
      const d = join(work, `billing-fx-m${i}`); writeBillingFx(d, fxRows);
      const r = runBilling(repo, d); expect(`billing мутация live: ${label}`, r.code, 1, r.out);
    });
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failures.length > 0) { console.error(`\n${failures.length} провал(ов): ${failures.join("; ")}`); process.exit(1); }
console.log("\nВСЕ ПРОВЕРКИ ПРОШЛИ");
