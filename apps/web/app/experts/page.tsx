import Link from "next/link";
import type { Metadata } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { ExpertFilters } from "@/components/experts/expert-filters";
import { CompareBar, CompareCheckbox } from "@/components/experts/compare-bar";
import { CatalogFooter, CatalogHeader } from "@/components/catalog/catalog-shell";
import { generateItemListSchema } from "@/lib/schema-org";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export const metadata: Metadata = {
  title: "Каталог экспертов | НейроЭксперт",
  description:
    "Найдите эксперта в своей нише — психология, юриспруденция, нутрициология, финансы и другие направления",
};

export const dynamic = "force-dynamic";
export const revalidate = 600;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

interface SearchParams {
  niche?: string;
  city?: string;
  q?: string;
  sort?: string;
  min_exp?: string;
  min_score?: string;
  max_price?: string;
  min_rating?: string;
}

async function getExperts(searchParams: SearchParams) {
  const supabase = getAdmin();

  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, slug, qualification, city, avatar_url, trust_score, niche_id, years_experience, is_verified, is_featured, avg_rating, review_count, niches(name, icon)",
    )
    .eq("is_published", true);

  // Text search by name or qualification
  if (searchParams.q) {
    const q = searchParams.q.trim();
    query = query.or(
      `full_name.ilike.%${q}%,qualification.ilike.%${q}%,city.ilike.%${q}%`,
    );
  }

  // Filter by niche
  if (searchParams.niche) {
    const { data: nicheData } = await supabase
      .from("niches")
      .select("id")
      .eq("slug", searchParams.niche)
      .single();
    if (nicheData) {
      query = query.eq("niche_id", nicheData.id);
    }
  }

  // Filter by city
  if (searchParams.city) {
    query = query.ilike("city", `%${searchParams.city}%`);
  }

  // Filter by min experience
  if (searchParams.min_exp) {
    query = query.gte("years_experience", parseInt(searchParams.min_exp, 10));
  }

  // Filter by min trust score
  if (searchParams.min_score) {
    query = query.gte("trust_score", parseFloat(searchParams.min_score));
  }

  // Filter by max price
  if (searchParams.max_price) {
    query = query.lte("consultation_price", parseInt(searchParams.max_price, 10));
  }

  // Filter by min rating
  if (searchParams.min_rating) {
    query = query.gte("avg_rating", parseFloat(searchParams.min_rating));
  }

  // Sort
  const sort = searchParams.sort || "trust_score";
  switch (sort) {
    case "rating":
      query = query.order("avg_rating", { ascending: false });
      break;
    case "experience":
      query = query.order("years_experience", { ascending: false, nullsFirst: false });
      break;
    case "name":
      query = query.order("full_name", { ascending: true });
      break;
    case "trust_score":
    default:
      query = query.order("trust_score", { ascending: false });
      break;
  }

  const { data: experts } = await query;

  // Get article counts
  const expertIds = (experts ?? []).map((e) => e.id);
  const { data: counts } = expertIds.length
    ? await supabase
        .from("content_packages")
        .select("expert_id")
        .in("expert_id", expertIds)
        .eq("status", "published")
    : { data: [] };

  const countMap: Record<string, number> = {};
  for (const c of counts ?? []) {
    countMap[c.expert_id] = (countMap[c.expert_id] || 0) + 1;
  }

  // Sort by articles count if requested
  let sortedExperts = experts ?? [];
  if (sort === "articles") {
    sortedExperts = [...sortedExperts].sort(
      (a, b) => (countMap[b.id] || 0) - (countMap[a.id] || 0),
    );
  }

  // Get niches for filter
  const { data: niches } = await supabase
    .from("niches")
    .select("name, slug, icon")
    .eq("is_active", true)
    .order("name");

  // Featured experts (separate query, only if no filters applied)
  let featured: typeof sortedExperts = [];
  if (!searchParams.q && !searchParams.niche && !searchParams.min_exp && !searchParams.min_score && !searchParams.max_price && !searchParams.min_rating) {
    const { data: featuredData } = await supabase
      .from("profiles")
      .select(
        "id, full_name, slug, qualification, city, avatar_url, trust_score, niche_id, years_experience, is_verified, is_featured, avg_rating, review_count, niches(name, icon)",
      )
      .eq("is_published", true)
      .eq("is_featured", true)
      .order("trust_score", { ascending: false })
      .limit(3);
    featured = featuredData ?? [];
  }

  return {
    experts: sortedExperts,
    countMap,
    niches: niches ?? [],
    featured,
  };
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="text-yellow-500">
        {"★".repeat(full)}
        {half ? "½" : ""}
        {"☆".repeat(5 - full - (half ? 1 : 0))}
      </span>
      <span className="text-gray-500">({count})</span>
    </span>
  );
}

interface ExpertRow {
  id: string;
  full_name: string;
  slug: string;
  qualification: string | null;
  city: string | null;
  avatar_url: string | null;
  trust_score: number;
  niche_id: string | null;
  years_experience: number | null;
  is_verified: boolean;
  is_featured: boolean;
  avg_rating: number;
  review_count: number;
  niches: { name: string; icon: string }[] | { name: string; icon: string } | null;
}

function ExpertCard({
  expert,
  articleCount,
}: {
  expert: ExpertRow;
  articleCount: number;
}) {
  return (
    <Link
      href={`/experts/${expert.slug}`}
      className="relative border rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all"
    >
      <CompareCheckbox expertId={expert.id} />
      <div className="flex items-center gap-3 mb-3">
        <div className="relative w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-600 flex-shrink-0">
          {expert.full_name.charAt(0)}
          {expert.is_verified && (
            <span
              className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px]"
              title="Верифицированный эксперт"
            >
              ✓
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate flex items-center gap-1.5">
            {expert.full_name}
          </h3>
          {expert.qualification && (
            <p className="text-sm text-gray-500 truncate">
              {expert.qualification}
            </p>
          )}
        </div>
      </div>

      {/* Rating */}
      {expert.review_count > 0 && (
        <div className="mb-2">
          <StarRating
            rating={expert.avg_rating}
            count={expert.review_count}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
        {(() => {
          const niche = Array.isArray(expert.niches) ? expert.niches[0] : expert.niches;
          return niche ? (
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
              {niche.icon} {niche.name}
            </span>
          ) : null;
        })()}
        {expert.city && <span>{expert.city}</span>}
        {expert.years_experience && expert.years_experience > 0 && (
          <span>{expert.years_experience} лет опыта</span>
        )}
        {expert.trust_score > 0 && (
          <span>Score: {expert.trust_score.toFixed(1)}</span>
        )}
        <span>{articleCount} статей</span>
      </div>
    </Link>
  );
}

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { experts, countMap, niches, featured } =
    await getExperts(searchParams);
  const itemListExperts = [...featured, ...experts].filter(
    (expert, index, list) => list.findIndex((item) => item.id === expert.id) === index,
  );
  const schemas = [
    generateItemListSchema(
      "Каталог экспертов НейроЭксперт",
      itemListExperts.slice(0, 50).map((expert) => ({
        name: expert.full_name,
        url: `${APP_URL}/experts/${expert.slug}`,
        description: expert.qualification,
      })),
    ),
  ];

  return (
    <div className="catalog-shell catalog-index">
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <CatalogHeader active="experts" />

      <main className="catalog-main mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Каталог экспертов
        </h1>
        <p className="text-gray-600 mb-6">Найдите эксперта в вашей области</p>

        {/* Featured experts */}
        {featured.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Рекомендуемые эксперты
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((expert) => (
                <div key={expert.id} className="relative">
                  <span className="absolute -top-2 left-4 z-10 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    Рекомендуем
                  </span>
                  <ExpertCard
                    expert={expert}
                    articleCount={countMap[expert.id] || 0}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Filters */}
        <ExpertFilters niches={niches} />

        {/* Experts grid */}
        {experts.length === 0 ? (
          <p className="text-gray-500 text-center py-12">
            {searchParams.q || searchParams.min_exp || searchParams.min_score
              ? "Экспертов по вашему запросу не найдено. Попробуйте изменить фильтры."
              : "Экспертов в этой категории пока нет"}
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Найдено: {experts.length}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {experts.map((expert) => (
                <ExpertCard
                  key={expert.id}
                  expert={expert}
                  articleCount={countMap[expert.id] || 0}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <CompareBar />

      <CatalogFooter />
    </div>
  );
}
