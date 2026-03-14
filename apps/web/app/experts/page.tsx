import Link from "next/link";
import type { Metadata } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export const metadata: Metadata = {
  title: "Каталог экспертов | НейроЭксперт",
  description: "Найдите эксперта в своей нише — психология, юриспруденция, нутрициология, финансы и другие направления",
};

export const dynamic = "force-dynamic";
export const revalidate = 600;

interface SearchParams {
  niche?: string;
  city?: string;
}

async function getExperts(searchParams: SearchParams) {
  const supabase = getAdmin();

  let query = supabase
    .from("profiles")
    .select("id, full_name, slug, qualification, city, avatar_url, trust_score, niche_id, years_experience, niches(name, icon)")
    .eq("is_published", true)
    .order("trust_score", { ascending: false });

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

  if (searchParams.city) {
    query = query.ilike("city", `%${searchParams.city}%`);
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

  // Get niches for filter
  const { data: niches } = await supabase
    .from("niches")
    .select("name, slug, icon")
    .eq("is_active", true)
    .order("name");

  return { experts: experts ?? [], countMap, niches: niches ?? [] };
}

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { experts, countMap, niches } = await getExperts(searchParams);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-lg font-bold text-gray-900">НейроЭксперт</Link>
          <div className="flex gap-4 text-sm">
            <Link href="/experts" className="text-blue-600 font-medium">Эксперты</Link>
            <Link href="/audit" className="text-gray-600 hover:text-gray-900">Аудит</Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Каталог экспертов</h1>
        <p className="text-gray-600 mb-8">Найдите эксперта в вашей области</p>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/experts"
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              !searchParams.niche ? "bg-blue-600 text-white border-blue-600" : "text-gray-700 border-gray-300 hover:border-blue-300"
            }`}
          >
            Все
          </Link>
          {niches.map((n) => (
            <Link
              key={n.slug}
              href={`/experts?niche=${n.slug}`}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                searchParams.niche === n.slug
                  ? "bg-blue-600 text-white border-blue-600"
                  : "text-gray-700 border-gray-300 hover:border-blue-300"
              }`}
            >
              {n.icon} {n.name}
            </Link>
          ))}
        </div>

        {/* Experts grid */}
        {experts.length === 0 ? (
          <p className="text-gray-500 text-center py-12">Экспертов в этой категории пока нет</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {experts.map((expert) => {
              const niche = expert.niches as unknown as { name: string; icon: string } | null;
              return (
                <Link
                  key={expert.id}
                  href={`/experts/${expert.slug}`}
                  className="border rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-600 flex-shrink-0">
                      {expert.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{expert.full_name}</h3>
                      {expert.qualification && (
                        <p className="text-sm text-gray-500 truncate">{expert.qualification}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    {niche && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{niche.icon} {niche.name}</span>}
                    {expert.city && <span>{expert.city}</span>}
                    {expert.trust_score > 0 && <span>Score: {expert.trust_score.toFixed(1)}</span>}
                    <span>{countMap[expert.id] || 0} статей</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <footer className="bg-gray-900 py-8 mt-12">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} НейроЭксперт
        </div>
      </footer>
    </div>
  );
}
