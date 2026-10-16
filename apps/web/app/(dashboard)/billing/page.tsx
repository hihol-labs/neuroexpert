"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardValue } from "@/components/ui/card";

const TIER_LABELS: Record<string, { name: string; price: string }> = {
  free: { name: "Free", price: "0 ₽/мес" },
  starter: { name: "Starter", price: "1 490 ₽/мес" },
  pro: { name: "Pro", price: "2 990 ₽/мес" },
  expert: { name: "Expert", price: "4 990 ₽/мес" },
  business: { name: "Business", price: "24 990 ₽/мес" },
  enterprise: { name: "Enterprise", price: "99 990 ₽/мес" },
};

export default function BillingPage() {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  );
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("subscription_tier, subscription_expires_at").eq("id", user.id).single();
      setProfile(p);

      const { data: pays } = await supabase
        .from("payments")
        .select("id, type, amount, currency, status, description, created_at")
        .eq("expert_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setPayments(pays ?? []);
    });
  }, [supabase]);

  const subscribe = async (tier: string) => {
    setLoading(true);
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.confirmation_url) {
      window.location.href = data.confirmation_url;
    }
  };

  if (!profile) return <div className="py-12 text-center text-gray-500">Загрузка...</div>;

  const tier = (profile.subscription_tier as string) || "free";
  const tierInfo = TIER_LABELS[tier] || TIER_LABELS.free;
  const expiresAt = profile.subscription_expires_at as string | null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Биллинг</h1>

      {/* Current plan */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardTitle>Текущий тариф</CardTitle>
          <CardValue>
            <Badge status={tier} className="text-base" />
          </CardValue>
          <p className="text-sm text-gray-500 mt-1">{tierInfo.price}</p>
        </Card>
        <Card>
          <CardTitle>Действует до</CardTitle>
          <CardValue>
            {tier === "free" ? "Бесплатный тариф без срока" : expiresAt ? new Date(expiresAt).toLocaleDateString("ru-RU") : "Бессрочно"}
          </CardValue>
        </Card>
      </div>

      {/* Upgrade */}
      {tier === "free" && (
        <div className="bg-blue-50 rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-2">Хотите больше клиентов?</h2>
          <p className="text-sm text-gray-600 mb-4">Переходите на платный тариф — больше вопросов, меньше комиссия.</p>
          <div className="flex flex-wrap gap-3">
            {(["starter", "pro", "expert"] as const).map((t) => (
              <Button key={t} variant={t === "pro" ? "primary" : "secondary"} onClick={() => subscribe(t)} disabled={loading}>
                {TIER_LABELS[t].name} — {TIER_LABELS[t].price}
              </Button>
            ))}
          </div>
        </div>
      )}

      {tier !== "free" && (
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-2">Управление подпиской</h2>
          {/* R-09 (E-AUTO-15): автосписаний нет - отменять нечего. Честный текст вместо кнопки, которая ничего не делала. */}
          <p className="text-sm text-gray-600 mb-4">
            Подписка не продлевается автоматически: после {expiresAt ? new Date(expiresAt).toLocaleDateString("ru-RU") : "окончания срока"} тариф
            станет бесплатным. Чтобы продлить, оплатите тариф заново.
          </p>
          <div className="flex gap-3">
            {tier !== "expert" && (
              <Button variant="primary" onClick={() => subscribe("expert")} disabled={loading}>
                Перейти на Expert
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Payment history */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">История платежей</h2>
      {payments.length === 0 ? (
        <p className="text-sm text-gray-500">Платежей пока нет</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Дата</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Тип</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Сумма</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Статус</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id as string} className="border-t">
                  <td className="px-4 py-3">{new Date(p.created_at as string).toLocaleDateString("ru-RU")}</td>
                  <td className="px-4 py-3">{p.type as string}</td>
                  <td className="px-4 py-3 font-medium">{(p.amount as number).toLocaleString("ru-RU")} &#8381;</td>
                  <td className="px-4 py-3"><Badge status={p.status as string} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
