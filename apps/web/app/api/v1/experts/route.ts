import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { validateApiKey } from "@/lib/api-auth";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET(request: NextRequest) {
  // Validate API key
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.error, docs: "/api/v1/docs" },
      { status: auth.status },
    );
  }

  const params = request.nextUrl.searchParams;
  const niche = params.get("niche");
  const city = params.get("city");
  const q = params.get("q");
  const limit = Math.min(parseInt(params.get("limit") || "20", 10), 100);
  const offset = parseInt(params.get("offset") || "0", 10);

  const admin = getAdmin();

  let query = admin
    .from("profiles")
    .select(
      "id, full_name, slug, qualification, city, trust_score, avg_rating, review_count, years_experience, is_verified, knows_about, bio, consultation_price, niches(name, slug, icon)",
      { count: "exact" },
    )
    .eq("is_published", true)
    .order("trust_score", { ascending: false })
    .range(offset, offset + limit - 1);

  if (niche) {
    const { data: nicheData } = await admin
      .from("niches")
      .select("id")
      .eq("slug", niche)
      .single();
    if (nicheData) {
      query = query.eq("niche_id", nicheData.id);
    }
  }

  if (city) {
    query = query.ilike("city", `%${city}%`);
  }

  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,qualification.ilike.%${q}%`,
    );
  }

  const { data: experts, count } = await query;

  // Get article counts
  const expertIds = (experts ?? []).map((e) => e.id);
  const { data: counts } = expertIds.length
    ? await admin
        .from("content_packages")
        .select("expert_id")
        .in("expert_id", expertIds)
        .eq("status", "published")
    : { data: [] };

  const countMap: Record<string, number> = {};
  for (const c of counts ?? []) {
    countMap[c.expert_id] = (countMap[c.expert_id] || 0) + 1;
  }

  const results = (experts ?? []).map((e) => ({
    id: e.id,
    full_name: e.full_name,
    slug: e.slug,
    profile_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru"}/experts/${e.slug}`,
    qualification: e.qualification,
    city: e.city,
    bio: e.bio,
    trust_score: e.trust_score,
    avg_rating: e.avg_rating ?? 0,
    review_count: e.review_count ?? 0,
    years_experience: e.years_experience,
    is_verified: e.is_verified,
    knows_about: e.knows_about,
    consultation_price: e.consultation_price,
    article_count: countMap[e.id] || 0,
    niche: e.niches
      ? (e.niches as unknown as { name: string; slug: string; icon: string })
      : null,
  }));

  return NextResponse.json({
    data: results,
    pagination: {
      total: count ?? 0,
      limit,
      offset,
      has_more: offset + limit < (count ?? 0),
    },
  });
}
