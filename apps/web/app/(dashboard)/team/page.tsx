"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TeamMember {
  id: string;
  expert_id: string;
  role: string;
  joined_at: string;
  profile: {
    full_name: string;
    slug: string;
    qualification: string | null;
    trust_score: number;
    is_published: boolean;
    avg_rating: number;
    review_count: number;
  };
  stats: {
    articles: number;
    leads: number;
  };
}

interface Team {
  id: string;
  name: string;
  max_experts: number;
  subscription_tier: string;
  members: TeamMember[];
}

export default function TeamPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((data) => setTeam(data.team ?? null))
      .catch(() => setTeam(null))
      .finally(() => setLoading(false));
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setMessage("");

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage("Эксперт добавлен в команду!");
      setInviteEmail("");
      // Refresh
      const refreshRes = await fetch("/api/team");
      const refreshData = await refreshRes.json();
      setTeam(refreshData.team ?? null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm("Удалить эксперта из команды?")) return;

    try {
      const res = await fetch("/api/team/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      // Refresh
      const refreshRes = await fetch("/api/team");
      const refreshData = await refreshRes.json();
      setTeam(refreshData.team ?? null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (!team) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Управление командой
        </h1>
        <div className="bg-white rounded-xl border p-8 text-center">
          <p className="text-gray-600 mb-4">
            Управление командой доступно на тарифах Business и Enterprise.
          </p>
          <Link
            href="/billing"
            className="inline-block rounded-lg bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700"
          >
            Перейти к тарифам
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
          <p className="text-sm text-gray-500">
            {team.members.length} / {team.max_experts} экспертов
          </p>
        </div>
        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
          {team.subscription_tier}
        </span>
      </div>

      {/* Invite form */}
      {team.members.length < team.max_experts && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">
            Добавить эксперта
          </h2>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email эксперта (зарегистрированного на платформе)"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={inviting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {inviting ? "..." : "Добавить"}
            </button>
          </form>
          {message && (
            <p
              className={`mt-2 text-sm ${message.includes("Ошибка") || message.includes("не найден") ? "text-red-600" : "text-green-600"}`}
            >
              {message}
            </p>
          )}
        </div>
      )}

      {/* Team members table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Эксперт
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Trust Score
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Статей
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Заявок
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Статус
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {team.members.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600">
                      {m.profile.full_name.charAt(0)}
                    </div>
                    <div>
                      <Link
                        href={`/experts/${m.profile.slug}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {m.profile.full_name}
                      </Link>
                      {m.profile.qualification && (
                        <p className="text-xs text-gray-500">
                          {m.profile.qualification}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="text-center px-4 py-4 text-sm">
                  {m.profile.trust_score > 0
                    ? m.profile.trust_score.toFixed(1)
                    : "—"}
                </td>
                <td className="text-center px-4 py-4 text-sm">
                  {m.stats.articles}
                </td>
                <td className="text-center px-4 py-4 text-sm">
                  {m.stats.leads}
                </td>
                <td className="text-center px-4 py-4">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.profile.is_published
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {m.profile.is_published ? "Опубликован" : "Скрыт"}
                  </span>
                </td>
                <td className="text-right px-6 py-4">
                  {m.role !== "owner" && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Удалить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Team stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {team.members.length}
          </p>
          <p className="text-xs text-gray-500">Экспертов</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {team.members.reduce((s, m) => s + m.stats.articles, 0)}
          </p>
          <p className="text-xs text-gray-500">Статей</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {team.members.reduce((s, m) => s + m.stats.leads, 0)}
          </p>
          <p className="text-xs text-gray-500">Заявок</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {team.members.length > 0
              ? (
                  team.members.reduce(
                    (s, m) => s + m.profile.trust_score,
                    0,
                  ) / team.members.length
                ).toFixed(1)
              : "0"}
          </p>
          <p className="text-xs text-gray-500">Средний Trust Score</p>
        </div>
      </div>
    </div>
  );
}
