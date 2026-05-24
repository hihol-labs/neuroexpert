import { supabase } from "../supabase.js";
import { calculateTrustComponents } from "shared";

export async function handleCalculateTrustScore(payload: Record<string, unknown>): Promise<{ score: number }> {
  const expertId = payload.expert_id as string;
  if (!expertId) throw new Error("expert_id is required");

  // Citation count (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { count: citationCount } = await supabase
    .from("citation_checks")
    .select("id", { count: "exact", head: true })
    .eq("expert_id", expertId)
    .eq("is_cited", true)
    .gte("checked_at", thirtyDaysAgo);

  // Get positions via content_packages
  const { data: expertContent } = await supabase
    .from("content_packages")
    .select("id")
    .eq("expert_id", expertId)
    .eq("status", "published");

  const contentIds = (expertContent ?? []).map((c) => c.id);
  let avgPositionScore = 0;

  if (contentIds.length > 0) {
    const { data: positions } = await supabase
      .from("serp_positions")
      .select("position")
      .in("content_id", contentIds)
      .not("position", "is", null)
      .gte("checked_at", thirtyDaysAgo);

    if (positions?.length) {
      const avg = positions.reduce((s, p) => s + (p.position as number), 0) / positions.length;
      avgPositionScore = Math.max(0, 20 - avg); // top-1 = 19, top-20 = 0
    }
  }

  // Content count
  const contentCount = contentIds.length;

  // Lead count (last 30 days)
  const { count: leadCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("expert_id", expertId)
    .gte("created_at", thirtyDaysAgo);

  const { data: proofAssets } = await supabase
    .from("proof_of_human_assets")
    .select("id, status, confidence")
    .eq("profile_id", expertId);

  const proofScore = Math.min(
    100,
    ((proofAssets ?? []).filter((asset) => asset.status === "verified").length * 22) +
      ((proofAssets ?? []).filter((asset) => asset.status === "needs_review").length * 8),
  );
  const aiVisibilityScore = Math.min(100, ((citationCount ?? 0) / 20) * 100);
  const demandScore = Math.min(100, contentCount * 8 + avgPositionScore * 3);
  const conversionScore = Math.min(100, (leadCount ?? 0) * 12);
  const { trust_score: score, components } = calculateTrustComponents({
    proofScore,
    aiVisibilityScore,
    demandScore,
    conversionScore,
  });

  await supabase
    .from("profiles")
    .update({
      trust_score: score,
      trust_components: {
        ...components,
        updated_at: new Date().toISOString(),
        evidence: {
          citations_30d: citationCount ?? 0,
          published_content: contentCount,
          leads_30d: leadCount ?? 0,
          proof_assets: proofAssets?.length ?? 0,
        },
      },
    })
    .eq("id", expertId);

  console.log(`[trust_score] Expert ${expertId}: ${score} (citations=${citationCount}, content=${contentCount}, leads=${leadCount})`);
  return { score };
}
