#!/usr/bin/env node

const { execFileSync } = require("child_process");
const { performance } = require("perf_hooks");

const baseUrl = (process.env.AEO_SITE_URL || "https://neuroexpertise.ru").replace(/\/$/, "");
const strict = process.argv.includes("--strict");
const ttfbWarnMs = Number(process.env.AEO_TTFB_WARN_MS || 500);
const fetchTimeoutMs = Number(process.env.AEO_FETCH_TIMEOUT_MS || 2500);
const curlUserAgent = process.env.AEO_CURL_USER_AGENT || "Mozilla/5.0 (AEO smoke explicit documented fallback)";
const curlAttempts = Number(process.env.AEO_CURL_ATTEMPTS || 3);

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
  const url = `${baseUrl}${path}`;
  const headers = {
    "user-agent": "GPTBot",
    ...(init.headers || {}),
  };
  let response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
  try {
    response = await fetch(url, {
      ...init,
      headers,
      redirect: "manual",
      signal: controller.signal,
    });
  } catch (error) {
    return curlTimedFetch(path, url, headers, started, error);
  } finally {
    clearTimeout(timeout);
  }
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

function curlTimedFetch(path, url, headers, started, fetchError) {
  const args = [
    "-sk",
    "-L",
    "--max-time",
    "30",
    "-w",
    "\\n%{http_code}",
    "-A",
    curlUserAgent,
    url,
  ];

  let lastCurlError;
  for (let attempt = 1; attempt <= curlAttempts; attempt += 1) {
    try {
    const curlBin = process.platform === "win32" ? "curl.exe" : "curl";
    const output = execFileSync(curlBin, args, {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    const finished = performance.now();
    const splitAt = output.lastIndexOf("\n");
    const text = splitAt >= 0 ? output.slice(0, splitAt) : output;
    const status = splitAt >= 0 ? Number(output.slice(splitAt + 1)) : 0;
    return {
      path,
      status,
      location: null,
      ttfbMs: Math.round(finished - started),
      totalMs: Math.round(finished - started),
      text,
    };
    } catch (curlError) {
      lastCurlError = curlError;
      if (attempt < curlAttempts) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
      }
    }
  }
  lastCurlError.message = `explicit documented curl fallback failed for ${path}: ${lastCurlError.message}; original fetch error: ${fetchError.message}`;
  throw lastCurlError;
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
