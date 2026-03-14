import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
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

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const { createClient } = await import("@/lib/supabase/server");
  const authClient = createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;

  const supabase = getSupabase();
  let query = supabase
    .from("leads")
    .select("id, client_name, client_contact, client_message, source, status, created_at")
    .eq("expert_id", user.id)
    .order("created_at", { ascending: false });

  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }

  const { data: leads } = await query.limit(50);
  const statuses = ["new", "notified", "accepted", "rejected", "completed"];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Заявки</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link href="/leads" className={`px-3 py-1.5 rounded-full text-sm border ${!searchParams.status ? "bg-blue-600 text-white border-blue-600" : "text-gray-700 border-gray-300 hover:border-blue-300"}`}>
          Все
        </Link>
        {statuses.map((s) => (
          <Link key={s} href={`/leads?status=${s}`} className={`px-3 py-1.5 rounded-full text-sm border ${searchParams.status === s ? "bg-blue-600 text-white border-blue-600" : "text-gray-700 border-gray-300 hover:border-blue-300"}`}>
            {s}
          </Link>
        ))}
      </div>

      {!leads?.length ? (
        <p className="text-gray-500 py-12 text-center">Заявок пока нет</p>
      ) : (
        <div className="bg-white rounded-xl border">
          <Table>
            <thead>
              <tr>
                <Th>Имя</Th>
                <Th>Контакт</Th>
                <Th>Тема</Th>
                <Th>Источник</Th>
                <Th>Дата</Th>
                <Th>Статус</Th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l: Record<string, unknown>) => (
                <tr key={l.id as string}>
                  <Td className="font-medium">{l.client_name as string}</Td>
                  <Td>{l.client_contact as string}</Td>
                  <Td className="max-w-xs truncate">{(l.client_message as string) || "—"}</Td>
                  <Td>{l.source as string}</Td>
                  <Td>{new Date(l.created_at as string).toLocaleDateString("ru-RU")}</Td>
                  <Td><Badge status={l.status as string} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
