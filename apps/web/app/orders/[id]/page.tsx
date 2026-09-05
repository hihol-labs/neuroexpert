import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/nav";
import { DetailsForm } from "./details-form";
import { StatusRefresh } from "./status-refresh";
import { buildReportSnapshot } from "shared";

/**
 * /orders/[id] — страница статуса заказа (G-018). Owner-only: без сессии —
 * на /login с возвратом сюда (magic link из письма после оплаты ведёт именно
 * сюда через /auth/callback?next=). Прогресс по реальным шагам отчёта — G-019;
 * здесь честный статус и форма дозаполнения (решение AF-1 №2).
 */

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Статус заказа — НейроЭксперт", robots: { index: false } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_TEXT: Record<string, { title: string; body: string }> = {
  pending: { title: "Ожидаем оплату", body: "Заказ создан, платёж ещё не подтверждён кассой. Если вы уже оплатили — статус обновится в течение минуты." },
  paid: { title: "Оплата получена — готовим отчёт", body: "Система опрашивает AI-платформы по спросу вашей ниши. Статус обновляется автоматически; после готовности отправим письмо." },
  delivered: { title: "Отчёт готов", body: "Ниже сохранён результат замера. При повторном просмотре ответы и оценки остаются прежними." },
  failed: { title: "Платёж не прошёл", body: "Деньги не списаны. Можно оформить заказ заново." },
  refunded: { title: "Возврат выполнен", body: "Касса подтвердила возврат. Срок зачисления зависит от вашего банка." },
};

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export default async function OrderStatusPage({ params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) notFound();

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/orders/${params.id}`);

  const { data: order } = await getAdmin()
    .from("package_orders")
    .select("id, owner_id, package, amount_rub, city, status, job_id, details, confirmation_url, niches(name), report, report_mode, delivered_at, paid_at, refund_status")
    .eq("id", params.id)
    .maybeSingle();
  if (!order || order.owner_id !== user.id) notFound();

  const text = order.status === "failed" && order.paid_at
    ? {title:"Замер не выполнен",body:order.refund_status === "submitted" ? "Возврат отправлен в кассу. Ожидаем подтверждения." : "Возврат ожидает обработки. Система повторит попытку автоматически."}
    : STATUS_TEXT[order.status as string] ?? STATUS_TEXT.pending;
  const report = order.report ? buildReportSnapshot(order.report) : null;
  const nicheName = (order.niches as { name?: string } | null)?.name ?? "";
  const details = (order.details ?? {}) as Record<string, string>;

  return (
    <div className="sr-site dm-site">
      <MarketingHeader />
      <main>
        <StatusRefresh active={["pending","paid"].includes(order.status) || (order.status === "failed" && Boolean(order.paid_at))} />
        <section className="dm-hero" data-order-status={order.status}>
          <p className="sr-eyebrow"><span /> Аудит Старт · {nicheName}, {order.city}</p>
          <h1>{text.title}</h1>
          <p>{text.body}</p>
          {order.status === "pending" && order.confirmation_url && (
            <p className="dm-pay-note"><a href={order.confirmation_url}>Перейти к оплате {order.amount_rub.toLocaleString("ru-RU")} ₽</a></p>
          )}
          {order.status === "failed" && !order.paid_at && (
            <p className="dm-pay-note"><Link href="/pricing">Посмотреть пакеты</Link></p>
          )}
        </section>
        {order.status === "paid" && <DetailsForm orderId={order.id} initial={details} />}
        {report && <section data-order-report="audit_start" style={{maxWidth:960,margin:"0 auto",padding:"24px 20px 80px"}}>
          <h2>Спрос и ответы AI-платформ</h2>
          <p>Замер: {new Date(report.ran_at).toLocaleString("ru-RU")} · {order.report_mode === "degraded" ? "Часть источников недоступна" : "Все подключённые платформы ответили"}</p>
          <p>Вопросы расположены по частотности Wordstat. Более высокий gap-score означает больше отсутствующих структурных маркеров; это не оценка точности ответа.</p>
          {report.gaps.map((gap,i)=><article key={gap.source_question_id} style={{marginTop:32,padding:24,border:"1px solid rgba(255,255,255,.15)",borderRadius:16}}>
            <h3>{i+1}. {gap.question}</h3>
            <p>Wordstat: {gap.monthly_volume === null ? "частотность неизвестна" : `${gap.monthly_volume.toLocaleString("ru-RU")} запросов/мес.`} · сбор {new Date(gap.collected_at).toLocaleDateString("ru-RU")}</p>
            {gap.platforms.map(p=><details key={p.platform} style={{marginTop:16}}>
              <summary>{p.platform} · {p.status === "unavailable" ? "Источник недоступен" : `gap-score ${p.gap_score}/10`}</summary>
              {p.status === "answered" && <><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{p.ai_response}</p><p>{p.weakness}</p><small>Анализ: {p.method === "heuristic" ? "эвристические правила" : p.method}</small></>}
            </details>)}
          </article>)}
          <h2 style={{marginTop:40}}>Как использовать результат</h2>
          <p>Начните с частых вопросов, где в ответах не хватает источников и конкретных примеров. Подготовьте материалы с проверяемыми фактами и собственными кейсами. Этот замер фиксирует ответы на указанную дату и не гарантирует будущих упоминаний.</p>
        </section>}
      </main>
      <MarketingFooter />
    </div>
  );
}
