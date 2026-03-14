import { supabase } from "../supabase.js";

const SERPAPI_KEY = process.env.SERPAPI_KEY || "";

async function checkPosition(query: string, targetUrl: string, engine: "google" | "yandex"): Promise<number | null> {
  if (!SERPAPI_KEY) return null;

  const url = new URL("https://serpapi.com/search");
  url.searchParams.set("api_key", SERPAPI_KEY);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "20");

  if (engine === "yandex") {
    url.searchParams.set("engine", "yandex");
    url.searchParams.set("yandex_domain", "yandex.ru");
  } else {
    url.searchParams.set("engine", "google");
    url.searchParams.set("hl", "ru");
    url.searchParams.set("gl", "ru");
  }

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    const data = await res.json();

    const results = (data.organic_results ?? []) as Array<{ link?: string; position?: number }>;
    const targetDomain = new URL(targetUrl).hostname;

    for (const r of results) {
      if (r.link && r.link.includes(targetDomain)) {
        return r.position ?? null;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function handleTrackSerp(payload: Record<string, unknown>): Promise<{ tracked: number }> {
  const expertId = payload.expert_id as string;
  if (!expertId) throw new Error("expert_id is required");

  const { data: packages } = await supabase
    .from("content_packages")
    .select("id, title, published_url, questions(question_text)")
    .eq("expert_id", expertId)
    .eq("status", "published")
    .not("published_url", "is", null)
    .limit(20);

  if (!packages?.length) return { tracked: 0 };

  let tracked = 0;
  for (const pkg of packages) {
    const query = (pkg.questions as unknown as { question_text: string } | null)?.question_text ?? pkg.title ?? "";
    const url = pkg.published_url as string;
    if (!query || !url) continue;

    for (const engine of ["google", "yandex"] as const) {
      const position = await checkPosition(query, url, engine);

      await supabase.from("serp_positions").insert({
        content_id: pkg.id,
        search_engine: engine,
        query,
        position,
        url,
      });

      tracked++;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`[track_serp] Tracked ${tracked} positions for expert ${expertId}`);
  return { tracked };
}
