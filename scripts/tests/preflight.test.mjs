/**
 * Мутационный тест оракула scripts/verify-preflight.mjs.
 *
 * Строит зелёный фикстурный репозиторий + зелёные сетевые фикстуры, убеждается
 * что оракул проходит (exit 0), затем вносит по одной заведомой регрессии —
 * на КАЖДОЙ оракул обязан покраснеть (exit 1). Защита от оракула-тавтологии.
 *
 * Запуск: node scripts/tests/preflight.test.mjs
 * Успех: exit 0 и строка «ВСЕ ПРОВЕРКИ ПРОШЛИ» в stdout.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const oracle = resolve(here, "..", "verify-preflight.mjs");

// ------------------------------------------------------------
// Зелёные фикстуры
// ------------------------------------------------------------

const GREEN_CONTRACT = `# План

## Контракт продукта Audit Start v1 (AF-0)

### 1. SKU

Audit Start, 7 900 ₽, единица «ниша × город».

### 2. Report schema (зафиксирована по фактическому продюсеру)

sub_queries в состав платного отчёта НЕ входят.

### 3. Provenance

Каждый material claim несёт источник.

### 4. Degraded mode — порог живых платформ

Отчёт выдаётся при ≥ 2 платформы и 8 из 10 вопросов.

### 5. SLA

Цель p95 ≤ 15 минут, жёсткая граница 60 минут.

### 6. Refund / failure policy

Полный провал -> автоматический 100% возврат.

## Следующий раздел
`;

const GREEN_PLAN = `# CURRENT_PLAN

- [x] 754 исторических failures не запускаются массово: выбран archive.
`;

const GREEN_SALES = `# SALES_LOG

2026-08-30 | касания 10 | ответы 2 | демо 1 | оплаты 0
2026-08-31 | касания 12 | ответы 3 | демо 1 | оплаты 0 | заметка
`;

const GREEN_HEALTH = {
  status: "ok",
  auth: { status: "ok", magic_link_ready: true, smtp_configured: true },
  worker: {
    pending_jobs: 0,
    failed_jobs: 0,
    by_type: { expand_query: { pending: 0, processing: 0, completed: 3, failed: 0 } },
  },
};

const boundaryBlock = (sku) =>
  `<section data-automation-boundary="${sku}"><p>граница ${sku}</p></section>`;

const GREEN_PRICING = `<html><body>
${boundaryBlock("audit-start")}
${boundaryBlock("launch-start")}
${boundaryBlock("managed-lite")}
</body></html>`;

const GREEN_AUDIT = `<html><body>${boundaryBlock("audit-start")}</body></html>`;

function writeRepo(root, { contract = GREEN_CONTRACT, plan = GREEN_PLAN, sales = GREEN_SALES } = {}) {
  mkdirSync(join(root, "docs", "plan"), { recursive: true });
  writeFileSync(join(root, "docs", "plan", "SELF_SERVE_PLAN.md"), contract);
  writeFileSync(join(root, "CURRENT_PLAN.md"), plan);
  if (sales !== null) writeFileSync(join(root, "SALES_LOG.md"), sales);
}

function writeFixtures(dir, { health = GREEN_HEALTH, webhookStatus = 400, pricing = GREEN_PRICING, audit = GREEN_AUDIT } = {}) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "health.json"), JSON.stringify(health));
  writeFileSync(join(dir, "webhook.json"), JSON.stringify({ status: webhookStatus }));
  writeFileSync(join(dir, "pricing.html"), pricing);
  writeFileSync(join(dir, "audit.html"), audit);
}

function runOracle(repoRoot, fixtureDir, extraFlags = []) {
  try {
    const stdout = execFileSync(
      process.execPath,
      [oracle, "--repo-root", repoRoot, "--fixture-dir", fixtureDir, ...extraFlags],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return { code: 0, out: stdout };
  } catch (err) {
    return { code: err.status ?? -1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

// ------------------------------------------------------------
// Кейсы
// ------------------------------------------------------------

const failures = [];
let caseNo = 0;

function expect(label, actual, expected, out) {
  caseNo += 1;
  if (actual === expected) {
    console.log(`  OK  [${caseNo}] ${label} -> exit ${actual}`);
  } else {
    failures.push(label);
    console.error(`FAIL  [${caseNo}] ${label}: exit ${actual}, ожидался ${expected}\n${out}`);
  }
}

const work = mkdtempSync(join(tmpdir(), "preflight-test-"));
try {
  // T0: зелёный кандидат.
  const greenRepo = join(work, "repo-green");
  const greenFx = join(work, "fx-green");
  writeRepo(greenRepo);
  writeFixtures(greenFx);
  {
    const { code, out } = runOracle(greenRepo, greenFx);
    expect("позитив: всё зелёное", code, 0, out);
  }

  // Мутации: [label, repo-overrides, fixture-overrides, extraFlags]
  const mutations = [
    ["контракт: секция «### 4. Degraded mode» удалена",
      { contract: GREEN_CONTRACT.replace("### 4. Degraded mode — порог живых платформ", "### 4. Порог") }, {}, []],
    ["контракт: маркер «автоматический 100% возврат» удалён",
      { contract: GREEN_CONTRACT.replace("автоматический 100% возврат", "возврат по заявке") }, {}, []],
    ["контракт: фиксация sub_queries снята",
      { contract: GREEN_CONTRACT.replace("НЕ входят", "входят") }, {}, []],
    ["план: решение по 754 разотмечено ([ ])",
      { plan: GREEN_PLAN.replace("- [x] 754", "- [ ] 754") }, {}, []],
    ["SALES_LOG отсутствует", { sales: null }, {}, []],
    ["SALES_LOG: последняя запись ломает формат",
      { sales: GREEN_SALES + "2026-09-01 | много касаний, все хорошие\n" }, {}, []],
    ["health: magic_link_ready=false",
      {}, { health: { ...GREEN_HEALTH, auth: { ...GREEN_HEALTH.auth, magic_link_ready: false } } }, []],
    ["health: expand_query.completed=0",
      {}, {
        health: {
          ...GREEN_HEALTH,
          worker: { ...GREEN_HEALTH.worker, by_type: { expand_query: { pending: 0, processing: 0, completed: 0, failed: 754 } } },
        },
      }, []],
    ["webhook: маршрут отсутствует (404)", {}, { webhookStatus: 404 }, []],
    ["webhook: принимает мусор (200)", {}, { webhookStatus: 200 }, []],
    ["pricing: нет блока managed-lite",
      {}, { pricing: GREEN_PRICING.replace(boundaryBlock("managed-lite"), "") }, []],
    ["--check-sales-today: последняя запись заведомо старая",
      { sales: "2020-01-01 | касания 1 | ответы 0 | демо 0 | оплаты 0\n" }, {}, ["--check-sales-today"]],
  ];

  mutations.forEach(([label, repoOv, fxOv, extraFlags], i) => {
    const repo = join(work, `repo-m${i}`);
    const fx = join(work, `fx-m${i}`);
    writeRepo(repo, repoOv);
    writeFixtures(fx, fxOv);
    const { code, out } = runOracle(repo, fx, extraFlags);
    expect(`мутация: ${label}`, code, 1, out);
  });

  // Приоритет «находки > транспорт»: repo-находка не маскируется exit 3
  // (находка ревью 2026-08-31). Мёртвый URL, ретраи и таймаут минимальны.
  function runOracleLive(repoRoot, extraFlags = []) {
    try {
      const stdout = execFileSync(
        process.execPath,
        [oracle, "--repo-root", repoRoot, "--base-url", "http://127.0.0.1:1", ...extraFlags],
        {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, PREFLIGHT_ATTEMPTS: "1", PREFLIGHT_TIMEOUT_MS: "800", PREFLIGHT_RETRY_DELAY_MS: "0" },
        },
      );
      return { code: 0, out: stdout };
    } catch (err) {
      return { code: err.status ?? -1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
    }
  }
  {
    const redRepo = join(work, "repo-transport-red");
    writeRepo(redRepo, { sales: null }); // repo-находка: SALES_LOG отсутствует
    const { code, out } = runOracleLive(redRepo);
    expect("транспорт мёртв + repo-находка -> exit 1, не 3", code, 1, out);
    if (!out.includes("SALES_LOG.md")) {
      failures.push("repo-находка не напечатана при транспортной ошибке");
      console.error("FAIL  repo-находка не напечатана при транспортной ошибке\n" + out);
    }
  }
  {
    const { code, out } = runOracleLive(join(work, "repo-green"));
    expect("транспорт мёртв + чистое репо -> exit 3", code, 3, out);
  }

  // Usage-контракт.
  {
    const { code, out } = runOracle(greenRepo, greenFx, ["--неизвестный"]);
    expect("usage: неизвестный флаг -> exit 2", code, 2, out);
  }
  {
    // repo-only на зелёном репо: живой контур не требуется.
    let res;
    try {
      const stdout = execFileSync(process.execPath, [oracle, "--repo-root", greenRepo, "--repo-only"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      res = { code: 0, out: stdout };
    } catch (err) {
      res = { code: err.status ?? -1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
    }
    expect("--repo-only на зелёном репо", res.code, 0, res.out);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\n${failures.length} провал(ов): ${failures.join("; ")}`);
  process.exit(1);
}
console.log("\nВСЕ ПРОВЕРКИ ПРОШЛИ");
