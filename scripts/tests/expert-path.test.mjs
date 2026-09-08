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
    "CREATE EXTENSION IF NOT EXISTS pg_cron;",
    "SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('weekly-demand','weekly-generate-orders');",
    "SELECT cron.schedule('weekly-demand', '0 3 * * 1', $$INSERT INTO public.jobs (type, payload) SELECT 'collect_demand', jsonb_build_object('niche_id', id) FROM public.niches WHERE is_active = TRUE$$);",
    "SELECT cron.schedule('weekly-generate-orders', '0 4 * * 1', $$INSERT INTO public.jobs (type, payload, priority) SELECT 'generate_orders', jsonb_build_object('niche_id', id), 3 FROM public.niches WHERE is_active = TRUE$$);",
    "INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('voice', 'voice', false, 26214400, ARRAY['audio/*']) ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 26214400, allowed_mime_types = ARRAY['audio/*'];",
    "CREATE OR REPLACE FUNCTION public.infra_status() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN '{}'::jsonb; END $$;",
  ].join("\n") + "\n",
  "apps/bot/src/handlers/voice.ts": [
    "const { error: uploadError } = await supabase.storage.from(\"voice\").upload(filePath, audioBuffer, { contentType: \"audio/ogg\", upsert: false });",
    "if (uploadError) { console.error(\"[voice] Upload error:\", uploadError); await ctx.reply(\"Не удалось сохранить запись, попробуйте еще раз.\"); return; }",
  ].join("\n") + "\n",
  "apps/web/app/api/voice/route.ts": [
    "const { error: uploadError } = await admin.storage.from(\"voice\").upload(filePath, buffer, { contentType: audioFile.type || \"audio/webm\", upsert: false });",
    "if (uploadError) { return NextResponse.json({ error: \"Failed to store audio\" }, { status: 500 }); }",
  ].join("\n") + "\n",
  "apps/web/app/experts/[slug]/[articleSlug]/page.tsx": "const { data: signed } = await supabase.storage.from(\"voice\").createSignedUrl(voice.file_path, 86400);\n",
  "apps/web/app/api/v1/answers/route.ts": "const { data: signed } = await admin.storage.from(\"voice\").createSignedUrl(voice.file_path, 86400);\n",
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
  storage: { voice_bucket: "private" },
};

function writeRepo(root, files) {
  for (const [rel, body] of Object.entries(files)) {
    if (body === null) continue;
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  mkdirSync(root, { recursive: true });
}
function writeFixtures(dir, health) {
  mkdirSync(dir, { recursive: true });
  if (health !== null) writeFileSync(join(dir, "health.json"), JSON.stringify(health));
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
    const m = /(\d+) finding\(s\)/.exec(r3.out); expect("пустое репо даёт ровно 5 групповых находок", m ? Number(m[1]) : -1, 5, r3.out);
  }

  // ===== мутации репо =====
  const F = GREEN_FILES; const MIG = "packages/supabase/migrations/031_cron_and_voice_bucket.sql";
  const repoMutations = [
    ["миграция: нет CREATE EXTENSION pg_cron (инцидент прода: расширение никогда не ставилось)", { [MIG]: F[MIG].replace("CREATE EXTENSION IF NOT EXISTS pg_cron;", "") }],
    ["миграция: нет guard cron.database_name (задания регистрируются, но не исполняются)", { [MIG]: F[MIG].replace("current_setting('cron.database_name', true)", "current_setting('cron.db', true)") }],
    ["миграция: guard не падает (нет RAISE EXCEPTION)", { [MIG]: F[MIG].replace("RAISE EXCEPTION", "RAISE NOTICE") }],
    ["миграция: нет weekly-demand", { [MIG]: F[MIG].replace("cron.schedule('weekly-demand'", "cron.schedule('weekly-demand-old'") }],
    ["миграция: нет weekly-generate-orders", { [MIG]: F[MIG].replace("cron.schedule('weekly-generate-orders'", "cron.schedule('weekly-orders'") }],
    ["миграция: расписания не идемпотентны (нет cron.unschedule)", { [MIG]: F[MIG].replace("cron.unschedule(", "cron.noop(") }],
    ["миграция: bucket voice остаётся публичным", { [MIG]: F[MIG].replace("public = false", "public = true") }],
    ["миграция: bucket не создаётся миграцией", { [MIG]: F[MIG].replace("storage.buckets", "storage.objects") }],
    ["миграция: bucket без лимита размера и типов", { [MIG]: F[MIG].replace("INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('voice', 'voice', false, 26214400, ARRAY['audio/*']) ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 26214400, allowed_mime_types = ARRAY['audio/*'];", "INSERT INTO storage.buckets (id, name, public) VALUES ('voice', 'voice', false) ON CONFLICT (id) DO UPDATE SET public = false;") }],
    ["миграция: нет RPC infra_status", { [MIG]: F[MIG].replace("FUNCTION public.infra_status(", "FUNCTION public.cron_status(") }],
    ["миграция: RPC без SECURITY DEFINER (PostgREST не увидит cron/storage)", { [MIG]: F[MIG].replace("SECURITY DEFINER", "SECURITY INVOKER") }],
    ["бот: аудио не заливается в Storage (E-AUTO-6)", { "apps/bot/src/handlers/voice.ts": "await ctx.reply(\"Получил голосовое сообщение. Расшифровываю...\");\n" }],
    ["бот: ошибка upload игнорируется", { "apps/bot/src/handlers/voice.ts": F["apps/bot/src/handlers/voice.ts"].replace("error: uploadError", "error: _ignored").replace("Не удалось сохранить запись", "Получил") }],
    ["web: upload best-effort без 500", { "apps/web/app/api/voice/route.ts": "await admin.storage.from(\"voice\").upload(filePath, buffer);\n" }],
    ["читатели: плеер статьи строит публичный URL на приватный bucket", { "apps/web/app/experts/[slug]/[articleSlug]/page.tsx": "const audioUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/voice/${voice.file_path}`;\n" }],
    ["читатели: /api/v1/answers без подписи ссылки", { "apps/web/app/api/v1/answers/route.ts": "const audio_url = null;\n" }],
    ["читатели: подпись есть, но публичный URL остался", { "apps/web/app/api/v1/answers/route.ts": F["apps/web/app/api/v1/answers/route.ts"] + "const legacy = `${storageUrl}/storage/v1/object/public/voice/${voice.file_path}`;\n" }],
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
    ["health: bucket voice публичный", { ...H, storage: { voice_bucket: "public" } }],
    ["health: bucket voice отсутствует", { ...H, storage: { voice_bucket: "missing" } }],
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
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failures.length > 0) { console.error(`\n${failures.length} провал(ов): ${failures.join("; ")}`); process.exit(1); }
console.log("\nВСЕ ПРОВЕРКИ ПРОШЛИ");
