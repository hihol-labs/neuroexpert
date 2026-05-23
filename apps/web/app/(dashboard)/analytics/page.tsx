"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface CitationByWeek { week: string; count: number }
interface ArticleCitation { title: string; chatgpt: boolean; yandexgpt: boolean; gigachat: boolean; perplexity: boolean; serpGoogle: number | null; serpYandex: number | null }
interface CWVEntry { url: string; lcp: number | null; fcp: number | null; cls: number | null; score: number | null; passing: boolean }
interface Recommendation { type: "update" | "record"; text: string }
interface CompetitorComparison { your_mentions: number; competitor_mentions: number; competitor_name: string }
interface AiCrawlerRow {
  metric_date: string;
  bot_name: string;
  hits: number;
  successful_hits: number;
  failed_hits: number;
  unique_paths: number;
}

function CompetitorCompare({ yourMentions }: { yourMentions: number }) {
  const [competitor, setCompetitor] = useState("");
  const [result, setResult] = useState<CompetitorComparison | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!competitor.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: competitor.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult({
          your_mentions: yourMentions,
          competitor_mentions: data.mentioned_count ?? 0,
          competitor_name: competitor.trim(),
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border p-6 mb-8">
      <h2 className="font-semibold text-gray-900 mb-3">Сравнение с конкурентом</h2>
      <form onSubmit={handleCompare} className="flex gap-3 mb-4">
        <input
          type="text"
          value={competitor}
          onChange={(e) => setCompetitor(e.target.value)}
          placeholder="Имя или бренд конкурента"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "..." : "Сравнить"}
        </button>
      </form>

      {result && (
        <div className="grid grid-cols-3 gap-4 items-center text-center">
          <div>
            <p className="text-3xl font-bold text-blue-600">{result.your_mentions}</p>
            <p className="text-xs text-gray-500 mt-1">Ваши цитирования</p>
          </div>
          <div>
            <span className="text-xl font-bold text-gray-300">vs</span>
          </div>
          <div>
            <p className="text-3xl font-bold text-red-500">{result.competitor_mentions}</p>
            <p className="text-xs text-gray-500 mt-1">{result.competitor_name}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  );
  const [trustScore, setTrustScore] = useState(0);
  const [shareOfVoice, setShareOfVoice] = useState(0);
  const [citationsByWeek, setCitationsByWeek] = useState<CitationByWeek[]>([]);
  const [articles, setArticles] = useState<ArticleCitation[]>([]);
  const [cwv, setCwv] = useState<CWVEntry[]>([]);
  const [staleCount, setStaleCount] = useState(0);
  const [leads30d, setLeads30d] = useState(0);
  const [topPages, setTopPages] = useState<Array<{ title: string; slug: string; leads: number; cited: number }>>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [tier, setTier] = useState<string>("free");
  const [totalCited, setTotalCited] = useState(0);
  const [aiCrawlerRows, setAiCrawlerRows] = useState<AiCrawlerRow[]>([]);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const res = await fetch("/api/ai-crawlers");
      if (res.ok) {
        const data = await res.json();
        setAiCrawlerRows((data.rows ?? []) as AiCrawlerRow[]);
      }
    } catch {
      setAiCrawlerRows([]);
    }

    // Trust score
    const { data: profile } = await supabase.from("profiles").select("trust_score, tier").eq("id", user.id).single();
    setTrustScore(profile?.trust_score ?? 0);
    setTier((profile?.tier as string) ?? "free");

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
      setTotalCited(cited);

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
      const articleMap = new Map<string, { title: string; chatgpt: boolean; yandexgpt: boolean; gigachat: boolean; perplexity: boolean }>();
      for (const c of citations) {
        const title = (c.content_packages as unknown as { title: string })?.title ?? "";
        const key = c.content_id as string;
        if (!articleMap.has(key)) articleMap.set(key, { title, chatgpt: false, yandexgpt: false, gigachat: false, perplexity: false });
        const entry = articleMap.get(key)!;
        if (c.is_cited) {
          const platform = c.ai_platform as string;
          if (platform === "chatgpt") entry.chatgpt = true;
          else if (platform === "yandexgpt") entry.yandexgpt = true;
          else if (platform === "gigachat") entry.gigachat = true;
          else if (platform === "perplexity") entry.perplexity = true;
        }
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

    // Top 5 pages (by leads + citations)
    const { data: allPkgs } = await supabase
      .from("content_packages")
      .select("id, title, slug")
      .eq("expert_id", user.id)
      .eq("status", "published")
      .limit(50);

    if (allPkgs?.length) {
      const pkgIds = allPkgs.map((p) => p.id);
      const { data: pkgLeads } = await supabase
        .from("leads")
        .select("content_id")
        .in("content_id", pkgIds);
      const { data: pkgCitations } = await supabase
        .from("citation_checks")
        .select("content_id")
        .in("content_id", pkgIds)
        .eq("is_cited", true);

      const leadMap: Record<string, number> = {};
      const citeMap: Record<string, number> = {};
      for (const l of pkgLeads ?? []) {
        if (l.content_id) leadMap[l.content_id] = (leadMap[l.content_id] || 0) + 1;
      }
      for (const c of pkgCitations ?? []) {
        if (c.content_id) citeMap[c.content_id] = (citeMap[c.content_id] || 0) + 1;
      }

      const ranked = allPkgs
        .map((p) => ({
          title: p.title as string,
          slug: p.slug as string,
          leads: leadMap[p.id] || 0,
          cited: citeMap[p.id] || 0,
        }))
        .sort((a, b) => (b.leads * 3 + b.cited) - (a.leads * 3 + a.cited))
        .slice(0, 5);

      setTopPages(ranked);
    }
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
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Аналитика</h1>

      {/* Guarantee progress banner */}
      {(() => {
        const guaranteeMap: Record<string, number> = { starter: 2, pro: 5, expert: 10 };
        const target = guaranteeMap[tier];
        if (!target) return null;
        const progress = Math.min(100, Math.round((totalCited / target) * 100));
        const reached = totalCited >= target;
        return (
          <div className={`mb-6 rounded-xl border p-4 ${reached ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">
                {reached
                  ? `Гарантия выполнена! ${totalCited} цитирований`
                  : `Прогресс: ${totalCited}/${target} цитирований к гарантии`}
              </span>
              <a href="/terms#guarantee" className="text-xs text-blue-600 hover:underline">
                Условия
              </a>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${reached ? "bg-green-500" : "bg-blue-600"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        );
      })()}

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
      {aiCrawlerRows.length > 0 && (
        <div className="bg-white rounded-xl border p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">AI-краулеры сайта</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {aiCrawlerRows.slice(0, 6).map((row) => (
              <div key={`${row.metric_date}-${row.bot_name}`} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900">{row.bot_name}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    row.failed_hits > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                  }`}>
                    {row.metric_date}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-gray-900">{row.hits}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {row.unique_paths} URL, ошибок: {row.failed_hits}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Данные появляются после импорта access-логов: `pnpm aeo:crawlers -- access.log --push`.
          </p>
        </div>
      )}

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

      {/* Top 5 pages */}
      {topPages.length > 0 && (
        <div className="bg-white rounded-xl border p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Топ-5 страниц</h2>
          <div className="space-y-3">
            {topPages.map((p, i) => (
              <div key={p.slug} className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                </div>
                <div className="flex gap-4 text-xs text-gray-500 flex-shrink-0">
                  <span>{p.leads} заявок</span>
                  <span>{p.cited} цитирований</span>
                </div>
              </div>
            ))}
          </div>
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
                  <th className="px-3 py-2 text-center font-medium text-gray-500">GigaChat</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500">Perplexity</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 text-gray-900 truncate max-w-xs">{a.title}</td>
                    <td className="px-3 py-2 text-center">{a.chatgpt ? <span className="text-green-600">&#10003;</span> : <span className="text-red-400">&#10007;</span>}</td>
                    <td className="px-3 py-2 text-center">{a.yandexgpt ? <span className="text-green-600">&#10003;</span> : <span className="text-red-400">&#10007;</span>}</td>
                    <td className="px-3 py-2 text-center">{a.gigachat ? <span className="text-green-600">&#10003;</span> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2 text-center">{a.perplexity ? <span className="text-green-600">&#10003;</span> : <span className="text-gray-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* B2B: Competitor comparison */}
      <CompetitorCompare yourMentions={citationsByWeek.reduce((s, w) => s + w.count, 0)} />

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
