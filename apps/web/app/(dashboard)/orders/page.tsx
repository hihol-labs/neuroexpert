import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { Table, Th, Td } from "@/components/ui/table";

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

interface SearchParams { status?: string }

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const { createClient } = await import("@/lib/supabase/server");
  const authClient = createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;

  const supabase = getSupabase();
  let query = supabase
    .from("orders")
    .select("id, status, week_number, expires_at, created_at, questions(question_text, gap_score, monthly_volume)")
    .eq("expert_id", user.id)
    .order("created_at", { ascending: false });

  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }

  const { data: orders } = await query.limit(50);

  const statuses = ["pending", "accepted", "recording", "processing", "review", "published", "rejected"];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Заказы</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link href="/orders" className={`px-3 py-1.5 rounded-full text-sm border ${!searchParams.status ? "bg-blue-600 text-white border-blue-600" : "text-gray-700 border-gray-300 hover:border-blue-300"}`}>
          Все
        </Link>
        {statuses.map((s) => (
          <Link key={s} href={`/orders?status=${s}`} className={`px-3 py-1.5 rounded-full text-sm border ${searchParams.status === s ? "bg-blue-600 text-white border-blue-600" : "text-gray-700 border-gray-300 hover:border-blue-300"}`}>
            {s}
          </Link>
        ))}
      </div>

      {!orders?.length ? (
        <p className="text-gray-500 py-12 text-center">Заказов пока нет. Они обновляются каждый понедельник.</p>
      ) : (
        <div className="bg-white rounded-xl border">
          <Table>
            <thead>
              <tr>
                <Th>Вопрос</Th>
                <Th>Gap Score</Th>
                <Th>Частотность</Th>
                <Th>Статус</Th>
                <Th>Действия</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: Record<string, unknown>) => {
                const q = o.questions as Record<string, unknown> | null;
                return (
                  <tr key={o.id as string}>
                    <Td className="max-w-xs truncate">{(q?.question_text as string) ?? "—"}</Td>
                    <Td>{(q?.gap_score as number) ?? "—"}</Td>
                    <Td>{(q?.monthly_volume as number)?.toLocaleString() ?? "—"}</Td>
                    <Td><Badge status={o.status as string} /></Td>
                    <Td>
                      {o.status === "pending" && (
                        <div className="flex gap-2">
                          <form action="/api/orders/accept" method="POST">
                            <input type="hidden" name="order_id" value={o.id as string} />
                            <button className="text-sm text-blue-600 hover:underline">Принять</button>
                          </form>
                          <form action="/api/orders/skip" method="POST">
                            <input type="hidden" name="order_id" value={o.id as string} />
                            <button className="text-sm text-red-600 hover:underline">Пропустить</button>
                          </form>
                        </div>
                      )}
                      {o.status === "accepted" && (
                        <Link href="/content/new" className="text-sm text-blue-600 hover:underline">Записать</Link>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
