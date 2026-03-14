import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export default async function ContentListPage() {
  const { createClient } = await import("@/lib/supabase/server");
  const authClient = createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;

  const supabase = getSupabase();
  const { data: packages } = await supabase
    .from("content_packages")
    .select("id, title, slug, status, word_count, published_at, published_url, created_at")
    .eq("expert_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Контент</h1>
        <Link href="/content/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Записать ответ
        </Link>
      </div>

      {!packages?.length ? (
        <p className="text-gray-500 py-12 text-center">Контента пока нет. Запишите голосовой ответ.</p>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg: Record<string, unknown>) => (
            <Link
              key={pkg.id as string}
              href={`/content/${pkg.id}`}
              className="block bg-white border rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <h3 className="font-medium text-gray-900 truncate">{(pkg.title as string) || "Без заголовка"}</h3>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span>{new Date(pkg.created_at as string).toLocaleDateString("ru-RU")}</span>
                    {pkg.word_count ? <span>{String(pkg.word_count)} слов</span> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={pkg.status as string} />
                  {pkg.published_url ? (
                    <a href={pkg.published_url as string} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                      Открыть
                    </a>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
