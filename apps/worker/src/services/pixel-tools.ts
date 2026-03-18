// Pixel Tools — мониторинг упоминаний бренда в нейросетях
// API docs: pixeltools.ru/api

const PIXEL_TOOLS_API_KEY = process.env.PIXEL_TOOLS_API_KEY || "";
const PIXEL_TOOLS_BASE_URL = process.env.PIXEL_TOOLS_BASE_URL || "https://api.pixeltools.ru/v1";

export interface PixelMention {
  platform: string;
  query: string;
  mentioned: boolean;
  sentiment: "positive" | "neutral" | "negative";
  context: string;
  checked_at: string;
}

export interface PixelBrandReport {
  brand: string;
  total_mentions: number;
  positive_percent: number;
  platforms: PixelMention[];
}

export async function fetchBrandMentions(brand: string): Promise<PixelBrandReport | null> {
  if (!PIXEL_TOOLS_API_KEY) {
    console.warn("[pixel-tools] PIXEL_TOOLS_API_KEY not set, skipping");
    return null;
  }

  try {
    const res = await fetch(`${PIXEL_TOOLS_BASE_URL}/mentions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PIXEL_TOOLS_API_KEY}`,
      },
      body: JSON.stringify({ brand, lang: "ru" }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.error(`[pixel-tools] API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return {
      brand,
      total_mentions: data.total_mentions ?? 0,
      positive_percent: data.positive_percent ?? 0,
      platforms: (data.platforms ?? []).map((p: Record<string, unknown>) => ({
        platform: p.platform as string,
        query: p.query as string ?? "",
        mentioned: p.mentioned as boolean ?? false,
        sentiment: (p.sentiment as string) ?? "neutral",
        context: (p.context as string ?? "").slice(0, 500),
        checked_at: p.checked_at as string ?? new Date().toISOString(),
      })),
    };
  } catch (err) {
    console.error("[pixel-tools] Error:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function fetchBrandSentiment(brand: string): Promise<{
  positive: number;
  neutral: number;
  negative: number;
} | null> {
  if (!PIXEL_TOOLS_API_KEY) return null;

  try {
    const res = await fetch(`${PIXEL_TOOLS_BASE_URL}/sentiment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PIXEL_TOOLS_API_KEY}`,
      },
      body: JSON.stringify({ brand, lang: "ru" }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return {
      positive: data.positive ?? 0,
      neutral: data.neutral ?? 0,
      negative: data.negative ?? 0,
    };
  } catch {
    return null;
  }
}
