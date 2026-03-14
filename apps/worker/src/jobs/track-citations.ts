import { supabase } from "../supabase.js";
import { probeAI } from "../services/ai-prober.js";

const PLATFORMS: Array<"chatgpt" | "yandexgpt"> = ["chatgpt", "yandexgpt"];

export async function handleTrackCitations(payload: Record<string, unknown>): Promise<{ checked: number }> {
  const expertId = payload.expert_id as string;
  if (!expertId) throw new Error("expert_id is required");

  const { data: expert } = await supabase
    .from("profiles")
    .select("full_name, slug")
    .eq("id", expertId)
    .single();

  if (!expert) throw new Error(`Expert ${expertId} not found`);

  const { data: packages } = await supabase
    .from("content_packages")
    .select("id, title, slug, published_url, question_id, questions(question_text)")
    .eq("expert_id", expertId)
    .eq("status", "published")
    .limit(30);

  if (!packages?.length) return { checked: 0 };

  let checked = 0;
  for (const pkg of packages) {
    const question = (pkg.questions as unknown as { question_text: string } | null)?.question_text ?? pkg.title ?? "";
    if (!question) continue;

    for (const platform of PLATFORMS) {
      try {
        const result = await probeAI(question, platform);

        const nameLower = expert.full_name.toLowerCase();
        const responseLower = result.response.toLowerCase();
        const hasName = responseLower.includes(nameLower);
        const hasUrl = pkg.published_url ? responseLower.includes(
          (pkg.published_url as string).replace("https://", "").replace("http://", "")
        ) : false;
        const hasNeuroexpert = responseLower.includes("neuroexpert") || responseLower.includes("нейроэксперт");

        const isCited = hasName || hasUrl || hasNeuroexpert;
        const citationType = hasName ? "name" : hasUrl ? "url" : hasNeuroexpert ? "content_match" : "none";

        await supabase.from("citation_checks").insert({
          content_id: pkg.id,
          expert_id: expertId,
          ai_platform: platform,
          question_text: question,
          ai_response: result.response.slice(0, 5000),
          is_cited: isCited,
          citation_type: citationType,
        });

        checked++;
      } catch (err) {
        console.error(`[track_citations] ${platform} failed:`, err instanceof Error ? err.message : err);
      }

      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`[track_citations] Checked ${checked} citations for expert ${expertId}`);
  return { checked };
}
