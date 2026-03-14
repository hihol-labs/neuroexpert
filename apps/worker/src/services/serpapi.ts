// SerpAPI client — People Also Ask

const SERPAPI_KEY = process.env.SERPAPI_KEY || "";

export async function fetchPAA(query: string): Promise<string[]> {
  if (!SERPAPI_KEY) {
    console.warn("[serpapi] SERPAPI_KEY not set, returning empty");
    return [];
  }

  const url = new URL("https://serpapi.com/search");
  url.searchParams.set("api_key", SERPAPI_KEY);
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "ru");
  url.searchParams.set("gl", "ru");

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    console.error(`[serpapi] API error: ${res.status}`);
    return [];
  }

  const data = await res.json();
  const related = data.related_questions as Array<{ question: string }> | undefined;
  return related?.map((r) => r.question) ?? [];
}
