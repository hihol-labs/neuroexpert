import { execSync } from "node:child_process";

const baseUrl = (process.env.CANONICAL_URL || "https://neuroexpertise.ru").replace(/\/$/, "");
const requireHead = process.argv.includes("--require-head");

const routes = [
  ["/", "sr-site", "Находим место, где спрос перестаёт быть продажей"],
  ["/for-business", "br-site", "Проследим путь клиента. Найдём место потери."],
  ["/how-it-works", "hiw-site", "Сигнал входит. Решение выходит."],
  ["/launch", "ln-site", "За 30 дней — от разрозненных каналов к рабочему контуру."],
  ["/pricing", "pr-room", "Цена следует"],
  ["/scan", "sc-site", "AI Visibility Probe"],
  ["/audit", "dm-site", "Demand Map"],
  ["/for-experts", "ex-site", "Voiceprint Studio"],
  ["/for-agencies", "ag-site", "Не отчёт."],
];

const failures = [];
const canonicalOrigin = new URL(baseUrl).origin;

// Redirect может увести с canonical-origin (ревью-находки r2/r4): финальный
// URL обязан совпадать по origin (схема+хост+порт) — https→http тоже провал.
function assertCanonical(path, response) {
  const finalOrigin = new URL(response.url).origin;
  if (finalOrigin !== canonicalOrigin) {
    failures.push(`${path}: redirected off-canonical to ${finalOrigin}`);
    return false;
  }
  return true;
}

for (const [path, marker, heading] of routes) {
  const url = `${baseUrl}${path}`;
  try {
    const response = await fetch(url, { redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const html = await response.text();
    if (!assertCanonical(path, response)) continue;
    if (!response.ok) failures.push(`${path}: HTTP ${response.status}`);
    if (!html.includes(marker)) failures.push(`${path}: missing Signal Room marker ${marker}`);
    if (!html.includes(heading)) failures.push(`${path}: missing expected heading`);
  } catch (error) {
    failures.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (requireHead) {
  // Release identity (ADR-002): «задеплоено» = SHA на canonical-хосте ==
  // ожидаемый SHA. По умолчанию — локальный HEAD; при деплое явного
  // DEPLOY_SHA передаётся EXPECTED_SHA (ревью-находка: HEAD != DEPLOY_SHA).
  try {
    const expected = (process.env.EXPECTED_SHA || execSync("git rev-parse HEAD", { encoding: "utf8" })).trim();
    const response = await fetch(`${baseUrl}/api/version`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (assertCanonical("/api/version", response)) {
      const body = await response.json();
      if (!response.ok) failures.push(`/api/version: HTTP ${response.status}`);
      else if (body.sha !== expected) failures.push(`/api/version: sha ${body.sha} != expected ${expected}`);
    }
  } catch (error) {
    failures.push(`/api/version: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  console.error(`Canonical release verification failed for ${baseUrl}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Canonical release verification passed for ${baseUrl} (${routes.length} routes)`);
}
