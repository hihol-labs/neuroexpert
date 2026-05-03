// XMLRiver Wordstat API client

// XMLRIVER_USER_ID + XMLRIVER_API_KEY — официальные имена в .env.example.
// Старые XMLRIVER_USER / XMLRIVER_KEY поддерживаются как fallback для обратной совместимости.
const XMLRIVER_USER = process.env.XMLRIVER_USER_ID || process.env.XMLRIVER_USER || "";
const XMLRIVER_KEY = process.env.XMLRIVER_API_KEY || process.env.XMLRIVER_KEY || "";
const XMLRIVER_WORDSTAT_URL =
  process.env.XMLRIVER_WORDSTAT_URL || "https://xmlriver.com/wordstat/json";
const MIN_VOLUME = Number(process.env.WORDSTAT_MIN_VOLUME || 1000);
const REQUEST_TIMEOUT_MS = Number(process.env.WORDSTAT_TIMEOUT_MS || 90_000);

// Слова-маркеры вопросов
const QUESTION_MARKERS = ["как", "почему", "можно ли", "что делать", "когда", "сколько", "какой", "чем", "зачем", "нужно ли", "стоит ли"];

export interface WordstatResult {
  query: string;
  volume: number;
}

interface XmlRiverWordstatItem {
  phrase?: string;
  number?: string | number;
}

interface XmlRiverWordstatResponse {
  content?: {
    includingPhrases?: {
      items?: XmlRiverWordstatItem[];
    };
    phrasesAssociations?: {
      items?: XmlRiverWordstatItem[];
    };
  };
}

export async function fetchWordstat(keyword: string): Promise<WordstatResult[]> {
  if (!XMLRIVER_USER || !XMLRIVER_KEY) {
    console.warn("[wordstat] XMLRIVER_USER/KEY not set, returning empty");
    return [];
  }

  const url = new URL(XMLRIVER_WORDSTAT_URL);
  url.searchParams.set("user", XMLRIVER_USER);
  url.searchParams.set("key", XMLRIVER_KEY);
  url.searchParams.set("query", keyword);
  url.searchParams.set("page", "1");
  url.searchParams.set("pagetype", "words");

  const regions = process.env.WORDSTAT_REGIONS;
  if (regions) url.searchParams.set("regions", regions);

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`XMLRiver API error: ${res.status} ${res.statusText}`);
  }

  const body = await res.text();
  return parseWordstatBody(body);
}

function parseWordstatBody(body: string): WordstatResult[] {
  try {
    return parseWordstatJson(JSON.parse(body) as XmlRiverWordstatResponse);
  } catch {
    return parseWordstatXml(body);
  }
}

function parseWordstatJson(payload: XmlRiverWordstatResponse): WordstatResult[] {
  const items = [
    ...(payload.content?.includingPhrases?.items ?? []),
    ...(payload.content?.phrasesAssociations?.items ?? []),
  ];

  return normalizeResults(
    items
      .filter((item) => item.phrase && item.number !== undefined)
      .map((item) => ({
        query: String(item.phrase).trim().toLowerCase(),
        volume: parseWordstatNumber(item.number ?? 0),
      })),
  );
}

function parseWordstatXml(xml: string): WordstatResult[] {
  const results: WordstatResult[] = [];

  const keywordPattern =
    /<keyword>\s*<value>([^<]+)<\/value>\s*<number>([\d\s]+)<\/number>\s*<\/keyword>/g;
  for (const match of xml.matchAll(keywordPattern)) {
    results.push({
      query: match[1].trim().toLowerCase(),
      volume: parseWordstatNumber(match[2]),
    });
  }

  if (results.length === 0) {
    const itemPattern =
      /"phrase"\s*:\s*"([^"]+)"[\s\S]*?"number"\s*:\s*"?([\d\s]+)"?/g;
    for (const match of xml.matchAll(itemPattern)) {
      results.push({
        query: match[1].trim().toLowerCase(),
        volume: parseWordstatNumber(match[2]),
      });
    }
  }

  return normalizeResults(results);
}

function normalizeResults(results: WordstatResult[]): WordstatResult[] {
  const byQuery = new Map<string, number>();
  for (const result of results) {
    if (!result.query || result.volume < MIN_VOLUME || !isQuestion(result.query)) {
      continue;
    }

    const existing = byQuery.get(result.query);
    if (!existing || existing < result.volume) {
      byQuery.set(result.query, result.volume);
    }
  }

  return Array.from(byQuery.entries())
    .map(([query, volume]) => ({ query, volume }))
    .sort((a, b) => b.volume - a.volume);
}

function parseWordstatNumber(value: string | number): number {
  if (typeof value === "number") return value;
  return Number(value.replace(/\s/g, "")) || 0;
}

function isQuestion(text: string): boolean {
  return QUESTION_MARKERS.some((marker) => text.includes(marker));
}
