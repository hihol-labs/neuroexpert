import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids");
  if (!idsParam) {
    return NextResponse.json({ experts: [] });
  }

  const ids = idsParam.split(",").filter(Boolean).slice(0, 5); // Max 5
  if (ids.length === 0) {
    return NextResponse.json({ experts: [] });
  }

  const admin = getAdmin();

  const { data: profiles } = await admin
    .from("profiles")
    .select(
      "id, full_name, slug, qualification, city, years_experience, trust_score, avg_rating, review_count, is_verified, alumni_of, works_for, knows_about, consultation_price, niche_id, niches(name)",
    )
    .in("id", ids)
    .eq("is_published", true);

  if (!profiles?.length) {
    return NextResponse.json({ experts: [] });
  }

  // Get article counts
  const { data: counts } = await admin
    .from("content_packages")
    .select("expert_id")
    .in(
      "expert_id",
      profiles.map((p) => p.id),
    )
    .eq("status", "published");

  const countMap: Record<string, number> = {};
  for (const c of counts ?? []) {
    countMap[c.expert_id] = (countMap[c.expert_id] || 0) + 1;
  }

  const experts = profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    slug: p.slug,
    qualification: p.qualification,
    city: p.city,
    years_experience: p.years_experience,
    trust_score: p.trust_score,
    avg_rating: p.avg_rating ?? 0,
    review_count: p.review_count ?? 0,
    is_verified: p.is_verified,
    alumni_of: p.alumni_of,
    works_for: p.works_for,
    knows_about: p.knows_about,
    consultation_price: p.consultation_price,
    article_count: countMap[p.id] || 0,
    niche_name: (p.niches as unknown as { name: string } | null)?.name || null,
  }));

  return NextResponse.json({ experts });
}
