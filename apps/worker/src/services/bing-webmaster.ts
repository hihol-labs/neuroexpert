const BING_API_KEY = process.env.BING_WEBMASTER_API_KEY || "";

export async function submitToBing(url: string): Promise<void> {
  if (!BING_API_KEY) return;

  try {
    const res = await fetch("https://ssl.bing.com/webmaster/api.svc/json/SubmitUrl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteUrl: new URL(url).origin,
        url,
        apikey: BING_API_KEY,
      }),
    });

    if (!res.ok) {
      console.error(`[bing] Submit failed for ${url}: ${res.status}`);
    }
  } catch (err) {
    console.error(`[bing] Error:`, err instanceof Error ? err.message : err);
  }
}
