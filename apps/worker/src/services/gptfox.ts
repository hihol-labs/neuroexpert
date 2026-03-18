// GptFox.io — трекинг позиций бренда в ChatGPT
// API docs: gptfox.io/api

const GPTFOX_API_KEY = process.env.GPTFOX_API_KEY || "";
const GPTFOX_BASE_URL = process.env.GPTFOX_BASE_URL || "https://api.gptfox.io/v1";

export interface GptFoxPosition {
  query: string;
  position: number | null; // null = not found
  mentioned: boolean;
  context: string;
  competitors: Array<{ name: string; position: number }>;
  checked_at: string;
}

export interface GptFoxReport {
  brand: string;
  avg_position: number | null;
  visibility_score: number; // 0-100
  positions: GptFoxPosition[];
}

export async function fetchChatGPTPositions(
  brand: string,
  queries: string[],
): Promise<GptFoxReport | null> {
  if (!GPTFOX_API_KEY) {
    console.warn("[gptfox] GPTFOX_API_KEY not set, skipping");
    return null;
  }

  try {
    const res = await fetch(`${GPTFOX_BASE_URL}/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GPTFOX_API_KEY}`,
      },
      body: JSON.stringify({
        brand,
        queries: queries.slice(0, 50), // Max 50 queries per request
        lang: "ru",
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      console.error(`[gptfox] API error: ${res.status}`);
      return null;
    }

    const data = await res.json();

    const positions: GptFoxPosition[] = (data.results ?? []).map(
      (r: Record<string, unknown>) => ({
        query: r.query as string,
        position: (r.position as number) ?? null,
        mentioned: r.mentioned as boolean ?? false,
        context: (r.context as string ?? "").slice(0, 500),
        competitors: (r.competitors as Array<{ name: string; position: number }>) ?? [],
        checked_at: r.checked_at as string ?? new Date().toISOString(),
      }),
    );

    const mentionedCount = positions.filter((p) => p.mentioned).length;
    const positionsWithValue = positions.filter((p) => p.position !== null);
    const avgPosition =
      positionsWithValue.length > 0
        ? positionsWithValue.reduce((s, p) => s + (p.position ?? 0), 0) /
          positionsWithValue.length
        : null;

    return {
      brand,
      avg_position: avgPosition ? Math.round(avgPosition * 10) / 10 : null,
      visibility_score: Math.round((mentionedCount / Math.max(positions.length, 1)) * 100),
      positions,
    };
  } catch (err) {
    console.error("[gptfox] Error:", err instanceof Error ? err.message : err);
    return null;
  }
}
