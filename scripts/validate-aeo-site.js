#!/usr/bin/env node

const { performance } = require("perf_hooks");

const baseUrl = (process.env.AEO_SITE_URL || "https://neuroexpertise.ru").replace(/\/$/, "");
const strict = process.argv.includes("--strict");
const ttfbWarnMs = Number(process.env.AEO_TTFB_WARN_MS || 500);

const requiredRobotsTokens = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "CCBot",
  "YandexBot",
  "Sitemap:",
];

async function timedFetch(path, init = {}) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "user-agent": "GPTBot",
      ...(init.headers || {}),
    },
    redirect: "manual",
  });
  const headersAt = performance.now();
  const text = await response.text();
  const finished = performance.now();
  return {
    path,
    status: response.status,
    location: response.headers.get("location"),
    ttfbMs: Math.round(headersAt - started),
    totalMs: Math.round(finished - started),
    text,
  };
}

async function warmTimedFetch(path, init = {}) {
  await timedFetch(path, init);
  return timedFetch(path, init);
}

function countJsonLd(html) {
  return (html.match(/application\/ld\+json/g) || []).length;
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
}

function locToPath(loc) {
  try {
    const url = new URL(loc);
    return `${url.pathname}${url.search}`;
  } catch {
    if (loc.startsWith("/")) return loc;
    return null;
  }
}

function result(name, ok, detail, severity = "error") {
  return { name, ok, detail, severity };
}

async function main() {
  const checks = [];

  const robots = await warmTimedFetch("/robots.txt");
  checks.push(result("robots.txt status", robots.status === 200, `status=${robots.status}`));
  for (const token of requiredRobotsTokens) {
    checks.push(result(`robots contains ${token}`, robots.text.includes(token), token));
  }

  const llms = await warmTimedFetch("/llms.txt");
  checks.push(result("llms.txt public", llms.status === 200, `status=${llms.status} location=${llms.location || "-"}`));
  checks.push(result("llms.txt has API links", /api\/v1\/docs/.test(llms.text), "api/v1/docs"));

  const sitemap = await warmTimedFetch("/sitemap.xml");
  const sitemapIndexLocs = sitemap.status === 200 ? extractLocs(sitemap.text) : [];
  const segmentPaths = sitemapIndexLocs
    .map(locToPath)
    .filter((path) => path && path.startsWith("/sitemaps/"));
  const locs = [];

  checks.push(result("sitemap status", sitemap.status === 200, `status=${sitemap.status}`));
  checks.push(result("sitemap is index", /<sitemapindex\b/.test(sitemap.text), `${sitemapIndexLocs.length} segment links`));
  checks.push(result("sitemap has segments", segmentPaths.length >= 5, `${segmentPaths.length} segments`));
  checks.push(result("sitemap TTFB", sitemap.ttfbMs <= ttfbWarnMs, `${sitemap.ttfbMs}ms`, "warn"));

  for (const segmentPath of segmentPaths) {
    const segment = await warmTimedFetch(segmentPath);
    const segmentLocs = segment.status === 200 ? extractLocs(segment.text) : [];
    locs.push(...segmentLocs);
    checks.push(result(`${segmentPath} status`, segment.status === 200, `status=${segment.status}`));
    checks.push(result(`${segmentPath} urlset`, /<urlset\b/.test(segment.text), `${segmentLocs.length} urls`));
    checks.push(result(`${segmentPath} TTFB`, segment.ttfbMs <= ttfbWarnMs, `${segment.ttfbMs}ms`, "warn"));
  }

  checks.push(result("sitemap has urls", locs.length > 0, `${locs.length} urls`));

  const corePaths = ["/", "/experts", "/questions", "/pricing", "/for-experts", "/for-business"];
  const sampleArticle = locToPath(locs.find((url) => /\/experts\/[^/]+\/[^/]+$/.test(url)) || "");
  const sampleQuestion = locToPath(locs.find((url) => /\/questions\/[^/]+$/.test(url)) || "");
  if (sampleArticle) corePaths.push(sampleArticle);
  if (sampleQuestion) corePaths.push(sampleQuestion);

  for (const path of corePaths) {
    const page = await warmTimedFetch(path);
    const jsonLdCount = countJsonLd(page.text);
    checks.push(result(`${path} status`, page.status === 200, `status=${page.status}`));
    checks.push(result(`${path} SSR text`, /НейроЭксперт|эксперт|клиент|вопрос/i.test(page.text), "SSR content"));
    checks.push(result(`${path} JSON-LD`, jsonLdCount > 0, `${jsonLdCount} blocks`));
    checks.push(result(`${path} TTFB`, page.ttfbMs <= ttfbWarnMs, `${page.ttfbMs}ms`, "warn"));
  }

  let hasFailure = false;
  let hasStrictFailure = false;
  for (const check of checks) {
    const prefix = check.ok ? "OK" : check.severity === "warn" ? "WARN" : "FAIL";
    console.log(`${prefix} ${check.name}: ${check.detail}`);
    if (!check.ok && check.severity !== "warn") hasFailure = true;
    if (!check.ok && (strict || check.severity !== "warn")) hasStrictFailure = true;
  }

  if (hasFailure || hasStrictFailure) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
