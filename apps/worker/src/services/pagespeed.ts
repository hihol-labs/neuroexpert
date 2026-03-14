const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY || "";

export interface CWVMetrics {
  lcp: number | null;
  fcp: number | null;
  cls: number | null;
  performanceScore: number | null;
}

export async function checkPageSpeed(url: string): Promise<CWVMetrics | null> {
  const apiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  apiUrl.searchParams.set("url", url);
  apiUrl.searchParams.set("strategy", "mobile");
  apiUrl.searchParams.set("category", "performance");
  if (PAGESPEED_API_KEY) {
    apiUrl.searchParams.set("key", PAGESPEED_API_KEY);
  }

  try {
    const res = await fetch(apiUrl.toString(), { signal: AbortSignal.timeout(60000) });
    if (!res.ok) {
      console.error(`[pagespeed] API error ${res.status} for ${url}`);
      return null;
    }

    const data = await res.json();
    const audits = data.lighthouseResult?.audits ?? {};
    const score = data.lighthouseResult?.categories?.performance?.score;

    return {
      lcp: audits["largest-contentful-paint"]?.numericValue ?? null,
      fcp: audits["first-contentful-paint"]?.numericValue ?? null,
      cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
      performanceScore: score != null ? Math.round(score * 100) : null,
    };
  } catch (err) {
    console.error(`[pagespeed] Error for ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}
