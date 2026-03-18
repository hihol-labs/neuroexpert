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
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.error, docs: "/api/v1/docs" },
      { status: auth.status },
    );
  }

  const params = request.nextUrl.searchParams;
  const expertSlug = params.get("expert");
  const q = params.get("q");
  const limit = Math.min(parseInt(params.get("limit") || "20", 10), 100);
  const offset = parseInt(params.get("offset") || "0", 10);

  const admin = getAdmin();

  let query = admin
    .from("content_packages")
    .select(
      "id, title, slug, meta_title, meta_description, keywords, word_count, published_at, published_url, format_faq, expert_id, profiles!content_packages_expert_id_fkey(full_name, slug, qualification)",
      { count: "exact" },
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (expertSlug) {
    const { data: expert } = await admin
      .from("profiles")
      .select("id")
      .eq("slug", expertSlug)
      .single();
    if (expert) {
      query = query.eq("expert_id", expert.id);
    }
  }

  if (q) {
    query = query.or(
      `title.ilike.%${q}%,meta_description.ilike.%${q}%`,
    );
  }

  const { data: articles, count } = await query;

  const results = (articles ?? []).map((a) => {
    const expert = a.profiles as unknown as {
      full_name: string;
      slug: string;
      qualification: string | null;
    } | null;

    return {
      id: a.id,
      title: a.title,
      slug: a.slug,
      url: a.published_url || `${process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru"}/experts/${expert?.slug}/${a.slug}`,
      meta_title: a.meta_title,
      meta_description: a.meta_description,
      keywords: a.keywords,
      word_count: a.word_count,
      published_at: a.published_at,
      faq: a.format_faq,
      expert: expert
        ? {
            full_name: expert.full_name,
            slug: expert.slug,
            qualification: expert.qualification,
          }
        : null,
    };
  });

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
