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

async function verifyG003BrowserEvidence() {
  const manifestPath = ".itd-memory/evidence/G-003/browser-evidence.json";
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const expectedViewports = [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ];
  const checks = manifest.checks || {};
  if (manifest.result !== "passed" || checks.consoleErrors !== 0 || checks.pageErrors !== 0) {
    fail(manifestPath, "agency browser evidence is not a clean pass", "rerun the G-003 browser smoke and record its real result");
  }
  for (const key of ["mobileMenuExpanded", "reducedMotionStatic", "leadFormSuccess", "leadFormError"]) {
    if (!checks[key]) fail(manifestPath, `required browser check is missing or false: ${key}`, "record the contracted agency interaction and accessibility evidence");
  }
  for (const key of ["horizontalOverflowDesktop", "horizontalOverflowMobile"]) {
    if (checks[key] !== 0) fail(manifestPath, `horizontal overflow detected: ${key}`, "fix the responsive layout and recapture browser evidence");
  }
  for (const [index, item] of (manifest.screenshots || []).entries()) {
    const expected = expectedViewports[index];
    if (!expected || item.viewport?.width !== expected.width || item.viewport?.height !== expected.height) {
      fail(manifestPath, `screenshot ${index + 1} is not the contracted viewport`, "record desktop 1440x900 followed by mobile 390x844");
      continue;
    }
    const bytes = await readFile(item.path);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (width !== item.viewport.width || height < item.viewport.height) fail(item.path, `PNG dimensions ${width}x${height} do not cover viewport ${item.viewport.width}x${item.viewport.height}`, "recapture full-page evidence at the contracted viewport");
    if (digest !== item.sha256) fail(item.path, "screenshot hash does not match the reviewed evidence manifest", "rerun browser-check and update the manifest from the new reviewed artifact");
  }
  if ((manifest.screenshots || []).length !== expectedViewports.length) fail(manifestPath, "desktop and mobile agency screenshots are both required", "record exactly the 1440x900 and 390x844 captures");
}

async function verifyG004BrowserEvidence() {
  const manifestPath = ".itd-memory/evidence/G-004/browser-evidence.json";
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const expectedViewports = [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 390, height: 844 },
  ];
  const checks = manifest.checks || {};
  if (manifest.result !== "passed" || checks.consoleErrors !== 0 || checks.pageErrors !== 0) {
    fail(manifestPath, "product-shell browser evidence is not a clean pass", "rerun the G-004 Playwright smoke and record its real result");
  }
  for (const key of ["signalField", "formShell", "nativeValidation", "dashboardRouteGuard", "loginSuccess", "loginError", "reducedMotionStatic"]) {
    if (!checks[key]) fail(manifestPath, `required product-shell browser check is missing or false: ${key}`, "record the contracted auth and route-guard evidence");
  }
  if (checks.horizontalOverflowDesktop !== 0 || checks.horizontalOverflowMobile !== 0) {
    fail(manifestPath, "horizontal overflow detected in product shell", "fix the responsive auth/dashboard shell and recapture browser evidence");
  }
  if (checks.dashboardMobileMenu !== true && checks.dashboardMobileMenu !== "redirected") {
    fail(manifestPath, "dashboard menu or route guard was not verified", "verify the authenticated dashboard menu or the protected redirect contract");
  }
  for (const [index, item] of (manifest.screenshots || []).entries()) {
    const expected = expectedViewports[index];
    if (!expected || item.viewport?.width !== expected.width || item.viewport?.height !== expected.height) {
      fail(manifestPath, `screenshot ${index + 1} is not the contracted viewport`, "record desktop 1440x900 followed by mobile 390x844 captures");
      continue;
    }
    const bytes = await readFile(item.path);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (width !== item.viewport.width || height < item.viewport.height) fail(item.path, `PNG dimensions ${width}x${height} do not cover viewport ${item.viewport.width}x${item.viewport.height}`, "recapture full-page evidence at the contracted viewport");
    if (digest !== item.sha256) fail(item.path, "screenshot hash does not match the reviewed product-shell manifest", "rerun browser-check and update the manifest from the new reviewed artifact");
  }
  if ((manifest.screenshots || []).length !== expectedViewports.length) fail(manifestPath, "auth and dashboard route evidence screenshots are required", "record exactly three G-004 screenshots");
}

async function verifyG005BrowserEvidence() {
  const manifestPath = ".itd-memory/evidence/G-005/browser-evidence.json";
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const expectedViewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
  const checks = manifest.checks || {};
  if (manifest.result !== "passed" || checks.consoleErrors !== 0 || checks.pageErrors !== 0) {
    fail(manifestPath, "dashboard browser evidence is not a clean pass", "rerun the authenticated G-005 Playwright smoke and record its real result");
  }
  for (const key of ["sharedPageSurface", "dashboardOverview", "mobileMenu", "closedSidebarInert", "reducedMotionStatic"]) {
    if (!checks[key]) fail(manifestPath, `required dashboard browser check is missing or false: ${key}`, "record the shared dashboard shell, menu, and reduced-motion evidence");
  }
  if (!Array.isArray(checks.authenticatedRoutes) || checks.authenticatedRoutes.length < 5) fail(manifestPath, "authenticated route matrix is incomplete", "exercise dashboard, today, orders, content, and leads with a valid local session");
  if (checks.horizontalOverflowDesktop !== 0 || checks.horizontalOverflowMobile !== 0) fail(manifestPath, "horizontal overflow detected in dashboard surfaces", "fix the responsive dashboard layout and recapture browser evidence");
  for (const [index, item] of (manifest.screenshots || []).entries()) {
    const expected = expectedViewports[index];
    if (!expected || item.viewport?.width !== expected.width || item.viewport?.height !== expected.height) {
      fail(manifestPath, `screenshot ${index + 1} is not the contracted viewport`, "record desktop 1440x900 followed by mobile 390x844");
      continue;
    }
    const bytes = await readFile(item.path);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (width !== item.viewport.width || height < item.viewport.height) fail(item.path, `PNG dimensions ${width}x${height} do not cover viewport ${item.viewport.width}x${item.viewport.height}`, "recapture full-page dashboard evidence at the contracted viewport");
    if (digest !== item.sha256) fail(item.path, "screenshot hash does not match the reviewed dashboard manifest", "rerun browser-check and update the manifest from the new reviewed artifact");
  }
  if ((manifest.screenshots || []).length !== expectedViewports.length) fail(manifestPath, "desktop and mobile dashboard screenshots are required", "record exactly the 1440x900 and 390x844 captures");
}

async function verifyG006BrowserEvidence() {
  const manifestPath = ".itd-memory/evidence/G-006/browser-evidence.json";
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const expectedViewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
  const checks = manifest.checks || {};
  if (manifest.result !== "passed" || checks.consoleErrors !== 0 || checks.pageErrors !== 0) {
    fail(manifestPath, "public catalog browser evidence is not a clean pass", "rerun the G-006 public catalog Playwright smoke and record its real result");
  }
  for (const key of ["catalogOverview", "mobileMenuExpanded", "reducedMotionStatic"]) {
    if (!checks[key]) fail(manifestPath, `required public catalog check is missing or false: ${key}`, "record shared shell, mobile navigation and reduced-motion evidence");
  }
  for (const key of ["route:/experts", "route:/questions"]) {
    if (!checks[key] || checks[key].overflow !== 0) fail(manifestPath, `catalog route evidence is missing or overflowing: ${key}`, "exercise the representative public routes at both contracted viewports");
  }
  for (const [index, item] of (manifest.screenshots || []).entries()) {
    const expected = expectedViewports[index];
    if (!expected || item.viewport?.width !== expected.width || item.viewport?.height !== expected.height) {
      fail(manifestPath, `screenshot ${index + 1} is not the contracted viewport`, "record desktop 1440x900 followed by mobile 390x844");
      continue;
    }
    const bytes = await readFile(item.path);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (width !== item.viewport.width || height < item.viewport.height) fail(item.path, `PNG dimensions ${width}x${height} do not cover viewport ${item.viewport.width}x${item.viewport.height}`, "recapture full-page catalog evidence at the contracted viewport");
    if (digest !== item.sha256) fail(item.path, "screenshot hash does not match the reviewed catalog manifest", "rerun G-006 browser-check and update the manifest from the new reviewed artifact");
  }
  if ((manifest.screenshots || []).length !== expectedViewports.length) fail(manifestPath, "desktop and mobile catalog screenshots are required", "record exactly the 1440x900 and 390x844 captures");
}

async function verifyG007BrowserEvidence() {
  const manifestPath = ".itd-memory/evidence/G-007/browser-evidence.json";
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const expectedViewports = [
    { width: 1440, height: 900 },
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 390, height: 844 },
    { width: 390, height: 844 },
  ];
  const checks = manifest.checks || {};
  if (manifest.result !== "passed" || checks.consoleErrors !== 0 || checks.pageErrors !== 0) {
    fail(manifestPath, "release browser evidence is not a clean pass", "rerun the G-007 representative route Playwright smoke and record its real result");
  }
  for (const key of ["keyboardFocus", "marketingMobileMenu", "catalogMobileMenu", "dashboardMobileMenu", "desktopAccessibility", "mobileAccessibility", "reducedMotionStatic"]) {
    if (!checks[key]) fail(manifestPath, `required release gate check is missing or false: ${key}`, "record keyboard, menu, accessibility and reduced-motion evidence");
  }
  if (checks.keyboardFocus.visible !== true || checks.desktopAccessibility.missingAlt !== 0 || checks.desktopAccessibility.unnamedButtons !== 0 || checks.mobileAccessibility.missingAlt !== 0 || checks.mobileAccessibility.unnamedButtons !== 0) {
    fail(manifestPath, "keyboard or baseline accessibility assertions are not clean", "fix focus visibility, image alt text or unnamed controls before release");
  }
  const routeMatrix = checks.routeMatrix || {};
  const representativeRoutes = Object.values(routeMatrix).flat();
  for (const route of representativeRoutes) {
    const desktop = checks[`route:${route}:desktop`];
    if (!desktop || desktop.overflow !== 0 || desktop.status !== 200) fail(manifestPath, `desktop representative route is missing or overflowing: ${route}`, "rerun the route matrix at 1440x900");
  }
  for (const route of ["/", "/experts", "/questions", "/login", "/dashboard"]) {
    const mobile = checks[`route:${route}:mobile`];
    if (!mobile || mobile.overflow !== 0 || mobile.status !== 200) fail(manifestPath, `mobile representative route is missing or overflowing: ${route}`, "rerun the route matrix at 390x844");
  }
  for (const [index, item] of (manifest.screenshots || []).entries()) {
    const expected = expectedViewports[index];
    if (!expected || item.viewport?.width !== expected.width || item.viewport?.height !== expected.height) {
      fail(manifestPath, `screenshot ${index + 1} is not the contracted viewport`, "record two desktop and three mobile release captures");
      continue;
    }
    const bytes = await readFile(item.path);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (width !== item.viewport.width || height < item.viewport.height) fail(item.path, `PNG dimensions ${width}x${height} do not cover viewport ${item.viewport.width}x${item.viewport.height}`, "recapture the release visual regression set at the contracted viewport");
    if (digest !== item.sha256) fail(item.path, "screenshot hash does not match the approved release manifest", "recapture G-007 screenshots and update only the evidence manifest");
  }
  if ((manifest.screenshots || []).length !== expectedViewports.length) fail(manifestPath, "complete representative visual regression set is missing", "record exactly five G-007 screenshots");
}

function runProductionBuild({ includeOfflineInstall = false } = {}) {
  const localPnpm = join(process.env.HOME || "", ".local", "bin", "pnpm");
  const pnpm = existsSync(localPnpm) ? localPnpm : "pnpm";
  if (includeOfflineInstall && !existsSync(join(process.cwd(), "node_modules"))) {
    const install = spawnSync(pnpm, ["install", "--offline", "--frozen-lockfile", "--ignore-scripts"], { cwd: process.cwd(), encoding: "utf8", stdio: "pipe", timeout: 600_000 });
    if (install.status !== 0) {
      const output = `${install.stdout || ""}\n${install.stderr || ""}\n${install.error?.message || ""}`.trim().slice(-4000);
      fail("apps/web", `offline dependency install failed\n${output}`, "restore the pnpm store or install dependencies before rerunning the unit oracle");
      return;
    }
  }
  const buildEnv = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "verification-anon-key", SUPABASE_SERVICE_ROLE_KEY: "verification-service-key" };
  const sharedBuild = spawnSync(pnpm, ["--filter", "shared", "build"], { cwd: process.cwd(), env: buildEnv, encoding: "utf8", stdio: "pipe", timeout: 600_000 });
  if (sharedBuild.status !== 0) {
    const output = `${sharedBuild.stdout || ""}\n${sharedBuild.stderr || ""}\n${sharedBuild.error?.message || ""}`.trim().slice(-4000);
    fail("packages/shared", `shared package build failed\n${output}`, "fix the shared package build before rerunning the unit oracle");
    return;
  }
  const build = spawnSync(pnpm, ["--filter", "web", "build"], { cwd: process.cwd(), env: buildEnv, encoding: "utf8", stdio: "pipe", timeout: 900_000 });
  if (build.status !== 0) {
    const output = `${build.stdout || ""}\n${build.stderr || ""}\n${build.error?.message || ""}`.trim().slice(-4000);
    fail("apps/web", `production build failed\n${output}`, "fix the reported Next.js build error and rerun the unit oracle");
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
} else if (unit === "G-002") {
  const css = await requireText("apps/web/app/globals.css", [
    "--sr-bg:",
    "--sr-ivory:",
    "--sr-accent:",
    ".sr-header",
    ".sr-footer",
    ".sr-button",
    ".br-site",
    "@keyframes br-route",
    "@media (prefers-reduced-motion: reduce)",
  ]);
  const nav = await requireText("apps/web/components/marketing/nav.tsx", [
    "sr-header",
    "sr-logo-mark",
    "sr-nav-cta",
    "sr-mobile-menu",
    "sr-footer",
  ]);
  const landing = await requireText("apps/web/app/(marketing)/page.tsx", [
    'className="sr-site"',
    "DemandScene",
    "sr-button sr-button-primary",
  ]);
  const business = await requireText("apps/web/app/(marketing)/for-business/page.tsx", [
    'className="sr-site br-site"',
    "BusinessDemandPath",
    "BusinessLeadForm",
    "br-section-intro",
  ]);

  for (const [path, text] of [
    ["apps/web/components/marketing/nav.tsx", nav],
    ["apps/web/app/(marketing)/page.tsx", landing],
    ["apps/web/app/(marketing)/for-business/page.tsx", business],
  ]) {
    for (const pattern of ["bg-blue-50", "rounded-2xl", "shadow-sm"]) {
      if (text.includes(pattern)) {
        fail(path, `deprecated generic marketing primitive remains: ${pattern}`, "use the shared Signal Room design primitives");
      }
    }
  }

  if (!css.includes("@media (max-width: 760px)") || !css.includes(".br-flow-dot { display: none; }")) {
    fail("apps/web/app/globals.css", "responsive or reduced-motion contract is incomplete", "restore the mobile breakpoint and static reduced-motion state");
  }
} else if (unit === "G-003") {
  const css = await requireText("apps/web/app/globals.css", [
    ".br-site",
    ".hiw-hero",
    ".ln-hero",
    ".pr-room",
    ".sc-site",
    ".dm-site",
    ".ex-site",
    ".ag-site",
    "@keyframes pr-marker",
    "@keyframes sc-sweep",
    "@keyframes dm-scanline",
    "@keyframes ex-wave",
    "@media (prefers-reduced-motion: reduce)",
  ]);
  const routes = [
    ["apps/web/app/(marketing)/for-business/page.tsx", ["className=\"sr-site br-site\"", "BusinessDemandPath", "BusinessLeadForm"]],
    ["apps/web/app/(marketing)/how-it-works/page.tsx", ["className=\"sr-site hiw-site\"", "SystemProtocol"]],
    ["apps/web/app/(marketing)/launch/page.tsx", ["className=\"sr-site ln-site\"", "launch_30d"]],
    ["apps/web/app/(marketing)/pricing/pricing-content.tsx", ["className=\"sr-site pr-room\"", "Scale selector", "aria-pressed"]],
    ["apps/web/app/(marketing)/scan/page.tsx", ["className=\"sr-site sc-site\"", "AI Visibility Probe", "sc-scanning", "aria-live"]],
    ["apps/web/app/(marketing)/audit/page.tsx", ["className=\"sr-site dm-site\"", "Demand Map", "dm-gap", "aria-expanded"]],
    ["apps/web/app/(marketing)/for-experts/page.tsx", ["className=\"sr-site ex-site\"", "Voiceprint Studio", "ex-waveform"]],
    ["apps/web/app/(marketing)/for-agencies/page.tsx", ["className=\"sr-site ag-site\"", "AgencyControlPlane", "agency-leads"]],
  ];
  const routeTexts = [];
  for (const [path, markers] of routes) routeTexts.push([path, await requireText(path, markers)]);
  for (const [path, text] of routeTexts) {
    for (const pattern of ["bg-blue-50", "rounded-2xl", "shadow-sm"]) {
      if (text.includes(pattern)) fail(path, `deprecated generic marketing primitive remains: ${pattern}`, "replace it with route-specific Signal Room primitives");
    }
  }
  if (!css.includes(".ag-motion-grid") || !css.includes(".ag-form")) {
    fail("apps/web/app/globals.css", "agency control-plane surface markers are incomplete", "restore the scoped agency visual system");
  }
  await verifyG003BrowserEvidence();
  const serviceOrders = await requireText("apps/web/app/api/service-orders/route.ts", ["303"]);
  if (!serviceOrders.includes("), 303")) fail("apps/web/app/api/service-orders/route.ts", "form success redirect is not explicitly 303", "keep POST form submissions on a non-repeating redirect");

  if (!process.exitCode) {
    runProductionBuild({ includeOfflineInstall: true });
  }
} else if (unit === "G-004") {
  const css = await requireText("apps/web/app/globals.css", [
    ".id-site",
    ".id-signal-field",
    ".id-form-shell",
    ".nx-shell",
    ".nx-sidebar",
    "@keyframes id-scan",
    "@media (prefers-reduced-motion: reduce)",
  ]);
  const frame = await requireText("apps/web/components/auth/auth-frame.tsx", [
    "className=\"id-site\"",
    "id-signal-field",
    "id-form-shell",
    "Signal Room / Identity",
  ]);
  const login = await requireText("apps/web/app/(auth)/login/page.tsx", [
    "AuthFrame",
    "/api/auth/magic-link",
    "role=\"status\"",
    "aria-busy={loading}",
    "name=\"email\"",
  ]);
  const register = await requireText("apps/web/app/(auth)/register/page.tsx", [
    "AuthFrame",
    "createClient().auth.signUp",
    "role=\"alert\"",
    "aria-busy={loading}",
    "name=\"fullName\"",
  ]);
  const dashboard = await requireText("apps/web/app/(dashboard)/layout.tsx", [
    "className=\"nx-shell\"",
    "NAV_ITEMS",
    "aria-current={active ? \"page\" : undefined}",
    "className={`nx-nav-link ${active ? \"is-active\" : \"\"}`}",
  ]);

  for (const [path, text] of [
    ["apps/web/components/auth/auth-frame.tsx", frame],
    ["apps/web/app/(auth)/login/page.tsx", login],
    ["apps/web/app/(auth)/register/page.tsx", register],
    ["apps/web/app/(dashboard)/layout.tsx", dashboard],
  ]) {
    for (const pattern of ["bg-blue-50", "rounded-2xl", "shadow-sm"]) {
      if (text.includes(pattern)) fail(path, `deprecated generic shell primitive remains: ${pattern}`, "use the scoped Signal Room shell primitives");
    }
  }
  for (const [path, text] of [["apps/web/app/(auth)/login/page.tsx", login], ["apps/web/app/(auth)/register/page.tsx", register]]) {
    if (text.includes("noValidate")) fail(path, "native form validation was disabled", "keep native required-field validation as part of the auth contract");
    if (!text.includes("required") || !text.includes("aria-live")) fail(path, "auth form lacks native validation or live status feedback", "restore required inputs and aria-live status/error messaging");
  }
  await verifyG004BrowserEvidence();
  if (!process.exitCode) runProductionBuild({ includeOfflineInstall: true });
} else if (unit === "G-005") {
  const css = await requireText("apps/web/app/globals.css", [
    ".nx-page",
    ".db-page",
    ".db-stat-grid",
    ".db-flow",
    ".nx-empty",
    ".nx-loading",
    ".nx-error",
    "@keyframes db-pulse",
    "@media (prefers-reduced-motion: reduce)",
  ]);
  const layout = await requireText("apps/web/app/(dashboard)/layout.tsx", [
    "className=\"nx-shell\"",
    "className=\"nx-page\"",
    "sidebarRef",
    ".inert",
    "aria-hidden",
  ]);
  const routeMarkers = [
    ["apps/web/app/(dashboard)/dashboard/page.tsx", ["className=\"db-page\"", "className=\"db-stat-grid\"", "className=\"db-flow\"", "className=\"db-empty\""]],
    ["apps/web/app/(dashboard)/today/page.tsx", ["Что записать сегодня", "/content/new"]],
    ["apps/web/app/(dashboard)/orders/page.tsx", ["Возможности спроса", "searchParams.status"]],
    ["apps/web/app/(dashboard)/content/page.tsx", ["Контент", "/content/new"]],
    ["apps/web/app/(dashboard)/leads/page.tsx", ["Заявки", "/leads"]],
    ["apps/web/app/(dashboard)/local-sales/page.tsx", ["Local Sales OS"]],
    ["apps/web/app/(dashboard)/marketing-os/page.tsx", ["Marketing OS"]],
    ["apps/web/app/(dashboard)/agency/page.tsx", ["Agencies / Demand API"]],
    ["apps/web/app/(dashboard)/team/page.tsx", ["Управление командой"]],
    ["apps/web/app/(dashboard)/api-keys/page.tsx", ["API-ключи"]],
    ["apps/web/app/(dashboard)/profile/page.tsx", ["Профиль"]],
    ["apps/web/app/(dashboard)/analytics/page.tsx", ["Аналитика"]],
    ["apps/web/app/(dashboard)/billing/page.tsx", ["Биллинг"]],
    ["apps/web/app/(dashboard)/content/new/page.tsx", ["Запись ответа"]],
  ];
  for (const [path, markers] of routeMarkers) await requireText(path, markers);
  for (const path of [
    "apps/web/app/(dashboard)/content/loading.tsx",
    "apps/web/app/(dashboard)/dashboard/loading.tsx",
    "apps/web/app/(dashboard)/leads/loading.tsx",
    "apps/web/app/(dashboard)/orders/loading.tsx",
    "apps/web/app/(dashboard)/profile/loading.tsx",
  ]) await requireText(path, ["animate-pulse"]);
  const dashboard = await readFile("apps/web/app/(dashboard)/dashboard/page.tsx", "utf8");
  for (const pattern of ["bg-blue-600", "rounded-xl", "shadow-sm", "<Card>", "<Badge"]) {
    if (dashboard.includes(pattern)) fail("apps/web/app/(dashboard)/dashboard/page.tsx", `generic overview primitive remains: ${pattern}`, "use the approved Result Room operating-surface primitives");
  }
  if (!layout.includes("sidebarRef.current.inert")) fail("apps/web/app/(dashboard)/layout.tsx", "mobile sidebar inert state is not set imperatively", "set the native inert property after hydration");
  await verifyG005BrowserEvidence();
  if (!process.exitCode) runProductionBuild({ includeOfflineInstall: true });
} else if (unit === "G-006") {
  const css = await requireText("apps/web/app/globals.css", [
    ".catalog-shell",
    ".cat-header",
    ".catalog-main",
    ".cat-footer",
    ".cat-mobile-menu",
    "@keyframes cat-reveal",
    "@media (prefers-reduced-motion: reduce)",
  ]);
  const shell = await requireText("apps/web/components/catalog/catalog-shell.tsx", [
    "CatalogHeader",
    "CatalogFooter",
    "cat-menu-button",
    "cat-mobile-menu",
  ]);
  const routeMarkers = [
    ["apps/web/app/experts/page.tsx", ["catalog-shell catalog-index", "CatalogHeader active=\"experts\"", "catalog-main", "CatalogFooter"]],
    ["apps/web/app/experts/[slug]/page.tsx", ["catalog-shell catalog-profile", "CatalogHeader active=\"experts\"", "catalog-main", "CatalogFooter"]],
    ["apps/web/app/experts/[slug]/[articleSlug]/page.tsx", ["catalog-shell catalog-article", "CatalogHeader active=\"articles\"", "catalog-main", "CatalogFooter"]],
    ["apps/web/app/niches/[slug]/page.tsx", ["catalog-shell catalog-niche", "CatalogHeader active=\"niches\"", "catalog-main", "CatalogFooter"]],
    ["apps/web/app/questions/page.tsx", ["catalog-shell catalog-questions", "CatalogHeader active=\"questions\"", "catalog-main", "CatalogFooter"]],
    ["apps/web/app/questions/[slug]/page.tsx", ["catalog-shell catalog-question", "CatalogHeader active=\"questions\"", "catalog-main", "CatalogFooter"]],
    ["apps/web/app/track/[token]/page.tsx", ["catalog-shell catalog-track", "CatalogHeader", "catalog-track-main", "CatalogFooter"]],
  ];
  for (const [path, markers] of routeMarkers) {
    const text = await requireText(path, markers);
    for (const pattern of ["min-h-screen bg-white", "<header className=\"border-b bg-white\""]) {
      if (text.includes(pattern)) fail(path, `legacy public shell primitive remains: ${pattern}`, "use the shared Signal Room catalog shell");
    }
  }
  await verifyG006BrowserEvidence();
  if (!process.exitCode) runProductionBuild({ includeOfflineInstall: true });
} else if (unit === "G-007") {
  const css = await requireText("apps/web/app/globals.css", [
    ".nx-focus-ring:focus-visible",
    ".sr-header",
    ".cat-header",
    ".id-header",
    "@media (prefers-reduced-motion: reduce)",
  ]);
  const layout = await requireText("apps/web/app/(dashboard)/layout.tsx", ["sidebarRef", ".inert", "aria-hidden"]);
  const auth = await requireText("apps/web/components/auth/auth-frame.tsx", ["id-site", "id-header", "id-panel", "aria-label"]);
  const routeMarkers = [
    ["apps/web/components/marketing/nav.tsx", ["sr-header", "MarketingHeader", "sr-footer"]],
    ["apps/web/app/(marketing)/page.tsx", ["sr-site", "sr-hero"]],
    ["apps/web/app/(marketing)/for-business/page.tsx", ["sr-site"]],
    ["apps/web/app/(marketing)/how-it-works/page.tsx", ["sr-site"]],
    ["apps/web/app/(marketing)/launch/page.tsx", ["sr-site"]],
    ["apps/web/app/(marketing)/pricing/page.tsx", ["sr-site", "MarketingHeader"]],
    ["apps/web/app/(marketing)/for-agencies/page.tsx", ["sr-site"]],
    ["apps/web/app/experts/page.tsx", ["catalog-shell", "CatalogHeader"]],
    ["apps/web/app/questions/page.tsx", ["catalog-shell", "CatalogHeader"]],
    ["apps/web/app/(auth)/login/page.tsx", ["AuthFrame"]],
    ["apps/web/app/(auth)/register/page.tsx", ["AuthFrame"]],
    ["apps/web/app/(dashboard)/dashboard/page.tsx", ["db-page", "db-flow"]],
  ];
  for (const [path, markers] of routeMarkers) await requireText(path, markers);
  await verifyG007BrowserEvidence();
  if (!process.exitCode) runProductionBuild({ includeOfflineInstall: true });
} else {
  fail("scripts/verify-professional-design.mjs", `unit ${unit} has no implemented oracle yet`, "implement the unit-specific checks before activation");
}
