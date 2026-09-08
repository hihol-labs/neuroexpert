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

// GET: verified expert answers with full content + audio
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.error, docs: "/api/v1/docs" },
      { status: auth.status },
    );
  }

  // Check "answers" permission (premium API feature)
  if (!auth.permissions?.includes("answers") && !auth.permissions?.includes("all")) {
    return NextResponse.json(
      {
        error: "This endpoint requires 'answers' permission. Upgrade your API plan.",
        docs: "/api/v1/docs",
      },
      { status: 403 },
    );
  }

  const params = request.nextUrl.searchParams;
  const questionId = params.get("question_id");
  const niche = params.get("niche");
  const q = params.get("q");
  const verifiedOnly = params.get("verified") !== "false";
  const limit = Math.min(parseInt(params.get("limit") || "10", 10), 50);
  const offset = parseInt(params.get("offset") || "0", 10);

  const admin = getAdmin();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

  let query = admin
    .from("content_packages")
    .select(
      "id, title, slug, format_seo_article, format_telegram_post, format_faq, meta_title, meta_description, keywords, word_count, published_at, voice_id, voice_recordings(file_path), expert_quotes, question_id, questions(question_text, slug, monthly_volume), profiles!inner(id, full_name, slug, qualification, is_verified, trust_score, avg_rating, years_experience, knows_about, alumni_of, works_for)",
      { count: "exact" },
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (verifiedOnly) {
    query = query.eq("profiles.is_verified", true);
  }

  if (questionId) {
    query = query.eq("question_id", questionId);
  }

  if (q) {
    query = query.or(`title.ilike.%${q}%,meta_description.ilike.%${q}%`);
  }

  if (niche) {
    const { data: nicheData } = await admin
      .from("niches")
      .select("id")
      .eq("slug", niche)
      .single();
    if (nicheData) {
      query = query.eq("profiles.niche_id", nicheData.id);
    }
  }

  const { data: packages, count } = await query;

  // R-05: bucket voice приватный - audio_url ведёт на стабильный /api/audio/<voice_id>, который
  // подписывает ссылку в момент запроса (302); потребитель API может кэшировать audio_url.
  const results = (packages ?? []).map((pkg) => {
    const expert = pkg.profiles as unknown as {
      id: string;
      full_name: string;
      slug: string;
      qualification: string | null;
      is_verified: boolean;
      trust_score: number;
      avg_rating: number;
      years_experience: number | null;
      knows_about: string[] | null;
      alumni_of: string | null;
      works_for: string | null;
    };

    const question = pkg.questions as unknown as {
      question_text: string;
      slug: string;
      monthly_volume: number;
    } | null;

    return {
      id: pkg.id,
      title: pkg.title,
      url: `${appUrl}/experts/${expert.slug}/${pkg.slug}`,
      question: question
        ? {
            text: question.question_text,
            url: `${appUrl}/questions/${question.slug}`,
            monthly_volume: question.monthly_volume,
          }
        : null,
      content: {
        article: pkg.format_seo_article,
        telegram_post: pkg.format_telegram_post,
        faq: pkg.format_faq,
      },
      meta: {
        title: pkg.meta_title,
        description: pkg.meta_description,
        keywords: pkg.keywords,
        word_count: pkg.word_count,
      },
      expert: {
        id: expert.id,
        full_name: expert.full_name,
        slug: expert.slug,
        profile_url: `${appUrl}/experts/${expert.slug}`,
        qualification: expert.qualification,
        is_verified: expert.is_verified,
        trust_score: expert.trust_score,
        avg_rating: expert.avg_rating,
        years_experience: expert.years_experience,
        knows_about: expert.knows_about,
        credentials: {
          alumni_of: expert.alumni_of,
          works_for: expert.works_for,
        },
      },
      expert_quotes: pkg.expert_quotes,
      audio_url: (() => {
        const voice = pkg.voice_recordings as unknown as { file_path: string } | null;
        const voiceId = (pkg as { voice_id?: string | null }).voice_id ?? null;
        return voice?.file_path && voiceId ? `${appUrl}/api/audio/${voiceId}` : null;
      })(),
      published_at: pkg.published_at,
      license: {
        type: "commercial",
        attribution_required: true,
        attribution_format: `Источник: ${expert.full_name}, НейроЭксперт (${appUrl}/experts/${expert.slug}/${pkg.slug})`,
      },
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
    license: {
      terms: `${appUrl}/api-terms`,
      contact: "api@neuroexpertise.ru",
      plans: {
        read: "Free — /api/v1/experts, /api/v1/articles, /api/v1/questions (100 req/hour)",
        answers: "Pro — /api/v1/answers with full content + audio (1000 req/hour, $99/mo)",
        enterprise: "Enterprise — custom limits, SLA, dedicated support",
      },
    },
  });
}
