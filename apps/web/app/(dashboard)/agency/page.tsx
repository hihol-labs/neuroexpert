import Link from "next/link";
import { Building2, FileJson, KeyRound, Layers3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import { getAdmin, getUser } from "@/lib/demand-to-revenue-server";

type Row = Record<string, unknown>;

const API_ENDPOINTS = [
  "/api/v1/local-demand",
  "/api/v1/blind-spots",
  "/api/v1/ai-visibility",
  "/api/v1/local-competitors",
  "/api/v1/machine-profiles",
];

export default async function AgencyPage() {
  const user = await getUser();
  if (!user) return null;

  const admin = getAdmin();
  const [{ data: reports }, { data: clients }, { data: apiKeys }] = await Promise.all([
    admin
      .from("agency_reports")
      .select("*, agency_report_exports(*)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("agency_clients")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("api_keys")
      .select("id, name, permissions, is_active, rate_limit_per_hour, last_used_at")
      .eq("owner_id", user.id),
  ]);

  const readyExports = ((reports ?? []) as Row[]).flatMap(
    (report) => (report.agency_report_exports as Row[] | undefined) ?? [],
  ).filter((item) => item.status === "ready" || item.status === "shared");

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agencies / Demand API</h1>
          <p className="mt-1 text-sm text-gray-500">
            White-label отчёты, API спроса, AI visibility и клиентские кейсы для агентств.
          </p>
        </div>
        <Link href="/api-keys" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <KeyRound className="h-4 w-4" />
          API-ключи
        </Link>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Card>
          <CardTitle>Отчёты</CardTitle>
          <CardValue>{reports?.length ?? 0}</CardValue>
        </Card>
        <Card>
          <CardTitle>Экспорты</CardTitle>
          <CardValue>{readyExports.length}</CardValue>
        </Card>
        <Card>
          <CardTitle>Клиенты</CardTitle>
          <CardValue>{clients?.length ?? 0}</CardValue>
        </Card>
        <Card>
          <CardTitle>API keys</CardTitle>
          <CardValue>{apiKeys?.length ?? 0}</CardValue>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="bg-white rounded-xl border p-6">
          <div className="mb-5 flex items-center gap-2">
            <FileJson className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">White-label reports</h2>
          </div>
          {reports?.length ? (
            <div className="space-y-3">
              {(reports as Row[]).map((report) => (
                <div key={String(report.id)} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">{String(report.title)}</p>
                    <Badge status={String(report.status)} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {String(report.report_type)} · white-label {report.white_label ? "да" : "нет"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Отчётов пока нет. Создаются через `/api/agency/reports` или job `generate_agency_report`.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="mb-5 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Agency clients</h2>
          </div>
          {clients?.length ? (
            <div className="space-y-3">
              {(clients as Row[]).map((client) => (
                <div key={String(client.id)} className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{String(client.name)}</p>
                    <p className="text-xs text-gray-500">{[client.city, client.niche].filter(Boolean).map(String).join(" · ") || "без сегмента"}</p>
                  </div>
                  <Badge status={String(client.status)} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Клиенты агентства пока не заведены.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6 xl:col-span-2">
          <div className="mb-5 flex items-center gap-2">
            <Layers3 className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">API monetization package</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold text-gray-900">Pro</h3>
              <p className="mt-1 text-sm text-gray-500">
                Данные спроса + blind spots + AI visibility + отчёт для клиента.
              </p>
              <p className="mt-3 text-sm font-medium text-gray-900">$99/mo</p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold text-gray-900">Enterprise</h3>
              <p className="mt-1 text-sm text-gray-500">
                API + white-label отчёты + клиентские кейсы + кастомные лимиты.
              </p>
              <p className="mt-3 text-sm font-medium text-gray-900">Custom</p>
            </div>
          </div>
          <div className="mt-5 grid gap-2 md:grid-cols-2">
            {API_ENDPOINTS.map((endpoint) => (
              <code key={endpoint} className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {endpoint}
              </code>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
