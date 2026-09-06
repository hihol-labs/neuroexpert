import type { Metadata } from "next";
import Link from "next/link";
import { buildReportSnapshot } from "shared";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/nav";
import { OfferBlock } from "@/components/marketing/offer";
import { ReportView } from "@/components/report/report-view";
import { auditStartHref } from "@/lib/checkout";
import { CASES } from "@/content/cases";
import fixture from "@/content/example-report.json";

/**
 * /audit/example — публичный «пример отчёта» Audit Start (G-013, proof-слой).
 * Данные — реальный снапшот отчёта (apps/web/content/example-report.json, собран
 * scripts/export-example-report.mjs через продюсер packages/shared delivery), тексты
 * ответов платформ приведены дословно. Рендер тот же, что видит владелец заказа
 * (components/report/report-view.tsx). Никаких цифр «до/после» до первого кейса.
 */

export const metadata: Metadata = {
  title: "Пример отчёта Audit Start — НейроЭксперт",
  description: "Реальный замер видимости в нейросетях по паре «стоматология × Тюмень»: 10 вопросов из Wordstat, ответы ChatGPT, Яндекс.GPT и GigaChat дословно, разрывы и план доработки.",
  alternates: { canonical: "/audit/example" },
  openGraph: { title: "Пример отчёта Audit Start", description: "Реальный замер по паре «стоматология × Тюмень»: ответы AI-платформ дословно и план доработки.", type: "article" },
};

// Флаг checkout читается на каждый запрос (как /pricing): CTA заказа не запекается в сборку.
export const dynamic = "force-dynamic";

export default function ExampleReportPage() {
  const report = buildReportSnapshot(fixture.report);
  const meta = fixture.meta;
  const ranDate = report.ran_at.slice(0, 10);

  return (
    <div className="sr-site dm-site">
      <MarketingHeader />
      <main>
        <section className="dm-hero" data-example-report="audit_start" data-example-mode={meta.mode} data-example-date={ranDate}>
          <p className="sr-eyebrow"><span /> Пример отчёта · Audit Start · {meta.pair}</p>
          <h1>Так выглядит отчёт, который получает клиент.</h1>
          <p>
            Реальный замер от {new Date(report.ran_at).toLocaleDateString("ru-RU")}: {report.gaps.length} вопросов из Wordstat по паре «{meta.pair}»,
            платформы {report.platforms_tried.join(", ")}, режим {meta.mode === "full" ? "полный — все платформы ответили на все вопросы" : "degraded — часть источников была недоступна"}.
          </p>
          <p data-example-disclaimer="" className="dm-pay-note">
            {meta.source_note} Замер фиксирует ответы платформ на дату и не гарантирует будущих упоминаний.
            Ваш отчёт строится по вашей паре «ниша × город» тем же способом.
          </p>
        </section>

        <ReportView report={report} mode={meta.mode} />

        <section data-cases="" style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px 48px" }}>
          <h2>Кейсы: замер ДО и ПОСЛЕ</h2>
          {CASES.length === 0 ? (
            <div data-cases-empty="">
              <p>Кейсов пока нет. Первый появится после внедрения у первого клиента и повторного замера тем же корпусом вопросов.</p>
              <p>Формат кейса: пара «ниша × город», метрика, значение до и после, даты и платформы замеров, честная пометка ограничений.</p>
            </div>
          ) : (
            <ul>
              {CASES.map((c) => (
                <li key={`${c.pair}-${c.period}`} data-case="">
                  <strong>{c.pair}</strong> · {c.metric}: {c.before} → {c.after} ({c.period}). Источник: {c.source}{c.note ? `. ${c.note}` : ""}
                </li>
              ))}
            </ul>
          )}
        </section>

        <OfferBlock
          artifact="Отчёт по вашей паре «ниша × город»: 10 вопросов из Wordstat, ответы AI-платформ дословно, разрывы и план доработки"
          price="7 900 ₽"
          term="до 15 минут после оплаты, не дольше часа"
          cta={{ href: auditStartHref(), label: "Заказать Audit Start" }}
          note="Отчёт формирует система без участия сотрудника; внедрение делает ваша команда, повторный замер показывает факт."
        />
        <p className="dm-pay-note" style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px 48px" }}>
          Бесплатно и без заказа: <Link href="/audit">карта спроса по нише</Link> и <Link href="/scan">проверка видимости</Link>.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
