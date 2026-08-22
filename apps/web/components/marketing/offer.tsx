import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * Блок оффера маркетингового маршрута (юнит G-010b).
 *
 * Четыре поля, размеченные атрибутами, — контракт с оракулом
 * `scripts/verify-funnel.mjs --check-offer`: артефакт на руки, цена, срок и
 * ровно один основной CTA. Атрибуты — часть контракта, не декорация: снимешь
 * их — гейт покраснеет. Размечены пустой строкой (`data-offer-price=""`)
 * намеренно: голый JSX-атрибут React рендерит как `="true"`, и маркер поля
 * подменил бы собой значение.
 *
 * Граница честности (соблюдать при правках текста): платформа даёт анализ и
 * план, внедрение делает клиент, платформа проверяет факт. Обещать
 * автоматическое внедрение нельзя. Из «инновационного» заявляем только
 * одновременный опрос ИИ-платформ и нишу GEO/AEO — своих моделей и
 * дообучения в коде нет.
 *
 * Цифры берутся из уже объявленных в /pricing пакетов (7 900 / 29 000 /
 * 31 100 ₽) и тарифов экспертов (0 / 1 490 / 2 990 / 4 990 ₽). Новых цен здесь
 * не появляется.
 */
export type OfferProps = {
  /** Что клиент получает на руки. Обещать можно только то, что делает код. */
  artifact: string;
  /** Цена: сумма или «Бесплатно». */
  price: string;
  /** Срок. «—» допустим как явное «не применимо». */
  term: string;
  /** Ровно один основной CTA. */
  cta: { href: string; label: string };
  /** Уточнение границы: что именно делает клиент сам. */
  note?: string;
};

const DEFAULT_NOTE =
  "Анализ и план — на нас. Внедрение делает ваша команда, платформа проверяет факт.";

export function OfferBlock({ artifact, price, term, cta, note }: OfferProps) {
  const external = /^https?:|^tel:|^mailto:/.test(cta.href);

  return (
    <section className="sr-offer" data-offer aria-labelledby="sr-offer-title">
      <div className="sr-offer-head">
        <p className="sr-eyebrow"><span /> Что вы получаете</p>
        <h2 id="sr-offer-title" data-offer-artifact="">{artifact}</h2>
      </div>

      <dl className="sr-offer-terms">
        <div>
          <dt>Цена</dt>
          <dd data-offer-price="">{price}</dd>
        </div>
        <div>
          <dt>Срок</dt>
          <dd data-offer-term="">{term}</dd>
        </div>
      </dl>

      <div className="sr-offer-action">
        {external ? (
          <a
            className="sr-button sr-button-primary"
            data-offer-cta=""
            href={cta.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {cta.label} <ArrowUpRight />
          </a>
        ) : (
          <Link className="sr-button sr-button-primary" data-offer-cta="" href={cta.href}>
            {cta.label} <ArrowUpRight />
          </Link>
        )}
        <p className="sr-offer-note">{note ?? DEFAULT_NOTE}</p>
      </div>
    </section>
  );
}
