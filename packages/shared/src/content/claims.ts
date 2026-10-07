/**
 * R-10 (E-AUTO-20): source-backed контракт сгенерированного текста. Чистая эвристика без LLM и без ввода-вывода.
 *
 * extractClaims находит проверяемые утверждения: цифры (проценты, суммы, сроки, количества), регалии, отзывы
 * и ссылки. checkClaims ищет каждому опору в расшифровке голоса эксперта: то же число, тот же корень слова,
 * тот же домен. Утверждение без опоры попадает в unsupported - валидатор отправляет текст на переделку, гейт
 * публикации отказывает (decidePublish, код unsupported_claims).
 */
export type ClaimKind = "number" | "credential" | "review" | "link";
export interface Claim { kind: ClaimKind; text: string; key: string }
export interface ClaimSource { kind: ClaimKind; claim: string; quote: string }
export interface ClaimCheck { sources: ClaimSource[]; unsupported: Claim[] }

const URL_RE = /https?:\/\/[^\s)\]»"']+/gi;
// Число: 35 000 / 35 000 (неразрывный пробел) / 12,5 / 97
const NUMBER_RE = /(?<![\d\p{L}])(\d{1,3}(?:[  ]\d{3})+|\d+)(?:[.,]\d+)?/gu;
// Единица измерения сразу после числа: делает число фактом даже при значении до 10.
// Граница - (?!\p{L}), а не \b: в JS \b считает буквами только ASCII, и «5 лет» не распознавалось бы.
const UNIT_RE = /^\s?(%|процент\p{L}*|₽|руб\p{L}*|р\.|тыс\p{L}*|млн|млрд|коп\p{L}*|лет(?!\p{L})|год\p{L}*|мес\p{L}*|недел\p{L}*|дн\p{L}*|день|час\p{L}*|мин\p{L}*|сек\p{L}*|раза?(?!\p{L})|мг(?!\p{L})|мл(?!\p{L})|кг(?!\p{L})|г(?!\p{L})|см(?!\p{L})|мм(?!\p{L})|км(?!\p{L})|м(?!\p{L})|шт(?!\p{L}))/iu;
const LIST_MARKER_RE = /^\s*(?:#{1,6}\s*)?\d+[.)]\s/;

const CREDENTIAL_PATTERNS: Array<[RegExp, string]> = [
  [/кандидат\p{L}*\s+(?:\p{L}+\s+)?наук/giu, "кандидат"],
  [/доктор\p{L}*\s+(?:\p{L}+\s+)?наук/giu, "доктор"],
  [/профессор\p{L}*/giu, "профессор"],
  [/доцент\p{L}*/giu, "доцент"],
  [/академик\p{L}*/giu, "академик"],
  [/член\p{L}*\s+(?:\p{L}+\s+)?(?:ассоциац|обществ|союз|палат|академи|коллеги)\p{L}*/giu, "член"],
  [/сертифи\p{L}*/giu, "сертифи"],
  [/лауреат\p{L}*/giu, "лауреат"],
  [/наград\p{L}*/giu, "наград"],
  [/диплом\p{L}*/giu, "диплом"],
  [/главн\p{L}*\s+врач\p{L}*/giu, "главн"],
  [/заведующ\p{L}*/giu, "заведующ"],
  [/стаж\p{L}*/giu, "стаж"],
];

const REVIEW_WORD_RE = /отзыв\p{L}*/giu;
const REVIEW_PHRASE_RE = /(?:пациент|клиент|покупател)\p{L}*\s+(?:\p{L}+\s+){0,2}?((?:благодар|хвал|рекоменд|пишут|отмеча|говор|рассказыва|делятся|довольн)\p{L}*)/giu;

function normNumber(raw: string): string {
  return raw.replace(/[  ]/g, "").replace(",", ".");
}

function hostOf(url: string): string {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

/** Проверяемые утверждения текста в порядке появления. */
export function extractClaims(text: string): Claim[] {
  if (!text) return [];
  const claims: Claim[] = [];
  for (const m of text.matchAll(URL_RE)) {
    const host = hostOf(m[0]);
    if (host) claims.push({ kind: "link", text: m[0], key: host });
  }
  const withoutUrls = text.replace(URL_RE, " ");
  for (const line of withoutUrls.split("\n")) {
    const body = line.replace(LIST_MARKER_RE, (marker) => " ".repeat(marker.length));
    for (const m of body.matchAll(NUMBER_RE)) {
      const after = body.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 16);
      const unit = UNIT_RE.exec(after);
      const value = Number(normNumber(m[0]));
      if (!unit && !(value > 10)) continue; // «3 причины», «шаг 2» - не утверждение о факте
      claims.push({ kind: "number", text: (m[0] + (unit ? unit[0] : "")).trim(), key: normNumber(m[0]) });
    }
  }
  const lower = withoutUrls.toLowerCase();
  for (const [re, key] of CREDENTIAL_PATTERNS) {
    for (const m of lower.matchAll(re)) claims.push({ kind: "credential", text: m[0], key });
  }
  for (const m of lower.matchAll(REVIEW_WORD_RE)) claims.push({ kind: "review", text: m[0], key: "отзыв" });
  for (const m of lower.matchAll(REVIEW_PHRASE_RE)) claims.push({ kind: "review", text: m[0], key: m[1].slice(0, 6) });
  return claims;
}

/** Предложение расшифровки вокруг позиции - цитата-источник. */
function sentenceAt(transcript: string, index: number): string {
  const start = Math.max(transcript.lastIndexOf(".", index - 1), transcript.lastIndexOf("!", index - 1), transcript.lastIndexOf("?", index - 1), transcript.lastIndexOf("\n", index - 1)) + 1;
  const ends = [".", "!", "?", "\n"].map((c) => transcript.indexOf(c, index)).filter((i) => i >= 0);
  const end = ends.length ? Math.min(...ends) + 1 : transcript.length;
  return transcript.slice(start, end).trim().slice(0, 240);
}

function findSupport(claim: Claim, transcript: string, lower: string): number {
  if (claim.kind === "number") {
    for (const m of transcript.matchAll(NUMBER_RE)) if (normNumber(m[0]) === claim.key) return m.index ?? 0;
    return -1;
  }
  if (claim.kind === "review" && claim.key !== "отзыв") {
    for (const m of lower.matchAll(REVIEW_PHRASE_RE)) if (m[1].startsWith(claim.key)) return m.index ?? 0;
    return -1;
  }
  return lower.indexOf(claim.key);
}

/** sources[] - утверждения с цитатой из расшифровки; unsupported - без опоры. */
export function checkClaims(text: string, transcript: string): ClaimCheck {
  const result: ClaimCheck = { sources: [], unsupported: [] };
  const lower = (transcript || "").toLowerCase();
  for (const claim of extractClaims(text)) {
    const at = transcript ? findSupport(claim, transcript, lower) : -1;
    if (at >= 0) result.sources.push({ kind: claim.kind, claim: claim.text, quote: sentenceAt(transcript, at) });
    else result.unsupported.push(claim);
  }
  return result;
}

/** Текст всех публикуемых форматов пакета одной строкой (SEO-статья, Telegram-пост, FAQ). */
export function publishableText(pkg: { format_seo_article?: unknown; format_telegram_post?: unknown; format_faq?: unknown }): string {
  const parts: string[] = [];
  if (typeof pkg.format_seo_article === "string") parts.push(pkg.format_seo_article);
  if (typeof pkg.format_telegram_post === "string") parts.push(pkg.format_telegram_post);
  if (Array.isArray(pkg.format_faq)) {
    for (const item of pkg.format_faq) {
      const pair = item && typeof item === "object" ? (item as { question?: unknown; answer?: unknown }) : {};
      if (typeof pair.question === "string") parts.push(pair.question);
      if (typeof pair.answer === "string") parts.push(pair.answer);
    }
  }
  return parts.join("\n");
}
