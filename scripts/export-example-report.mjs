#!/usr/bin/env node
/**
 * export-example-report.mjs — собрать публичную фикстуру «пример отчёта» (G-013)
 * из реального снапшота отчёта Audit Start.
 *
 * Вход (одно из):
 *   --from-json <файл>   — JSON ответа /api/audit type=paid или package_orders.report;
 *   --order <uuid>       — прочитать package_orders.report по id через service role
 *                          (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY в env).
 * Параметры: --pair "Стоматология × Тюмень" (обязателен), --source-note "…" (обязателен),
 *   --out apps/web/content/example-report.json (по умолчанию).
 *
 * Снапшот прогоняется через продюсер (buildReportSnapshot из packages/shared/dist),
 * режим считается decideDeliveryMode — руками не пишется. В фикстуру не попадают
 * идентификаторы заказа/владельца/email: берётся только ReportSnapshot.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const fromJson = opt("--from-json"), order = opt("--order"), pair = opt("--pair"), sourceNote = opt("--source-note");
const out = opt("--out") ?? "apps/web/content/example-report.json";
if ((!fromJson && !order) || !pair || !sourceNote) {
  console.error("usage: --from-json <file> | --order <uuid>, --pair \"…\", --source-note \"…\" [--out path]");
  process.exit(2);
}

let raw;
if (fromJson) {
  raw = JSON.parse(readFileSync(resolve(fromJson), "utf8"));
  if (raw && typeof raw === "object" && raw.report) raw = raw.report;
} else {
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await admin.from("package_orders").select("report").eq("id", order).maybeSingle();
  if (error || !data?.report) { console.error("order report not found", error?.message ?? ""); process.exit(1); }
  raw = data.report;
}

const mod = await import(pathToFileURL(join(root, "packages/shared/dist/delivery/index.js")).href);
const report = mod.buildReportSnapshot(raw);
const mode = mod.decideDeliveryMode(raw);
if (mode === "failed") { console.error("снапшот в режиме failed — примером быть не может"); process.exit(1); }
const fixture = {
  meta: { pair, mode, ran_at: report.ran_at, platforms_tried: report.platforms_tried, source_note: sourceNote },
  report,
};
const text = JSON.stringify(fixture, null, 2) + "\n";
if (/[\w.+-]+@[\w-]+\.[\w.]+|owner_id|order_id|yukassa/i.test(text)) { console.error("в фикстуре найдены идентификаторы/email — публиковать нельзя"); process.exit(1); }
writeFileSync(resolve(root, out), text);
console.log(`example fixture written: ${out} (mode ${mode}, ${report.gaps.length} gaps, platforms ${report.platforms_tried.join("/")}, ran_at ${report.ran_at})`);
