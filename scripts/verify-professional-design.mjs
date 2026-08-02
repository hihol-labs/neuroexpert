#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const args = process.argv.slice(2);
const unitIndex = args.indexOf("--unit");
const unit = unitIndex >= 0 ? args[unitIndex + 1] : "";

function fail(path, why, fix) {
  process.stderr.write(`${path}: WHY: ${why} FIX: ${fix}\n`);
  process.exitCode = 1;
}

async function requireText(path, needles) {
  const text = await readFile(path, "utf8");
  for (const needle of needles) {
    if (!text.includes(needle)) {
      fail(path, `required design marker is missing: ${needle}`, "restore the approved design-system marker or update the unit contract explicitly");
    }
  }
  return text;
}

async function verifyBrowserEvidence() {
  const manifestPath = ".itd-memory/evidence/G-001/browser-evidence.json";
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const expectedViewports = [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ];
  if (manifest.result !== "passed" || manifest.checks?.consoleErrors !== 0 || manifest.checks?.pageErrors !== 0) {
    fail(manifestPath, "browser evidence is not a clean pass", "rerun the G-001 Playwright smoke and record its real result");
  }

  for (const [index, item] of (manifest.screenshots || []).entries()) {
    const expected = expectedViewports[index];
    if (!expected || item.viewport?.width !== expected.width || item.viewport?.height !== expected.height) {
      fail(manifestPath, `screenshot ${index + 1} is not the contracted viewport`, "record desktop 1440x1000 followed by mobile 390x844");
      continue;
    }
    const bytes = await readFile(item.path);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (width !== item.viewport.width || height < item.viewport.height) {
      fail(item.path, `PNG dimensions ${width}x${height} do not cover viewport ${item.viewport.width}x${item.viewport.height}`, "recapture full-page evidence at the contracted viewport");
    }
    if (digest !== item.sha256) {
      fail(item.path, "screenshot hash does not match the reviewed evidence manifest", "rerun browser-check and update the manifest from the new reviewed artifact");
    }
  }

  if ((manifest.screenshots || []).length !== expectedViewports.length) {
    fail(manifestPath, "desktop and mobile screenshot evidence are both required", "record exactly the 1440x1000 and 390x844 captures");
  }
}

if (!unit) {
  fail("scripts/verify-professional-design.mjs", "--unit is required", "run with --unit G-001");
} else if (unit === "G-001") {
  const css = await requireText("apps/web/app/globals.css", [
    "--nx-ink:",
    "--nx-paper:",
    "--nx-accent:",
    "--nx-cobalt:",
    ".nx-display",
    ".nx-focus-ring:focus-visible",
  ]);
  const page = await requireText("apps/web/app/(marketing)/page.tsx", [
    "Спрос уже есть.",
    "DemandConsole",
    "Операционный цикл",
    "Начните с точки, где вы сейчас.",
  ]);
  await requireText("apps/web/components/marketing/nav.tsx", [
    "Local Sales OS",
    "var(--nx-accent)",
    "nx-focus-ring",
  ]);
  await requireText("docs/design/ART_DIRECTION.md", [
    "Editorial operations",
    "1440×1000",
    "390×844",
  ]);
  await verifyBrowserEvidence();

  const deprecatedPatterns = [
    "bg-blue-50",
    "rounded-lg border border-blue-200",
    "grid gap-5 md:grid-cols-2 lg:grid-cols-5",
  ];
  for (const pattern of deprecatedPatterns) {
    if (page.includes(pattern)) {
      fail("apps/web/app/(marketing)/page.tsx", `deprecated generic homepage pattern remains: ${pattern}`, "replace it with the approved editorial composition");
    }
  }

  if (!css.includes("text-rendering: optimizeLegibility")) {
    fail("apps/web/app/globals.css", "display typography lacks explicit legibility treatment", "restore text-rendering in the base body rule");
  }

  if (!process.exitCode) {
    const localPnpm = join(process.env.HOME || "", ".local", "bin", "pnpm");
    const pnpm = existsSync(localPnpm) ? localPnpm : "pnpm";
    const build = spawnSync(pnpm, ["--filter", "web", "build"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: 900_000,
    });
    if (build.status !== 0) {
      const output = `${build.stdout || ""}\n${build.stderr || ""}\n${build.error?.message || ""}`.trim().slice(-4000);
      fail("apps/web", `production build failed\n${output}`, "fix the reported Next.js build error and rerun the unit oracle");
    }
  }
} else {
  fail("scripts/verify-professional-design.mjs", `unit ${unit} has no implemented oracle yet`, "implement the unit-specific checks before activation");
}
