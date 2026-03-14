import { supabase } from "../supabase.js";

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

  // Average SERP position (lower is better, invert for score)
  const { data: serpData } = await supabase
    .from("serp_positions")
    .select("position")
    .eq("content_id", expertId) // will use content join below
    .not("position", "is", null)
    .gte("checked_at", thirtyDaysAgo)
    .limit(50);

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

  // Formula: (citations×2 + position×1.5 + content×1 + leads×3) / max × 100
  const maxPossible = 50 * 2 + 20 * 1.5 + 50 * 1 + 20 * 3; // theoretical max
  const raw = (citationCount ?? 0) * 2 + avgPositionScore * 1.5 + contentCount * 1 + (leadCount ?? 0) * 3;
  const score = Math.min(100, Math.round((raw / maxPossible) * 100 * 10) / 10);

  await supabase
    .from("profiles")
    .update({ trust_score: score })
    .eq("id", expertId);

  console.log(`[trust_score] Expert ${expertId}: ${score} (citations=${citationCount}, content=${contentCount}, leads=${leadCount})`);
  return { score };
}
