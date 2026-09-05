// XMLRiver Wordstat API client

// XMLRIVER_USER_ID + XMLRIVER_API_KEY — официальные имена в .env.example.
// Старые XMLRIVER_USER / XMLRIVER_KEY поддерживаются как fallback для обратной совместимости.
const XMLRIVER_USER = process.env.XMLRIVER_USER_ID || process.env.XMLRIVER_USER || "";
const XMLRIVER_KEY = process.env.XMLRIVER_API_KEY || process.env.XMLRIVER_KEY || "";
const XMLRIVER_WORDSTAT_URL =
  process.env.XMLRIVER_WORDSTAT_URL || "https://xmlriver.com/wordstat/new/json";
const MIN_VOLUME = Number(process.env.WORDSTAT_MIN_VOLUME || 1000);
const MIN_WORDS = Number(process.env.WORDSTAT_MIN_WORDS || 4);
const REQUEST_TIMEOUT_MS = Number(process.env.WORDSTAT_TIMEOUT_MS || 90_000);

// Слова-маркеры вопросов
const QUESTION_MARKERS = ["как", "почему", "можно ли", "что делать", "когда", "сколько", "какой", "чем", "зачем", "нужно ли", "стоит ли"];

export interface WordstatResult {
  query: string;
  volume: number;
}

interface XmlRiverWordstatItem {
  phrase?: string;
  text?: string;
  number?: string | number;
  value?: string | number;
}

interface XmlRiverWordstatResponse {
  popular?: XmlRiverWordstatItem[];
  associations?: XmlRiverWordstatItem[];
  content?: {
    includingPhrases?: {
      items?: XmlRiverWordstatItem[];
    };
    phrasesAssociations?: {
      items?: XmlRiverWordstatItem[];
    };
  };
}

export interface WordstatOptions {
  /** Оставлять только вопросоподобные фразы (по умолчанию — да, режим экспертных ниш). */
  questionsOnly?: boolean;
  /** Порог частотности; по умолчанию WORDSTAT_MIN_VOLUME. */
  minVolume?: number;
}

/**
 * G-018b (решение владельца 2026-09-05): для локальных пар «вертикаль × город»
 * спрос в Wordstat живёт в форме фраз без вопросных слов («имплантация зубов
 * тюмень»), поэтому on_demand-сбор вызывает с { questionsOnly: false } и
 * фильтрует релевантность сам (shared pairs/isRelevantPairPhrase).
 */
export async function fetchWordstat(keyword: string, options: WordstatOptions = {}): Promise<WordstatResult[]> {
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
  return parseWordstatBody(body, options);
}

function parseWordstatBody(body: string, options: WordstatOptions = {}): WordstatResult[] {
  try {
    return parseWordstatJson(JSON.parse(body) as XmlRiverWordstatResponse, options);
  } catch {
    return parseWordstatXml(body, options);
  }
}

function parseWordstatJson(payload: XmlRiverWordstatResponse, options: WordstatOptions = {}): WordstatResult[] {
  const items = [
    ...(payload.popular ?? []),
    ...(payload.associations ?? []),
    ...(payload.content?.includingPhrases?.items ?? []),
    ...(payload.content?.phrasesAssociations?.items ?? []),
  ];

  return normalizeResults(
    items
      .filter(
        (item) =>
          (item.phrase || item.text) &&
          (item.number !== undefined || item.value !== undefined),
      )
      .map((item) => ({
        query: String(item.phrase || item.text).trim().toLowerCase(),
        volume: parseWordstatNumber(item.number ?? item.value ?? 0),
      })),
    options,
  );
}

function parseWordstatXml(xml: string, options: WordstatOptions = {}): WordstatResult[] {
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

  return normalizeResults(results, options);
}

function normalizeResults(results: WordstatResult[], options: WordstatOptions = {}): WordstatResult[] {
  const questionsOnly = options.questionsOnly ?? true;
  const minVolume = options.minVolume ?? MIN_VOLUME;
  const byQuery = new Map<string, number>();
  for (const result of results) {
    if (
      !result.query ||
      result.volume < minVolume ||
      (questionsOnly && !isQuestion(result.query))
    ) {
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
  return (
    text.split(/\s+/).filter(Boolean).length >= MIN_WORDS &&
    QUESTION_MARKERS.some((marker) => text.includes(marker))
  );
}
