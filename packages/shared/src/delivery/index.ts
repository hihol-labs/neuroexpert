/** Audit Start v1: strict, detached, source-backed delivery artifact. */
export type DeliveryMode = "full" | "degraded" | "failed";
export interface ReportPlatform {
  platform: string; status: "answered" | "unavailable"; ai_response: string;
  method: string | null; gap_score: number | null;
  markers: Record<string, boolean> | null; weakness: string | null;
}
export interface ReportGap {
  id: string; source_question_id: string; question: string; search_intent: string;
  monthly_volume: number | null; estimated_monthly_volume: number | null;
  collected_at: string; collected_at_source: "question" | "pair_batch"; avg_gap_score: number | null; platforms: ReportPlatform[];
}
export interface ReportSnapshot {
  schema_version: 1; niche: string; type: "paid"; source: "wordstat";
  ran_at: string; analyzer_model: string; platforms_tried: string[]; gaps: ReportGap[];
}
const PLATFORMS = new Set(["ChatGPT", "Perplexity", "Яндекс.GPT", "GigaChat"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Invalid audit object");
  return v as Record<string, unknown>;
}
function text(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) throw new Error("Missing audit text");
  return v;
}
function timestamp(v: unknown): string {
  const s = text(v);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(s) || !Number.isFinite(Date.parse(s))) throw new Error("Invalid audit timestamp");
  return s;
}
function unavailable(platform: string): ReportPlatform {
  return {platform, status:"unavailable", ai_response:"", method:null, gap_score:null, markers:null, weakness:null};
}
export function buildReportSnapshot(input: unknown): ReportSnapshot {
  const r = object(input);
  if (r.type !== "paid" || r.source !== "wordstat" || r.schema_version !== 1) throw new Error("Invalid audit version/source");
  if (!Array.isArray(r.platforms_tried) || !r.platforms_tried.length || r.platforms_tried.some(p => !PLATFORMS.has(p))) throw new Error("Invalid platforms");
  const tried = r.platforms_tried as string[];
  if (new Set(tried).size !== tried.length) throw new Error("Duplicate platforms");
  if (!Array.isArray(r.gaps) || r.gaps.length !== 10) throw new Error("Audit requires ten question slots");
  const ids = new Set<string>(), questions = new Set<string>(), methods = new Set<string>();
  const ranAt = timestamp(r.ran_at);
  const gaps = r.gaps.map(raw => {
    const g = object(raw), id = text(g.source_question_id), question = text(g.question);
    const canonicalQuestion = question.trim().toLocaleLowerCase("ru").replace(/\s+/g, " ");
    if (!UUID.test(id) || ids.has(id) || questions.has(canonicalQuestion)) throw new Error("Invalid/duplicate source question");
    ids.add(id); questions.add(canonicalQuestion);
    const collectedAt = timestamp(g.collected_at);
    const collectedSource = g.collected_at_source ?? "question";
    if(collectedSource !== "question" && collectedSource !== "pair_batch")throw new Error("Invalid collection provenance");
    if (Date.parse(collectedAt) > Date.parse(ranAt)) throw new Error("Question collected after audit");
    const volume = g.monthly_volume;
    if (volume !== null && (typeof volume !== "number" || !Number.isFinite(volume) || volume < 0)) throw new Error("Invalid Wordstat volume");
    if (g.estimated_monthly_volume !== volume) throw new Error("Synthetic Wordstat volume");
    if (!Array.isArray(g.platforms)) throw new Error("Invalid answers");
    const seen = new Set<string>();
    const platforms = g.platforms.map(rawPlatform => {
      const p = object(rawPlatform), platform = text(p.platform);
      if (!tried.includes(platform) || seen.has(platform)) throw new Error("Unknown/duplicate answer platform");
      seen.add(platform);
      if (p.status === "unavailable") return unavailable(platform);
      if (p.status !== "answered") throw new Error("Invalid answer status");
      if (typeof p.ai_response !== "string" || !p.ai_response.trim()) return unavailable(platform);
      const method = text(p.method), markers = object(p.markers);
      const keys = ["has_expert_name", "has_specific_examples", "has_source_link", "has_specific_numbers"];
      if (keys.some(k => typeof markers[k] !== "boolean")) throw new Error("Invalid analysis markers");
      const score = p.gap_score;
      if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 10) throw new Error("Invalid gap score");
      const expected = Math.round(keys.filter(k => markers[k] === false).length * 2.5);
      if (score !== expected) throw new Error("Gap score contradicts markers");
      methods.add(method);
      return {platform, status:"answered" as const, ai_response:p.ai_response, method, gap_score:score,
        markers:Object.fromEntries(keys.map(k => [k, markers[k] as boolean])), weakness:text(p.weakness)};
    });
    const normalized = tried.map(p => platforms.find(a => a.platform === p) ?? unavailable(p));
    const answered = normalized.filter(p => p.status === "answered");
    return {id:text(g.id), source_question_id:id, question, search_intent:text(g.search_intent),
      monthly_volume:volume as number|null, estimated_monthly_volume:volume as number|null,
      collected_at:collectedAt, collected_at_source:collectedSource as "question"|"pair_batch", avg_gap_score:answered.length ? Math.round(answered.reduce((n,p)=>n+p.gap_score!,0)/answered.length) : null, platforms:normalized};
  });
  const analyzer = text(r.analyzer_model);
  const actualAnalyzer = methods.size > 1 ? "mixed" : [...methods][0];
  if (actualAnalyzer && analyzer !== actualAnalyzer) throw new Error("Analyzer provenance mismatch");
  return {schema_version:1,niche:text(r.niche),type:"paid",source:"wordstat",ran_at:ranAt,
    analyzer_model:analyzer,platforms_tried:[...tried],gaps};
}
export function decideDeliveryMode(input: unknown): DeliveryMode {
  try {
    const r = buildReportSnapshot(input);
    const answeredPlatforms = new Set<string>();
    let covered = 0, full = true;
    for (const gap of r.gaps) {
      const answers = gap.platforms.filter(p => p.status === "answered");
      if (answers.length) covered++;
      if (answers.length !== r.platforms_tried.length) full = false;
      answers.forEach(p => answeredPlatforms.add(p.platform));
    }
    if (answeredPlatforms.size < 2 || covered < 8) return "failed";
    return full ? "full" : "degraded";
  } catch { return "failed"; }
}
export function isSlaBreached(paidAt: string, now: number = Date.now()): boolean {
  const paid = Date.parse(paidAt);
  return !Number.isFinite(paid) || !Number.isFinite(now) || paid > now || now - paid >= 60 * 60 * 1000;
}
/** Only for an order that has not been delivered; caller/DB guards terminal state. */
export function decideRefund(mode: DeliveryMode, slaBreached: boolean): boolean {
  return mode === "failed" || slaBreached;
}
