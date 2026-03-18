import { supabase } from "../supabase.js";
import { fetchBrandMentions } from "../services/pixel-tools.js";
import { fetchChatGPTPositions } from "../services/gptfox.js";

// Combined GEO services job: Pixel Tools + GptFox
// Runs weekly per expert, stores results alongside existing citation_checks

export async function handleTrackGeoServices(
  payload: Record<string, unknown>,
): Promise<{ pixel: number; gptfox: number }> {
  const expertId = payload.expert_id as string;
  if (!expertId) throw new Error("expert_id is required");

  const { data: expert } = await supabase
    .from("profiles")
    .select("full_name, slug")
    .eq("id", expertId)
    .single();

  if (!expert) throw new Error(`Expert ${expertId} not found`);

  let pixelCount = 0;
  let gptfoxCount = 0;

  // Pixel Tools: brand mentions
  const pixelReport = await fetchBrandMentions(expert.full_name);
  if (pixelReport) {
    for (const mention of pixelReport.platforms) {
      await supabase.from("citation_checks").insert({
        expert_id: expertId,
        ai_platform: `pixel_${mention.platform}`,
        question_text: mention.query || expert.full_name,
        ai_response: mention.context,
        is_cited: mention.mentioned,
        citation_type: mention.mentioned ? "content_match" : "none",
      });
      pixelCount++;
    }
    console.log(
      `[track_geo] Pixel Tools: ${pixelReport.total_mentions} mentions, ${pixelReport.positive_percent}% positive for ${expert.full_name}`,
    );
  }

  // GptFox: ChatGPT positions
  const { data: questions } = await supabase
    .from("questions")
    .select("question_text")
    .eq("is_active", true)
    .limit(20);

  const queries = (questions ?? []).map((q) => q.question_text);

  if (queries.length > 0) {
    const gptfoxReport = await fetchChatGPTPositions(expert.full_name, queries);
    if (gptfoxReport) {
      for (const pos of gptfoxReport.positions) {
        await supabase.from("citation_checks").insert({
          expert_id: expertId,
          ai_platform: "gptfox_chatgpt",
          question_text: pos.query,
          ai_response: pos.context,
          is_cited: pos.mentioned,
          citation_type: pos.mentioned ? "content_match" : "none",
          similarity_score: pos.position ? 1 - pos.position / 100 : 0,
        });
        gptfoxCount++;
      }
      console.log(
        `[track_geo] GptFox: visibility ${gptfoxReport.visibility_score}%, avg position ${gptfoxReport.avg_position} for ${expert.full_name}`,
      );
    }
  }

  console.log(
    `[track_geo] Done for ${expert.full_name}: pixel=${pixelCount}, gptfox=${gptfoxCount}`,
  );
  return { pixel: pixelCount, gptfox: gptfoxCount };
}
