import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getDashboardData(userId: string) {
  const supabase = getSupabase();

  const [pubResult, leadsResult, profileResult, ordersResult, recentLeadsResult, contentCountResult] = await Promise.all([
    supabase.from("content_packages").select("id", { count: "exact", head: true }).eq("expert_id", userId).eq("status", "published"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("expert_id", userId),
    supabase.from("profiles").select("trust_score, subscription_tier, full_name, bio, qualification").eq("id", userId).single(),
    supabase.from("orders").select("id, status, week_number, questions(question_text)").eq("expert_id", userId).in("status", ["pending", "accepted"]).order("created_at", { ascending: false }).limit(5),
    supabase.from("leads").select("id, client_name, client_contact, client_message, status, created_at").eq("expert_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("content_packages").select("id", { count: "exact", head: true }).eq("expert_id", userId),
  ]);

  const profile = profileResult.data;
  const hasProfile = !!(profile?.full_name && profile?.bio && profile?.qualification);
  const totalContent = contentCountResult.count ?? 0;

  return {
    publishedCount: pubResult.count ?? 0,
    leadsCount: leadsResult.count ?? 0,
    trustScore: profile?.trust_score ?? 0,
    tier: profile?.subscription_tier ?? "free",
    recentOrders: ordersResult.data ?? [],
    recentLeads: recentLeadsResult.data ?? [],
    hasProfile,
    totalContent,
  };
}

export default async function DashboardPage() {
  const { createClient } = await import("@/lib/supabase/server");
  const authClient = createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;

  const data = await getDashboardData(user.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
        <Link href="/content/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Записать ответ
        </Link>
      </div>

      {/* Onboarding checklist — hide when all steps done */}
      {(!data.hasProfile || data.totalContent === 0 || data.publishedCount === 0) && (
        <div className="bg-white rounded-xl border border-blue-200 p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-3">Начните работу</h2>
          <div className="space-y-2">
            {[
              { done: true, label: "Зарегистрироваться", href: "" },
              { done: data.hasProfile, label: "Заполнить профиль", href: "/profile" },
              { done: data.totalContent > 0, label: "Записать первый ответ", href: "/content/new" },
              { done: data.publishedCount > 0, label: "Опубликовать контент", href: "/content" },
            ].map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                )}
                {step.done || !step.href ? (
                  <span className={`text-sm ${step.done ? "text-gray-500 line-through" : "text-gray-900"}`}>{step.label}</span>
                ) : (
                  <Link href={step.href} className="text-sm text-blue-600 hover:underline">{step.label}</Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardTitle>Опубликовано</CardTitle>
          <CardValue>{data.publishedCount}</CardValue>
        </Card>
        <Card>
          <CardTitle>Заявки</CardTitle>
          <CardValue>{data.leadsCount}</CardValue>
        </Card>
        <Card>
          <CardTitle>Trust Score</CardTitle>
          <CardValue>{data.trustScore.toFixed(1)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Тариф</CardTitle>
          <CardValue><Badge status={data.tier} /></CardValue>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Последние заказы</h2>
            <Link href="/orders" className="text-sm text-blue-600 hover:underline">Все</Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-gray-500">Заказов пока нет</p>
          ) : (
            <div className="space-y-3">
              {data.recentOrders.map((o: Record<string, unknown>) => (
                <div key={o.id as string} className="flex items-center justify-between">
                  <p className="text-sm text-gray-900 truncate flex-1 mr-2">
                    {(o.questions as Record<string, string>)?.question_text ?? "Без вопроса"}
                  </p>
                  <Badge status={o.status as string} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent leads */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Последние заявки</h2>
            <Link href="/leads" className="text-sm text-blue-600 hover:underline">Все</Link>
          </div>
          {data.recentLeads.length === 0 ? (
            <p className="text-sm text-gray-500">Заявок пока нет</p>
          ) : (
            <div className="space-y-3">
              {data.recentLeads.map((l: Record<string, unknown>) => (
                <div key={l.id as string} className="flex items-center justify-between">
                  <div className="flex-1 mr-2 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{l.client_name as string}</p>
                    <p className="text-xs text-gray-500 truncate">{(l.client_message as string) || l.client_contact as string}</p>
                  </div>
                  <Badge status={l.status as string} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
