import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const SITEMAP_REVALIDATE_SECONDS = 3600;
export const SITEMAP_STALE_SECONDS = 86400;
export const SITEMAP_PAGE_SIZE = 1000;

export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru").replace(/\/$/, "");

export type SitemapKind = "static" | "experts" | "questions" | "niches" | "articles";

export interface SitemapUrl {
  loc: string;
  lastmod?: string | null;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

export interface SitemapIndexEntry {
  loc: string;
  lastmod?: string | null;
}

export const SITEMAP_KINDS: Array<{ kind: SitemapKind; priority: number }> = [
  { kind: "static", priority: 1 },
  { kind: "experts", priority: 0.7 },
  { kind: "questions", priority: 0.6 },
  { kind: "niches", priority: 0.6 },
  { kind: "articles", priority: 0.9 },
];

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isoDate(value?: string | null): string {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function sitemapCacheControl(): string {
  return `public, max-age=0, s-maxage=${SITEMAP_REVALIDATE_SECONDS}, stale-while-revalidate=${SITEMAP_STALE_SECONDS}`;
}

export function sitemapXmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": sitemapCacheControl(),
      "X-Robots-Tag": "noindex",
    },
  });
}

export function renderSitemapIndex(entries: SitemapIndexEntry[]): string {
  const rows = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(isoDate(entry.lastmod))}</lastmod>` : "";
      return `  <sitemap>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}\n  </sitemap>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</sitemapindex>\n`;
}

export function renderUrlSet(urls: SitemapUrl[]): string {
  const rows = urls
    .map((url) => {
      const parts = [`    <loc>${escapeXml(url.loc)}</loc>`];
      if (url.lastmod) parts.push(`    <lastmod>${escapeXml(isoDate(url.lastmod))}</lastmod>`);
      if (url.changefreq) parts.push(`    <changefreq>${url.changefreq}</changefreq>`);
      if (typeof url.priority === "number") parts.push(`    <priority>${url.priority.toFixed(1)}</priority>`);
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`;
}

async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += SITEMAP_PAGE_SIZE) {
    const to = from + SITEMAP_PAGE_SIZE - 1;
    const { data, error } = await buildQuery(from, to);
    if (error) throw error;

    const page = data ?? [];
    rows.push(...page);
    if (page.length < SITEMAP_PAGE_SIZE) break;
  }

  return rows;
}

export async function getSitemapUrls(kind: SitemapKind): Promise<SitemapUrl[]> {
  const now = new Date().toISOString();

  if (kind === "static") {
    return [
      { loc: APP_URL, lastmod: now, changefreq: "weekly", priority: 1 },
      { loc: `${APP_URL}/experts`, lastmod: now, changefreq: "daily", priority: 0.9 },
      { loc: `${APP_URL}/find-expert`, lastmod: now, changefreq: "weekly", priority: 0.8 },
      { loc: `${APP_URL}/audit`, lastmod: now, changefreq: "monthly", priority: 0.8 },
      // G-013: публичный пример отчёта — proof-контент для AEO.
      { loc: `${APP_URL}/audit/example`, lastmod: now, changefreq: "monthly", priority: 0.8 },
      { loc: `${APP_URL}/scan`, lastmod: now, changefreq: "monthly", priority: 0.8 },
      { loc: `${APP_URL}/for-experts`, lastmod: now, changefreq: "monthly", priority: 0.7 },
      { loc: `${APP_URL}/for-business`, lastmod: now, changefreq: "monthly", priority: 0.7 },
      { loc: `${APP_URL}/how-it-works`, lastmod: now, changefreq: "monthly", priority: 0.6 },
      { loc: `${APP_URL}/questions`, lastmod: now, changefreq: "daily", priority: 0.7 },
      { loc: `${APP_URL}/compare`, lastmod: now, changefreq: "monthly", priority: 0.5 },
      { loc: `${APP_URL}/pricing`, lastmod: now, changefreq: "monthly", priority: 0.5 },
      { loc: `${APP_URL}/pay`, lastmod: now, changefreq: "monthly", priority: 0.4 },
    ];
  }

  const supabase = getAdmin();

  if (kind === "experts") {
    const rows = await fetchAllRows<{ slug: string | null; updated_at: string | null }>((from, to) =>
      supabase
        .from("profiles")
        .select("slug, updated_at")
        .eq("is_published", true)
        .not("slug", "is", null)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .range(from, to),
    );

    return rows
      .filter((row) => row.slug)
      .map((row) => ({
        loc: `${APP_URL}/experts/${row.slug}`,
        lastmod: row.updated_at,
        changefreq: "weekly",
        priority: 0.7,
      }));
  }

  if (kind === "questions") {
    const rows = await fetchAllRows<{ slug: string | null; updated_at: string | null }>((from, to) =>
      supabase
        .from("questions")
        .select("slug, updated_at")
        .eq("is_active", true)
        .not("slug", "is", null)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .range(from, to),
    );

    return rows
      .filter((row) => row.slug)
      .map((row) => ({
        loc: `${APP_URL}/questions/${row.slug}`,
        lastmod: row.updated_at,
        changefreq: "weekly",
        priority: 0.6,
      }));
  }

  if (kind === "niches") {
    const rows = await fetchAllRows<{ slug: string | null; created_at: string | null }>((from, to) =>
      supabase
        .from("niches")
        .select("slug, created_at")
        .eq("is_active", true)
        .not("slug", "is", null)
        .order("created_at", { ascending: false, nullsFirst: false })
        .range(from, to),
    );

    return rows
      .filter((row) => row.slug)
      .map((row) => ({
        loc: `${APP_URL}/niches/${row.slug}`,
        lastmod: row.created_at,
        changefreq: "weekly",
        priority: 0.6,
      }));
  }

  const rows = await fetchAllRows<{
    slug: string | null;
    updated_at: string | null;
    profiles: { slug: string | null } | Array<{ slug: string | null }> | null;
  }>((from, to) =>
    supabase
      .from("content_packages")
      .select("slug, updated_at, profiles!inner(slug)")
      .eq("status", "published")
      .not("slug", "is", null)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .range(from, to),
  );

  const urls: SitemapUrl[] = [];

  for (const row of rows) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const expertSlug = profile?.slug;
    if (!expertSlug || !row.slug) continue;

    urls.push({
      loc: `${APP_URL}/experts/${expertSlug}/${row.slug}`,
      lastmod: row.updated_at,
      changefreq: "monthly",
      priority: 0.9,
    });
  }

  return urls;
}
