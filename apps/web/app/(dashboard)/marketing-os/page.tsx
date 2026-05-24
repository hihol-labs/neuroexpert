import { ClipboardCheck, GitBranch, Lightbulb, LineChart, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import { getAccessibleBusinessIds, getAdmin, getUser, toNumber } from "@/lib/demand-to-revenue-server";

type Row = Record<string, unknown>;

export default async function MarketingOsPage() {
  const user = await getUser();
  if (!user) return null;

  const admin = getAdmin();
  const businessIds = await getAccessibleBusinessIds(user.id);
  const [
    { data: workflowRuns },
    { data: reviewQueue },
    { data: playbooks },
    { data: qualityChecks },
    { data: economics },
  ] = await Promise.all([
    admin
      .from("marketing_workflow_runs")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("marketing_review_queue")
      .select("*")
      .or(`owner_id.eq.${user.id}${businessIds.length ? `,business_id.in.(${businessIds.join(",")})` : ""}`)
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("marketing_playbooks")
      .select("*, marketing_playbook_versions(*)")
      .order("category")
      .order("key"),
    admin
      .from("page_quality_checks")
      .select("*")
      .eq("expert_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    businessIds.length
      ? admin
          .from("channel_unit_economics")
          .select("*")
          .in("business_id", businessIds)
          .order("period_end", { ascending: false })
          .limit(20)
      : { data: [] },
  ]);

  const pendingReview = ((reviewQueue ?? []) as Row[]).filter((item) => item.status === "pending");
  const activePlaybooks = ((playbooks ?? []) as Row[]).filter((item) => item.status === "active");
  const revenue = ((economics ?? []) as Row[]).reduce((sum, item) => sum + toNumber(item.revenue_amount), 0);
  const spend = ((economics ?? []) as Row[]).reduce((sum, item) => sum + toNumber(item.spend), 0);
  const romi = spend > 0 ? Math.round(((revenue - spend) / spend) * 1000) / 10 : revenue > 0 ? 100 : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Marketing OS</h1>
        <p className="mt-1 text-sm text-gray-500">
          Операторский слой: workflow runs, review queue, playbook versions, CRO и unit economics.
        </p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Card>
          <CardTitle>Workflow runs</CardTitle>
          <CardValue>{workflowRuns?.length ?? 0}</CardValue>
        </Card>
        <Card>
          <CardTitle>Review queue</CardTitle>
          <CardValue>{pendingReview.length}</CardValue>
        </Card>
        <Card>
          <CardTitle>Playbooks</CardTitle>
          <CardValue>{activePlaybooks.length}</CardValue>
        </Card>
        <Card>
          <CardTitle>ROMI</CardTitle>
          <CardValue>{romi}%</CardValue>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="bg-white rounded-xl border p-6">
          <div className="mb-5 flex items-center gap-2">
            <Workflow className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Workflow runs</h2>
          </div>
          {workflowRuns?.length ? (
            <div className="space-y-3">
              {(workflowRuns as Row[]).map((run) => (
                <div key={String(run.id)} className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{String(run.workflow_key)}</p>
                    <p className="text-xs text-gray-500">{String(run.agent_role || "operator")} · {String(run.entity_type || "general")}</p>
                  </div>
                  <Badge status={String(run.status)} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Workflow runs пока нет.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="mb-5 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Review queue</h2>
          </div>
          {reviewQueue?.length ? (
            <div className="space-y-3">
              {(reviewQueue as Row[]).map((item) => (
                <div key={String(item.id)} className="rounded-lg border p-3">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">{String(item.title)}</p>
                    <Badge status={String(item.status)} />
                  </div>
                  <p className="text-xs text-gray-500">{String(item.summary || item.entity_type)}</p>
                  <p className="mt-2 text-xs text-gray-500">Risk: {String(item.risk_level)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Очередь проверки пуста.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="mb-5 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Playbook versions</h2>
          </div>
          <div className="space-y-3">
            {activePlaybooks.map((playbook) => {
              const versions = (playbook.marketing_playbook_versions as Row[] | undefined) ?? [];
              return (
                <div key={String(playbook.id)} className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{String(playbook.title)}</p>
                    <p className="text-xs text-gray-500">{String(playbook.category)} · versions {versions.length}</p>
                  </div>
                  <Badge status={String(playbook.status)} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="mb-5 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">CRO-гипотезы</h2>
          </div>
          {qualityChecks?.length ? (
            <div className="space-y-3">
              {(qualityChecks as Row[]).map((check) => (
                <div key={String(check.id)} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{String(check.check_type)}</p>
                    <Badge status={String(check.status)} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">ICE: {String(check.ice_score || "нет")}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">CRO-гипотез пока нет.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6 xl:col-span-2">
          <div className="mb-5 flex items-center gap-2">
            <LineChart className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Unit economics по каналам</h2>
          </div>
          {economics?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2">Канал</th>
                    <th className="py-2">CPL</th>
                    <th className="py-2">CAC</th>
                    <th className="py-2">CR</th>
                    <th className="py-2">ROMI</th>
                    <th className="py-2">Выручка</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(economics as Row[]).map((row) => (
                    <tr key={String(row.id)}>
                      <td className="py-3 font-medium text-gray-900">{String(row.channel)}</td>
                      <td className="py-3">{Math.round(toNumber(row.cpl))} ₽</td>
                      <td className="py-3">{Math.round(toNumber(row.cac))} ₽</td>
                      <td className="py-3">{toNumber(row.cr).toFixed(1)}%</td>
                      <td className="py-3">{toNumber(row.romi).toFixed(1)}%</td>
                      <td className="py-3">{Math.round(toNumber(row.revenue_amount)).toLocaleString("ru-RU")} ₽</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Юнит-экономика появится после ручного ввода или job `calculate_unit_economics`.</p>
          )}
        </div>
      </div>
    </div>
  );
}
