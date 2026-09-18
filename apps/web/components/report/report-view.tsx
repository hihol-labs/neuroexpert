import { computeMoneyBlock } from "shared";
import type { MoneyBlock, MoneyDetails, ReportSnapshot } from "shared";

/**
 * Единый рендер отчёта Audit Start (G-013): владелец заказа на /orders/[id] и
 * публичный пример /audit/example видят один и тот же компонент — «показали одно,
 * выдали другое» исключено. Данные — ReportSnapshot v1 (продюсер packages/shared
 * delivery). Структура — отчёт v2 (AEO_PLAN §2): интенты, карта видимости, цитируемые
 * домены, план доработки; разделы v2, для которых Audit Start данных не собирает
 * («флаг цен», «4 точки входа», «ДО/ПОСЛЕ»), показаны как структура с пометкой —
 * без чисел и без обещаний.
 */

const INTENT_LABELS: Record<string, string> = {
  transactional: "Транзакционные — «сколько стоит», «записаться», «где сделать»",
  commercial: "Коммерческие — «как выбрать», «лучший», «отзывы»",
  informational: "Информационные — «как», «почему», «что делать»",
};

const DOMAIN_RE = /https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi;

export function citedDomains(report: ReportSnapshot): Array<{ domain: string; mentions: number }> {
  const counts = new Map<string, number>();
  for (const gap of report.gaps) {
    for (const p of gap.platforms) {
      if (p.status !== "answered") continue;
      for (const m of p.ai_response.matchAll(DOMAIN_RE)) {
        const d = m[1].toLowerCase().replace(/^www\./, "");
        counts.set(d, (counts.get(d) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()].map(([domain, mentions]) => ({ domain, mentions })).sort((a, b) => b.mentions - a.mentions);
}

function V2Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <div data-v2-placeholder="" style={{ marginTop: 16, padding: 16, border: "1px dashed rgba(127,127,127,.5)", borderRadius: 12 }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ margin: "8px 0 0" }}>{body}</p>
      <small>Раздел появится в отчёте v2 (пакеты внедрения). В Audit Start эти данные не собираются.</small>
    </div>
  );
}

const SOURCE_TAGS: Record<string, string> = { wordstat: "измерено", measured: "измерено", client: "ваша цифра" };

/**
 * R-05b: потери в клиентах и рублях. Блок есть только когда клиент сам дал чек и конверсию и
 * есть сайт или название, по которым мы проверили ответы платформ; иначе computeMoneyBlock -> null.
 */
function MoneySection({ money, assumptionsLabel }: { money: MoneyBlock; assumptionsLabel?: string }) {
  const rub = money.lost_rub.toLocaleString("ru-RU");
  const clients = money.lost_clients.toLocaleString("ru-RU");
  return (
    <section data-report-section="money" style={{ marginTop: 24, padding: 24, border: "2px solid currentColor", borderRadius: 16 }}>
      <h2 style={{ marginTop: 0 }}>Сколько это в деньгах</h2>
      {assumptionsLabel && <p data-money-example=""><strong>Для примера:</strong> {assumptionsLabel}. В вашем отчёте здесь будут ваши цифры.</p>}
      {money.questions_unnamed === 0 ? (
        <p style={{ fontSize: 22 }}>Нейросети называют вас во всех {money.questions_measured} измеренных вопросах — потерь по этой формуле нет: <strong>0 ₽</strong>.</p>
      ) : (
        <p style={{ fontSize: 22 }}>
          Вас не называют в {money.questions_unnamed} из {money.questions_measured} вопросов. Оценка потерь:{" "}
          <strong>около {clients} клиентов в месяц — это {rub} ₽</strong> по вашему чеку.
        </p>
      )}
      <p>Как посчитано: {money.volume_unnamed.toLocaleString("ru-RU")} запросов/мес. × {money.conversion_pct.toLocaleString("ru-RU")}% × {money.avg_check_rub.toLocaleString("ru-RU")} ₽ = {rub} ₽ в месяц.</p>
      <ul>
        {money.multipliers.map((m) => (
          <li key={m.key} data-money-source={m.source}>
            {m.label}: <strong>{m.display}</strong> — <em>{SOURCE_TAGS[m.source] ?? m.source}</em>: {m.source_label}
          </li>
        ))}
      </ul>
      {(money.questions_without_volume > 0 || money.questions_unanswered > 0) && (
        <p><small>В расчёт не вошли: без частотности Wordstat — {money.questions_without_volume}, без ответа платформ — {money.questions_unanswered}.</small></p>
      )}
      <p><small>Частотность Wordstat — это спрос в Яндексе, а не обращения к вам: доля спрашивающих, которые станут клиентами, и средний чек — ваши допущения. Замер фиксирует ответы платформ на дату отчёта. Это оценка, а не прогноз и не гарантия выручки.</small></p>
    </section>
  );
}

export function ReportView({ report, mode, details, assumptionsLabel }: { report: ReportSnapshot; mode: "full" | "degraded" | string | null; details?: MoneyDetails | null; assumptionsLabel?: string }) {
  const money = computeMoneyBlock(report, details);
  const byIntent = new Map<string, typeof report.gaps>();
  for (const gap of report.gaps) {
    const list = byIntent.get(gap.search_intent) ?? [];
    list.push(gap);
    byIntent.set(gap.search_intent, list);
  }
  const domains = citedDomains(report);

  // Обёртку с маркером владеет страница: /orders/[id] — data-order-report (owner-only контур
  // G-019), /audit/example — data-example-report. Здесь только содержимое отчёта.
  return (
    <div className="report-view" style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 80px" }}>
      <h2>Спрос и ответы AI-платформ</h2>
      <p>
        Замер: {new Date(report.ran_at).toLocaleString("ru-RU")} · платформы: {report.platforms_tried.join(", ")} ·{" "}
        {mode === "degraded" ? "часть источников недоступна" : "все подключённые платформы ответили"}
      </p>
      {money && (
        <MoneySection money={money} assumptionsLabel={assumptionsLabel} />
      )}
      <p>Вопросы расположены по частотности Wordstat. Более высокий gap-score означает больше отсутствующих структурных маркеров; это не оценка точности ответа.</p>

      <section data-report-section="intents" style={{ marginTop: 32 }}>
        <h2>Интенты спроса</h2>
        <ul>
          {[...byIntent.entries()].map(([intent, gaps]) => (
            <li key={intent}>
              <strong>{INTENT_LABELS[intent] ?? intent}</strong>: {gaps.length} из {report.gaps.length}
            </li>
          ))}
        </ul>
      </section>

      <section data-report-section="visibility" style={{ marginTop: 32 }}>
        <h2>Карта видимости: что отвечают платформы</h2>
        {report.gaps.map((gap, i) => (
          <article key={gap.source_question_id} style={{ marginTop: 32, padding: 24, border: "1px solid rgba(127,127,127,.3)", borderRadius: 16 }}>
            <h3>{i + 1}. {gap.question}</h3>
            <p>
              Wordstat: {gap.monthly_volume === null ? "частотность неизвестна" : `${gap.monthly_volume.toLocaleString("ru-RU")} запросов/мес.`} · сбор{" "}
              {new Date(gap.collected_at).toLocaleDateString("ru-RU")} · интент: {gap.search_intent}
            </p>
            {gap.platforms.map((p) => (
              <details key={p.platform} style={{ marginTop: 16 }}>
                <summary>{p.platform} · {p.status === "unavailable" ? "Источник недоступен" : `gap-score ${p.gap_score}/10`}</summary>
                {p.status === "answered" && (
                  <>
                    <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{p.ai_response}</p>
                    <p>{p.weakness}</p>
                    <small>Анализ: {p.method === "heuristic" ? "эвристические правила" : p.method}</small>
                  </>
                )}
              </details>
            ))}
          </article>
        ))}
      </section>

      <section data-report-section="domains" style={{ marginTop: 40 }}>
        <h2>Цитируемые домены</h2>
        {domains.length === 0 ? (
          <p>В ответах платформ на эти вопросы источники (ссылки на сайты) не названы. Это само по себе вывод: платформам нечего цитировать в вашей паре «ниша × город» — место свободно.</p>
        ) : (
          <ul>
            {domains.map((d) => (
              <li key={d.domain}>{d.domain} — упоминаний: {d.mentions}</li>
            ))}
          </ul>
        )}
      </section>

      <section data-report-section="plan" style={{ marginTop: 40 }}>
        <h2>План доработки</h2>
        <p>Начните с частых вопросов, где в ответах не хватает источников и конкретных примеров. Подготовьте материалы с проверяемыми фактами и собственными кейсами. Этот замер фиксирует ответы на указанную дату и не гарантирует будущих упоминаний.</p>
      </section>

      <section data-report-section="v2-price-flag" style={{ marginTop: 40 }}>
        <V2Placeholder title="Флаг цен на сайте" body="Проверка, названы ли цены на страницах услуг клиента: платформы охотнее отвечают на «сколько стоит», когда цена есть на странице." />
      </section>
      <section data-report-section="v2-entry-points">
        <V2Placeholder title="4 точки входа" body="Диагностика карт и 2ГИС, отзовиков, сайта (структура, schema, SSR) и ответов нейросетей по одному чек-листу." />
      </section>
      <section data-report-section="v2-before-after">
        <V2Placeholder title="ДО / ПОСЛЕ" body="Повторный замер тем же корпусом вопросов через две недели после публикаций — двухточечное доказательство изменений." />
      </section>
    </div>
  );
}
