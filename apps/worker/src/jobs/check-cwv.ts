import { supabase } from "../supabase.js";
import { checkPageSpeed } from "../services/pagespeed.js";

export async function handleCheckCwv(_payload: Record<string, unknown>): Promise<{ checked: number }> {
  const { data: pages } = await supabase
    .from("content_packages")
    .select("id, published_url")
    .eq("status", "published")
    .not("published_url", "is", null)
    .limit(30);

  if (!pages?.length) return { checked: 0 };

  let checked = 0;
  for (const page of pages) {
    const url = page.published_url as string;
    if (!url) continue;

    try {
      const metrics = await checkPageSpeed(url);
      if (!metrics) continue;

      const isPassing = (metrics.lcp ?? 9999) <= 2500 && (metrics.cls ?? 1) <= 0.1;

      await supabase.from("cwv_metrics").insert({
        content_id: page.id,
        page_url: url,
        lcp_ms: metrics.lcp,
        fcp_ms: metrics.fcp,
        cls_score: metrics.cls,
        performance_score: metrics.performanceScore,
        is_passing: isPassing,
      });

      // Alert if degraded
      if (!isPassing) {
        console.warn(`[check_cwv] Page ${url} failing CWV: LCP=${metrics.lcp}ms, CLS=${metrics.cls}`);
      }

      checked++;
    } catch (err) {
      console.error(`[check_cwv] Error for ${url}:`, err instanceof Error ? err.message : err);
    }

    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log(`[check_cwv] Checked ${checked} pages`);
  return { checked };
}
