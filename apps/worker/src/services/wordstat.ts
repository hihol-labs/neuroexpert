// XMLRiver Wordstat API client

const XMLRIVER_USER = process.env.XMLRIVER_USER || "";
const XMLRIVER_KEY = process.env.XMLRIVER_KEY || "";
const MIN_VOLUME = 1000;

// Слова-маркеры вопросов
const QUESTION_MARKERS = ["как", "почему", "можно ли", "что делать", "когда", "сколько", "какой", "чем", "зачем", "нужно ли", "стоит ли"];

export interface WordstatResult {
  query: string;
  volume: number;
}

export async function fetchWordstat(keyword: string): Promise<WordstatResult[]> {
  if (!XMLRIVER_USER || !XMLRIVER_KEY) {
    console.warn("[wordstat] XMLRIVER_USER/KEY not set, returning empty");
    return [];
  }

  const url = new URL("https://xmlriver.com/search_yandex/xml");
  url.searchParams.set("user", XMLRIVER_USER);
  url.searchParams.set("key", XMLRIVER_KEY);
  url.searchParams.set("query", keyword);
  url.searchParams.set("type", "wordstat");

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    throw new Error(`XMLRiver API error: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  return parseWordstatXml(xml);
}

function parseWordstatXml(xml: string): WordstatResult[] {
  const results: WordstatResult[] = [];

  // Parse <keyword><value>text</value><number>123</number></keyword>
  const keywordPattern = /<keyword>\s*<value>([^<]+)<\/value>\s*<number>(\d+)<\/number>\s*<\/keyword>/g;
  for (const match of xml.matchAll(keywordPattern)) {
    const query = match[1].trim().toLowerCase();
    const volume = parseInt(match[2], 10);

    if (volume < MIN_VOLUME) continue;
    if (!isQuestion(query)) continue;

    results.push({ query, volume });
  }

  return results.sort((a, b) => b.volume - a.volume);
}

function isQuestion(text: string): boolean {
  return QUESTION_MARKERS.some((marker) => text.includes(marker));
}
