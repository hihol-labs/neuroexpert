import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// Smart matching: find best experts for a client query
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  const nicheSlug = request.nextUrl.searchParams.get("niche");

  if (!query && !nicheSlug) {
    return NextResponse.json(
      { error: "Укажите запрос (q) или нишу (niche)" },
      { status: 400 },
    );
  }

  const admin = getAdmin();

  let dbQuery = admin
    .from("profiles")
    .select(
      "id, full_name, slug, qualification, city, trust_score, avg_rating, review_count, years_experience, is_verified, subscription_tier, knows_about, consultation_price, niches(name, icon, slug)",
    )
    .eq("is_published", true);

  // Filter by niche
  if (nicheSlug) {
    const { data: niche } = await admin
      .from("niches")
      .select("id")
      .eq("slug", nicheSlug)
      .single();
    if (niche) {
      dbQuery = dbQuery.eq("niche_id", niche.id);
    }
  }

  // Text search in knows_about, qualification, full_name
  if (query) {
    dbQuery = dbQuery.or(
      `full_name.ilike.%${query}%,qualification.ilike.%${query}%`,
    );
  }

  const { data: experts } = await dbQuery.limit(50);

  if (!experts?.length) {
    return NextResponse.json({ experts: [], query });
  }

  // Score and rank experts
  const scored = experts.map((e) => {
    let score = 0;

    // Trust score (normalized 0-30)
    score += Math.min(e.trust_score, 100) * 0.3;

    // Rating (0-25)
    score += (e.avg_rating || 0) * 5;

    // Reviews count (0-10)
    score += Math.min(e.review_count || 0, 20) * 0.5;

    // Experience (0-15)
    score += Math.min(e.years_experience || 0, 30) * 0.5;

    // Verified bonus
    if (e.is_verified) score += 10;

    // Premium placement bonus (paid tiers rank higher)
    const tier = e.subscription_tier || "free";
    const tierBonus: Record<string, number> = {
      free: 0,
      starter: 5,
      pro: 10,
      expert: 15,
      business: 20,
      enterprise: 25,
    };
    score += tierBonus[tier] || 0;

    // Keyword match in knows_about
    if (query && e.knows_about?.length) {
      const queryLower = query.toLowerCase();
      const matchCount = (e.knows_about as string[]).filter((t) =>
        t.toLowerCase().includes(queryLower),
      ).length;
      score += matchCount * 10;
    }

    return { ...e, match_score: score };
  });

  // Sort by match score descending
  scored.sort((a, b) => b.match_score - a.match_score);

  // Get article counts
  const expertIds = scored.map((e) => e.id);
  const { data: counts } = await admin
    .from("content_packages")
    .select("expert_id")
    .in("expert_id", expertIds)
    .eq("status", "published");

  const countMap: Record<string, number> = {};
  for (const c of counts ?? []) {
    countMap[c.expert_id] = (countMap[c.expert_id] || 0) + 1;
  }

  const results = scored.slice(0, 10).map((e) => ({
    id: e.id,
    full_name: e.full_name,
    slug: e.slug,
    qualification: e.qualification,
    city: e.city,
    trust_score: e.trust_score,
    avg_rating: e.avg_rating || 0,
    review_count: e.review_count || 0,
    years_experience: e.years_experience,
    is_verified: e.is_verified,
    consultation_price: e.consultation_price,
    knows_about: e.knows_about,
    article_count: countMap[e.id] || 0,
    niche: (e.niches as unknown as { name: string; icon: string } | null),
    match_score: e.match_score,
    is_premium: ["pro", "expert", "business", "enterprise"].includes(
      e.subscription_tier || "free",
    ),
  }));

  return NextResponse.json({ experts: results, query });
}
