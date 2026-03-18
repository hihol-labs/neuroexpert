// Яндекс Кью — парсинг популярных вопросов через поиск

export async function fetchYandexKyuQuestions(keyword: string): Promise<string[]> {
  // Яндекс Кью не имеет публичного API
  // Используем SerpAPI для поиска вопросов на yandex.ru/q/
  const serpApiKey = process.env.SERPAPI_KEY;
  if (!serpApiKey) {
    return [];
  }

  try {
    const url = new URL("https://serpapi.com/search");
    url.searchParams.set("api_key", serpApiKey);
    url.searchParams.set("engine", "yandex");
    url.searchParams.set("text", `site:yandex.ru/q ${keyword}`);
    url.searchParams.set("lang", "ru");
    url.searchParams.set("lr", "213"); // Moscow

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results = data.organic_results as Array<{ title: string; link: string }> | undefined;

    if (!results?.length) return [];

    // Extract question text from titles (Яндекс Кью titles are usually questions)
    return results
      .filter((r) => r.link?.includes("yandex.ru/q/") || r.link?.includes("yandex.ru/Q/"))
      .map((r) => r.title.replace(/\s*[-–—|].*$/, "").trim())
      .filter((t) =>
        t.length > 10 &&
        (t.includes("?") || /^(как|почему|можно|что|когда|сколько|какой)/i.test(t)),
      )
      .slice(0, 10);
  } catch (err) {
    console.error(`[yandex-kyu] Failed for "${keyword}":`, err instanceof Error ? err.message : err);
    return [];
  }
}
