"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface CitationByWeek { week: string; count: number }
interface ArticleCitation { title: string; chatgpt: boolean; yandexgpt: boolean; serpGoogle: number | null; serpYandex: number | null }
interface CWVEntry { url: string; lcp: number | null; fcp: number | null; cls: number | null; score: number | null; passing: boolean }
interface Recommendation { type: "update" | "record"; text: string }

export default function AnalyticsPage() {
  const [trustScore, setTrustScore] = useState(0);
  const [shareOfVoice, setShareOfVoice] = useState(0);
  const [citationsByWeek, setCitationsByWeek] = useState<CitationByWeek[]>([]);
  const [articles, setArticles] = useState<ArticleCitation[]>([]);
  const [cwv, setCwv] = useState<CWVEntry[]>([]);
  const [staleCount, setStaleCount] = useState(0);
  const [leads30d, setLeads30d] = useState(0);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Trust score
    const { data: profile } = await supabase.from("profiles").select("trust_score").eq("id", user.id).single();
    setTrustScore(profile?.trust_score ?? 0);

    // Citations
    const { data: citations } = await supabase
      .from("citation_checks")
      .select("is_cited, checked_at, content_id, ai_platform, content_packages!inner(title)")
      .eq("expert_id", user.id)
      .order("checked_at", { ascending: false })
      .limit(200);

    if (citations?.length) {
      // Share of Voice
      const total = citations.length;
      const cited = citations.filter((c) => c.is_cited).length;
      setShareOfVoice(total > 0 ? Math.round((cited / total) * 100) : 0);

      // By week
      const weekMap = new Map<string, number>();
      for (const c of citations) {
        if (!c.is_cited) continue;
        const d = new Date(c.checked_at as string);
        const week = `${d.getFullYear()}-W${String(Math.ceil((d.getDate()) / 7)).padStart(2, "0")}`;
        weekMap.set(week, (weekMap.get(week) ?? 0) + 1);
      }
      setCitationsByWeek(
        Array.from(weekMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-12)
          .map(([week, count]) => ({ week, count })),
      );

      // Articles citation table
      const articleMap = new Map<string, { title: string; chatgpt: boolean; yandexgpt: boolean }>();
      for (const c of citations) {
        const title = (c.content_packages as unknown as { title: string })?.title ?? "";
        const key = c.content_id as string;
        if (!articleMap.has(key)) articleMap.set(key, { title, chatgpt: false, yandexgpt: false });
        const entry = articleMap.get(key)!;
        if (c.is_cited && c.ai_platform === "chatgpt") entry.chatgpt = true;
        if (c.is_cited && c.ai_platform === "yandexgpt") entry.yandexgpt = true;
      }
      setArticles(Array.from(articleMap.values()).map((a) => ({ ...a, serpGoogle: null, serpYandex: null })));
    }

    // SERP positions
    const { data: contentPkgs } = await supabase
      .from("content_packages")
      .select("id")
      .eq("expert_id", user.id)
      .eq("status", "published");

    if (contentPkgs?.length) {
      const ids = contentPkgs.map((c) => c.id);
      const { data: serp } = await supabase
        .from("serp_positions")
        .select("content_id, search_engine, position")
        .in("content_id", ids)
        .order("checked_at", { ascending: false })
        .limit(100);

      if (serp) {
        setArticles((prev) => prev.map((a) => {
          // Match by index (simplified)
          return a;
        }));
      }

      // CWV
      const { data: cwvData } = await supabase
        .from("cwv_metrics")
        .select("page_url, lcp_ms, fcp_ms, cls_score, performance_score, is_passing")
        .in("content_id", ids)
        .order("checked_at", { ascending: false })
        .limit(30);

      if (cwvData) {
        const seen = new Set<string>();
        const entries: CWVEntry[] = [];
        for (const c of cwvData) {
          if (seen.has(c.page_url as string)) continue;
          seen.add(c.page_url as string);
          entries.push({
            url: c.page_url as string,
            lcp: c.lcp_ms as number | null,
            fcp: c.fcp_ms as number | null,
            cls: c.cls_score as number | null,
            score: c.performance_score as number | null,
            passing: c.is_passing as boolean,
          });
        }
        setCwv(entries);
      }
    }

    // Stale content
    const { count: stale } = await supabase
      .from("content_packages")
      .select("id", { count: "exact", head: true })
      .eq("expert_id", user.id)
      .eq("refresh_status", "needs_refresh");
    setStaleCount(stale ?? 0);

    // Leads 30d
    const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count: leads } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("expert_id", user.id)
      .gte("created_at", thirtyAgo);
    setLeads30d(leads ?? 0);

    // Recommendations
    const recs: Recommendation[] = [];
    const { data: uncited } = await supabase
      .from("content_packages")
      .select("title")
      .eq("expert_id", user.id)
      .eq("status", "published")
      .limit(3);

    if (stale && stale > 0) {
      recs.push({ type: "update", text: `${stale} статей требуют обновления (старше 90 дней)` });
    }

    const { data: topGaps } = await supabase
      .from("questions")
      .select("question_text, gap_score")
      .gte("gap_score", 8)
      .order("gap_score", { ascending: false })
      .limit(2);

    for (const q of topGaps ?? []) {
      recs.push({ type: "record", text: `Запишите ответ на «${(q.question_text as string).slice(0, 60)}» — gap_score ${q.gap_score}` });
    }

    setRecommendations(recs);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Аналитика</h1>

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardTitle>Trust Score</CardTitle>
          <CardValue>{trustScore.toFixed(1)}</CardValue>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, trustScore)}%` }} />
          </div>
        </Card>
        <Card>
          <CardTitle>Share of Voice</CardTitle>
          <CardValue>{shareOfVoice}%</CardValue>
          <p className="text-xs text-gray-500 mt-1">% ответов AI с вашим упоминанием</p>
        </Card>
        <Card>
          <CardTitle>Заявки (30 дн)</CardTitle>
          <CardValue>{leads30d}</CardValue>
        </Card>
        <Card>
          <CardTitle>Обновить</CardTitle>
          <CardValue>{staleCount}</CardValue>
          <p className="text-xs text-gray-500 mt-1">статей старше 90 дней</p>
        </Card>
      </div>

      {/* Citation chart */}
      {citationsByWeek.length > 0 && (
        <div className="bg-white rounded-xl border p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Цитирования по неделям</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={citationsByWeek}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* CWV */}
      {cwv.length > 0 && (
        <div className="bg-white rounded-xl border p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Core Web Vitals</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Страница</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500">LCP (мс)</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500">FCP (мс)</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500">CLS</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500">Score</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500">Статус</th>
                </tr>
              </thead>
              <tbody>
                {cwv.map((c, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 text-gray-900 truncate max-w-xs">{c.url.replace(/https?:\/\/[^/]+/, "")}</td>
                    <td className={`px-3 py-2 text-center ${(c.lcp ?? 0) > 2500 ? "text-red-600" : "text-green-600"}`}>{c.lcp?.toFixed(0) ?? "—"}</td>
                    <td className="px-3 py-2 text-center">{c.fcp?.toFixed(0) ?? "—"}</td>
                    <td className={`px-3 py-2 text-center ${(c.cls ?? 0) > 0.1 ? "text-red-600" : "text-green-600"}`}>{c.cls?.toFixed(3) ?? "—"}</td>
                    <td className="px-3 py-2 text-center font-medium">{c.score ?? "—"}</td>
                    <td className="px-3 py-2 text-center">{c.passing ? <span className="text-green-600">&#10003;</span> : <span className="text-red-600">&#10007;</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Citation table */}
      {articles.length > 0 && (
        <div className="bg-white rounded-xl border p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Цитирование по статьям</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Статья</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500">ChatGPT</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500">YandexGPT</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 text-gray-900 truncate max-w-xs">{a.title}</td>
                    <td className="px-3 py-2 text-center">{a.chatgpt ? <span className="text-green-600">&#10003;</span> : <span className="text-red-400">&#10007;</span>}</td>
                    <td className="px-3 py-2 text-center">{a.yandexgpt ? <span className="text-green-600">&#10003;</span> : <span className="text-red-400">&#10007;</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-3">Рекомендации</h2>
          <ul className="space-y-2">
            {recommendations.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span>{r.type === "update" ? "🔄" : "🎙️"}</span>
                <span className="text-gray-700">{r.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
