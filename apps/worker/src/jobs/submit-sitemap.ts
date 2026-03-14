import { supabase } from "../supabase.js";
import { submitToBing } from "../services/bing-webmaster.js";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";
const GSC_API_KEY = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY || "";
const YANDEX_WEBMASTER_TOKEN = process.env.YANDEX_WEBMASTER_TOKEN || "";
const YANDEX_WEBMASTER_HOST_ID = process.env.YANDEX_WEBMASTER_HOST_ID || "";

export async function handleSubmitSitemap(_payload: Record<string, unknown>): Promise<{ submitted: number }> {
  // Get recently published pages (last 24h)
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const { data: pages } = await supabase
    .from("content_packages")
    .select("slug, published_url, profiles!inner(slug)")
    .eq("status", "published")
    .gte("published_at", yesterday);

  if (!pages?.length) {
    console.log("[submit_sitemap] No new pages to submit");
    return { submitted: 0 };
  }

  const urls = pages
    .map((p) => p.published_url as string || `${APP_URL}/experts/${(p.profiles as unknown as { slug: string }).slug}/${p.slug}`)
    .filter(Boolean);

  let submitted = 0;

  // Google Search Console — URL Inspection
  if (GSC_API_KEY) {
    for (const url of urls) {
      try {
        const res = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${GSC_API_KEY}` },
          body: JSON.stringify({ inspectionUrl: url, siteUrl: APP_URL }),
        });
        if (res.ok) submitted++;
      } catch (err) {
        console.error(`[submit_sitemap] GSC error for ${url}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  // Yandex Webmaster — recrawl
  if (YANDEX_WEBMASTER_TOKEN && YANDEX_WEBMASTER_HOST_ID) {
    for (const url of urls) {
      try {
        const res = await fetch(
          `https://api.webmaster.yandex.net/v4/user/me/hosts/${YANDEX_WEBMASTER_HOST_ID}/recrawl/queue`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `OAuth ${YANDEX_WEBMASTER_TOKEN}` },
            body: JSON.stringify({ url }),
          },
        );
        if (res.ok) submitted++;
      } catch (err) {
        console.error(`[submit_sitemap] Yandex error for ${url}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  // Bing Webmaster
  for (const url of urls) {
    try {
      await submitToBing(url);
      submitted++;
    } catch {
      // logged inside
    }
  }

  console.log(`[submit_sitemap] Submitted ${submitted} URLs`);
  return { submitted };
}
