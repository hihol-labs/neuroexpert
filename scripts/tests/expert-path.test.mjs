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
    expect("usage: неизвестная стадия -> exit 2", run(["--stage=publish", "--repo-root", repo, "--repo-only"]).code, 2, "");
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
      [D.lib]: "if (!user) return NextResponse.json({ error: \"Unauthorized\" }, { status: 401 });\nif (!isSameOriginPost(request)) return NextResponse.json({ error: \"Forbidden\" }, { status: 403 });\nexport function isSameOriginPost(request) { return isSameOriginRequest(o, s, allowed); }\nawait admin.from(\"orders\").update({ status }).eq(\"id\", id).eq(\"expert_id\", user.id).eq(\"status\", \"pending\");\nconst d = decideOrderSelection(order, user.id, action);\nreturn NextResponse.redirect(url, 303);\nexport async function resolveVoiceOrder(admin, expertId, orderId) { return admin.from(\"orders\").select(\"id\")\n      .eq(\"expert_id\", expertId)\n      .eq(\"status\", \"accepted\")\n      .maybeSingle(); }\n",
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
      const m = /(\d+) finding\(s\)/.exec(r.out); expect("demand: пустое репо даёт ровно 5 групповых находок (legacy-группы молчат)", m ? Number(m[1]) : -1, 5, r.out);
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
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failures.length > 0) { console.error(`\n${failures.length} провал(ов): ${failures.join("; ")}`); process.exit(1); }
console.log("\nВСЕ ПРОВЕРКИ ПРОШЛИ");
