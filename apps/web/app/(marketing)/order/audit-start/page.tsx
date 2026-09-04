import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getPackage } from "shared";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/nav";
import { OrderForm } from "./order-form";

/**
 * /order/audit-start — экран заказа пакета «Аудит Старт» (G-018, решение AF-1 №1):
 * ровно три поля до оплаты — ниша (из БД, не хардкод), город, email.
 *
 * Dark launch: пока SELF_SERVE_CHECKOUT !== "live", страница отвечает 404 —
 * публичные CTA ведут на /launch, а канарейка ходит в API с секретным
 * заголовком, минуя эту страницу.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Заказать «Аудит Старт» — НейроЭксперт",
  description: "Замер локального спроса по вашей нише и городу: три поля до оплаты, отчёт формирует система.",
  robots: { index: false, follow: false },
};

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export default async function OrderAuditStartPage() {
  if (process.env.SELF_SERVE_CHECKOUT !== "live") notFound();

  const pkg = getPackage("audit_start");
  if (!pkg) notFound();

  const { data: niches } = await getAdmin()
    .from("niches")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="sr-site dm-site">
      <MarketingHeader />
      <main>
        <section className="dm-hero">
          <p className="sr-eyebrow"><span /> {pkg.title} · {pkg.amountRub.toLocaleString("ru-RU")} ₽</p>
          <h1>Замер спроса по вашей нише и городу.</h1>
          <p>
            Система сама соберёт вопросы реального спроса, опросит AI-платформы и
            сформирует отчёт с планом действий. От вас — три поля. Оплата открывается
            только если замер выполним.
          </p>
        </section>
        <OrderForm niches={(niches ?? []) as Array<{ id: string; name: string }>} amountRub={pkg.amountRub} />
      </main>
      <MarketingFooter />
    </div>
  );
}
