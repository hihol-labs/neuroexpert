#!/usr/bin/env node

const fs = require("fs");

const BOT_PATTERNS = [
  ["OAI-SearchBot", /OAI-SearchBot/i],
  ["ChatGPT-User", /ChatGPT-User/i],
  ["GPTBot", /GPTBot/i],
  ["Claude-SearchBot", /Claude-SearchBot/i],
  ["Claude-User", /Claude-User/i],
  ["ClaudeBot", /ClaudeBot/i],
  ["PerplexityBot", /PerplexityBot/i],
  ["CCBot", /CCBot/i],
  ["Google-Extended", /Google-Extended/i],
  ["YandexBot", /YandexBot/i],
];

const AI_REFERRERS = [
  /chat\.openai\.com/i,
  /chatgpt\.com/i,
  /perplexity\.ai/i,
  /claude\.ai/i,
  /copilot\.microsoft\.com/i,
];

function readInput() {
  const file = process.argv.find((arg) => !arg.startsWith("-") && arg !== process.argv[0] && arg !== process.argv[1]);
  if (file) return fs.readFileSync(file, "utf8");
  return fs.readFileSync(0, "utf8");
}

function detectBot(line) {
  for (const [name, pattern] of BOT_PATTERNS) {
    if (pattern.test(line)) return name;
  }
  return null;
}

function hasAiReferrer(line) {
  return AI_REFERRERS.some((pattern) => pattern.test(line));
}

function parseAccessLine(line) {
  const request = line.match(/"([A-Z]+)\s+([^"\s]+)\s+HTTP\/[^"]+"/);
  const status = line.match(/"\s+(\d{3})\s+/);
  const quoted = [...line.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  return {
    method: request?.[1] ?? "UNKNOWN",
    path: request?.[2] ?? "UNKNOWN",
    status: status?.[1] ?? "000",
    userAgent: quoted.at(-1) ?? "",
    referrer: quoted.length >= 2 ? quoted.at(-2) ?? "" : "",
  };
}

function increment(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function topEntries(map, limit = 20) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

const lines = readInput().split(/\r?\n/).filter(Boolean);
const byBot = {};
const byPath = {};
const byStatus = {};
const aiReferrers = {};
const rows = [];
let botHits = 0;
let aiReferrerHits = 0;

for (const line of lines) {
  const bot = detectBot(line);
  const referrerHit = hasAiReferrer(line);
  if (!bot && !referrerHit) continue;

  const parsed = parseAccessLine(line);

  if (bot) {
    botHits += 1;
    increment(byBot, bot);
    increment(byPath, `${bot} ${parsed.method} ${parsed.path}`);
    increment(byStatus, `${bot} ${parsed.status}`);
    rows.push({
      bot_name: bot,
      method: parsed.method,
      path: parsed.path,
      status_code: Number(parsed.status) || null,
      user_agent: parsed.userAgent,
      referrer: parsed.referrer || null,
      source: "access_log",
      collected_at: new Date().toISOString(),
    });
  }

  if (referrerHit) {
    aiReferrerHits += 1;
    increment(aiReferrers, parsed.referrer || "unknown");
  }
}

const report = {
  scanned_lines: lines.length,
  ai_bot_hits: botHits,
  ai_referrer_hits: aiReferrerHits,
  bots: topEntries(byBot),
  statuses: topEntries(byStatus),
  paths: topEntries(byPath),
  referrers: topEntries(aiReferrers),
  generated_at: new Date().toISOString(),
};

async function pushRows() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to use --push");
  }
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const response = await fetch(`${supabaseUrl}/rest/v1/ai_crawler_logs`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(chunk),
    });
    if (!response.ok) {
      throw new Error(`Supabase insert failed: ${response.status} ${await response.text()}`);
    }
  }
}

async function main() {
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
  console.log("AI crawler access-log report");
  console.log("----------------------------");
  console.log(`Scanned lines: ${report.scanned_lines}`);
  console.log(`AI bot hits: ${report.ai_bot_hits}`);
  console.log(`AI referrer hits: ${report.ai_referrer_hits}`);
  console.log("\nBots:");
  for (const row of report.bots) console.log(`  ${row.key}: ${row.count}`);
  console.log("\nStatuses:");
  for (const row of report.statuses) console.log(`  ${row.key}: ${row.count}`);
  console.log("\nTop paths:");
  for (const row of report.paths) console.log(`  ${row.key}: ${row.count}`);
  console.log("\nAI referrers:");
  for (const row of report.referrers) console.log(`  ${row.key}: ${row.count}`);
  }

  if (process.argv.includes("--push")) {
    await pushRows();
    console.log(`\nInserted ${rows.length} rows into ai_crawler_logs.`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
