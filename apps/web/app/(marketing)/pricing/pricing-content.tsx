"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, MoveRight } from "lucide-react";

type Audience = "business" | "expert";

type Offer = {
  name: string;
  price: string;
  period: string;
  fit: string;
  scope: string[];
  cta: string;
  href: string;
  highlight?: boolean;
};

const BUSINESS_STAGES: Array<{
  id: string;
  number: string;
  name: string;
  verb: string;
  description: string;
  offers: Offer[];
}> = [
  {
    id: "audit",
    number: "01",
    name: "Аудит",
    verb: "Увидеть потери",
    description: "Карты, поиск, нейросети, конкуренты и путь клиента до обращения.",
    offers: [
      {
        name: "Аудит Старт",
        price: "7 900 ₽",
        period: "разово",
        fit: "Одна точка и один город. Быстрая диагностика первых точек роста.",
        scope: ["1 филиал или кабинет", "3 ключевые площадки", "До 5 конкурентов", "10 коммерческих запросов", "Карта первых страниц", "План действий на 7 дней"],
        cta: "Получить аудит",
        href: "/launch?package=audit_start",
      },
      {
        name: "Аудит Рост",
        price: "14 900 ₽",
        period: "разово",
        fit: "Основной контур для бизнеса, которому нужны конкуренты, видимость и план роста.",
        scope: ["1–2 филиала", "Карты, Авито, сайт, соцсети", "До 10 конкурентов", "20 коммерческих запросов", "Сигналы кликов и заявок", "План действий на 14 дней"],
        cta: "Выбрать аудит",
        href: "/launch?package=audit_growth",
        highlight: true,
      },
      {
        name: "Аудит Полный",
        price: "24 900 ₽",
        period: "разово",
        fit: "Несколько точек, высокая конкуренция или сложная локальная выдача.",
        scope: ["До 3–5 филиалов", "Все релевантные площадки", "До 20 конкурентов", "40 коммерческих запросов", "Поведенческая воронка", "План роста на 30 дней"],
        cta: "Заказать полный аудит",
        href: "/launch?package=audit_full",
      },
    ],
  },
  {
    id: "launch",
    number: "02",
    name: "Запуск",
    verb: "Собрать канал",
    description: "Упаковка точек входа, страницы под спрос, события и первый рабочий ритм.",
    offers: [
      {
        name: "Запуск Старт",
        price: "31 100 ₽",
        period: "30 дней",
        fit: "Одна точка и одно направление услуг — без лишнего масштаба на старте.",
        scope: ["Упаковка карточек", "Услуги, FAQ и CTA", "5–7 страниц под спрос", "События кликов и заявок", "Сценарий сбора отзывов", "Первый недельный отчёт"],
        cta: "Запустить Старт",
        href: "/launch?package=launch_start",
      },
      {
        name: "Запуск Рост",
        price: "54 100 ₽",
        period: "30 дней",
        fit: "Главный пакет для клиник, салонов, юрфирм и локальных сервисов.",
        scope: ["1–2 точки или 2–3 направления", "Карты, Авито, сайт и соцсети", "10–15 страниц под спрос", "Задачи из поведения клиентов", "Ежедневный рабочий ритм", "Учёт обращений и возврата"],
        cta: "Выбрать запуск",
        href: "/launch?package=launch_growth",
        highlight: true,
      },
      {
        name: "Запуск Интенсив",
        price: "94 100 ₽",
        period: "30 дней",
        fit: "Несколько точек и высокая конкуренция — нужен быстрый ручной запуск.",
        scope: ["До 3–5 точек", "Несколько направлений услуг", "20–30 подтверждённых страниц", "Полная поведенческая воронка", "Отзывы, Авито и конкуренты", "Интенсивный ритм внедрения"],
        cta: "Обсудить интенсив",
        href: "/launch?package=launch_intensive",
      },
    ],
  },
  {
    id: "support",
    number: "03",
    name: "Сопровождение",
    verb: "Ускорять продажи",
    description: "Ежедневные действия, контроль лидов, обновление точек входа и отчёт собственнику.",
    offers: [
      {
        name: "Лайт",
        price: "29 000 ₽",
        period: "/ месяц",
        fit: "Одна точка. Команда бизнеса готова выполнять задачи самостоятельно.",
        scope: ["Мониторинг видимости", "Гео-рейтинг и конкуренты", "Ежедневные задачи", "Недельный отчёт", "Базовая аналитика заявок"],
        cta: "Начать сопровождение",
        href: "/launch?package=support_control",
      },
      {
        name: "Managed",
        price: "49 000 ₽",
        period: "/ месяц",
        fit: "Основной формат: часть задач выполняет команда НейроЭксперт.",
        scope: ["1–2 точки", "Карточки, услуги, FAQ и отзывы", "Динамика конкурентов", "Обновление страниц под спрос", "Повторные касания", "Отчёт по заявкам и росту"],
        cta: "Выбрать сопровождение",
        href: "/launch?package=support_managed",
        highlight: true,
      },
      {
        name: "Рост",
        price: "79 000 ₽",
        period: "/ месяц",
        fit: "Несколько точек и полный управляемый контур привлечения клиентов.",
        scope: ["До 3–5 точек", "Все каналы системы", "Ежедневное управление", "Отзывы, Авито и страницы", "Контроль повторных касаний", "Регулярный отчёт собственнику"],
        cta: "Обсудить рост",
        href: "/launch?package=support_growth",
      },
    ],
  },
];

const BUSINESS_SYSTEMS = [
  ["01", "Видимость", "карты · Авито · поиск · нейросети"],
  ["02", "Точки входа", "услуги · районы · цены · FAQ"],
  ["03", "Поведение", "просмотры · клики · заявки · звонки"],
  ["04", "Доверие", "отзывы · доказательства · ответы"],
  ["05", "Возврат", "пропущенные · старые лиды · касания"],
];

const PRICE_FACTORS = [
  "Филиалы и города",
  "Количество площадок",
  "Конкуренты и запросы",
  "Глубина аналитики лидов",
  "Доля ручной работы",
  "Скорость запуска",
];

const EXPERT_PLANS: Offer[] = [
  { name: "Free", price: "0 ₽", period: "навсегда", fit: "Проверить спрос и опубликовать первые страницы без риска.", scope: ["1 ниша", "3 страницы в месяц", "Карта спроса", "2 формата контента", "Комиссия 15%"], cta: "Начать бесплатно", href: "/scan" },
  { name: "Starter", price: "1 490 ₽", period: "/ месяц", fit: "Регулярно закрывать подтверждённый спрос экспертными страницами.", scope: ["2 ниши", "Страницы без лимита", "Все 5 форматов", "Полный экспорт", "Комиссия 7%"], cta: "Выбрать Starter", href: "#funnel-contact" },
  { name: "Pro", price: "2 990 ₽", period: "/ месяц", fit: "Добавить дистрибуцию и быстрее видеть, что приводит заявки.", scope: ["3 ниши", "Всё из Starter", "Кросспостинг", "Помощь с распространением", "Комиссия 3%"], cta: "Выбрать Pro", href: "#funnel-contact", highlight: true },
  { name: "Expert", price: "4 990 ₽", period: "/ месяц", fit: "Видеть весь путь: спрос, трафик, клики, запись и заявка.", scope: ["5 ниш", "Всё из Pro", "Аналитика страниц", "Сравнение с конкурентами", "Комиссия 0%"], cta: "Выбрать Expert", href: "#funnel-contact" },
];

const EXPERT_COMPARISON = [
  ["Ниши", "1", "2", "3", "5"],
  ["Страницы", "3 / мес", "без лимита", "без лимита", "без лимита"],
  ["Форматы", "2", "все 5", "все 5", "все 5"],
  ["Кросспостинг", "—", "—", "да", "да"],
  ["Аналитика", "—", "—", "—", "да"],
  ["Комиссия", "15%", "7%", "3%", "0%"],
];

/**
 * Слот `children` рендерится внутри <main>: блок оффера на этом маршруте
 * раньше стоял в page.tsx рядом с <main> и оказывался ВНЕ landmark, поэтому
 * переход скринридера к основному содержимому его пропускал (находка ревью,
 * раунд 17). На остальных восьми маршрутах <main> живёт в самой странице.
 */
export function PricingContent({ children, initialAudience = "business" }: {
  children?: React.ReactNode;
  /** Аудитория из query-параметра `?for=`, вычисленная на сервере. */
  initialAudience?: Audience;
}) {
  const [audience, setAudience] = useState<Audience>(initialAudience);

  // Внешние CTA («Выбрать тариф эксперта» на /for-experts) ведут на
  // /pricing?for=expert. При клиентской навигации Next отдаёт новое значение
  // пропа, а не перемонтирует компонент, поэтому состояние синхронизируется
  // здесь: без этого повторный переход по той же ссылке после ручного
  // переключения оставлял бы бизнес-пакеты (находка раунда 24).
  useEffect(() => {
    setAudience(initialAudience);
  }, [initialAudience]);
  const [stageIndex, setStageIndex] = useState(1);
  const [offerIndex, setOfferIndex] = useState(1);
  const [expertIndex, setExpertIndex] = useState(2);

  function selectStage(index: number) {
    setStageIndex(index);
    setOfferIndex(1);
  }

  return (
    <main className="sr-site pr-room">
      <section className="pr-hero">
        <div className="pr-hero-copy">
          <p className="sr-eyebrow"><span /> Тарифы / объём системы</p>
          <h1>Цена следует <em>за масштабом задачи.</em></h1>
          <p className="pr-lede">
            Сначала определяем следующий предел роста. Затем подключаем ровно тот
            контур, который нужен, чтобы дойти от спроса до обращения.
          </p>
          <div className="pr-audience" id="experts" role="group" aria-label="Для кого подобрать тариф">
            <button type="button" aria-pressed={audience === "business"} onClick={() => setAudience("business")}>Бизнес</button>
            <button type="button" aria-pressed={audience === "expert"} onClick={() => setAudience("expert")}>Эксперт</button>
          </div>
          <a className="sr-button sr-button-primary" href="#pricing-selector">
            Настроить контур <ArrowRight aria-hidden="true" />
          </a>
        </div>

        <div className="pr-scope" aria-hidden="true">
          <div className="pr-scope-head"><span>LIVE SCOPE</span><span>03 / 03</span></div>
          <div className="pr-scope-axis"><i /><i /><i /><b /></div>
          {BUSINESS_STAGES.map((stage, index) => (
            <div className="pr-scope-row" key={stage.id}>
              <span>{stage.number}</span>
              <strong>{stage.name}</strong>
              <div><i style={{ width: `${38 + index * 26}%` }} /></div>
              <small>{index === 0 ? "7.9—24.9" : index === 1 ? "31.1—94.1" : "29—79"}</small>
            </div>
          ))}
          <div className="pr-scope-signal"><span>INPUT</span><b>следующий предел роста</b><MoveRight /><span>OUTPUT</span><b>управляемый контур</b></div>
        </div>
      </section>

      {audience === "business" ? (
        <BusinessSelector stageIndex={stageIndex} offerIndex={offerIndex} onStage={selectStage} onOffer={setOfferIndex} />
      ) : (
        <ExpertSelector index={expertIndex} onSelect={setExpertIndex} />
      )}

      {children}
    </main>
  );
}

function BusinessSelector({ stageIndex, offerIndex, onStage, onOffer }: { stageIndex: number; offerIndex: number; onStage: (index: number) => void; onOffer: (index: number) => void }) {
  const stage = BUSINESS_STAGES[stageIndex];
  const offer = stage.offers[offerIndex];

  return (
    <>
      <section className="pr-selector" id="pricing-selector">
        <header className="pr-section-head">
          <div><p className="sr-eyebrow sr-eyebrow-dark"><span /> Scale selector</p><h2>Выберите текущий этап.</h2></div>
          <p>Каждый следующий уровень расширяет не список обещаний, а объём площадок, данных и ручной работы.</p>
        </header>

        <div className="pr-stage-switch" role="group" aria-label="Этап работы">
          {BUSINESS_STAGES.map((item, index) => (
            <button type="button" key={item.id} aria-pressed={stageIndex === index} onClick={() => onStage(index)}>
              <span>{item.number}</span><b>{item.name}</b><small>{item.verb}</small>
            </button>
          ))}
        </div>

        <div className="pr-configurator">
          <div className="pr-offer-rail" role="group" aria-label={`Масштаб этапа «${stage.name}»`}>
            <p>{stage.description}</p>
            {stage.offers.map((item, index) => (
              <button type="button" key={item.name} aria-pressed={offerIndex === index} onClick={() => onOffer(index)}>
                <span>0{index + 1}</span><b>{item.name}</b><small>{item.price}</small><i style={{ width: `${36 + index * 27}%` }} />
              </button>
            ))}
          </div>

          <article className="pr-offer-detail" key={`${stage.id}-${offer.name}`}>
            <div className="pr-offer-meta"><span>{stage.number} / {stage.name}</span>{offer.highlight && <b>Опорный масштаб</b>}</div>
            <h3>{offer.name}</h3>
            <div className="pr-price"><strong>{offer.price}</strong><span>{offer.period}</span></div>
            <p>{offer.fit}</p>
            <ul>{offer.scope.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
            <Link href={offer.href}>Выбрать этот контур <ArrowRight aria-hidden="true" /></Link>
          </article>
        </div>
      </section>

      <SystemLedger />

      <section className="pr-factors">
        <div><p className="sr-eyebrow sr-eyebrow-dark"><span /> Pricing logic</p><h2>Цена меняется только вместе с объёмом.</h2></div>
        <ol>{PRICE_FACTORS.map((factor, index) => <li key={factor}><span>0{index + 1}</span>{factor}</li>)}</ol>
      </section>

      <section className="pr-enterprise">
        <p>Сети / франшизы / 5+ филиалов</p>
        <h2>Сложный контур сначала проектируем.</h2>
        <Link className="sr-button sr-button-light" href="/launch?package=enterprise">Обсудить проект <ArrowRight aria-hidden="true" /></Link>
      </section>
    </>
  );
}

function SystemLedger() {
  return (
    <section className="pr-ledger">
      <header><p className="sr-eyebrow"><span /> System contour</p><h2>Пять систем.<br />Один путь к продаже.</h2><p>На каждом этапе меняется глубина: диагностировать → внедрить → управлять.</p></header>
      <div className="pr-ledger-table">
        <div className="pr-ledger-head"><span>№ / Система</span><span>Сигналы</span><span>Аудит</span><span>Запуск</span><span>Ритм</span></div>
        {BUSINESS_SYSTEMS.map(([number, name, signals]) => (
          <div className="pr-ledger-row" key={number}><span>{number}</span><b>{name}</b><small>{signals}</small><i>find</i><i>build</i><i>run</i></div>
        ))}
      </div>
    </section>
  );
}

function ExpertSelector({ index, onSelect }: { index: number; onSelect: (index: number) => void }) {
  const offer = EXPERT_PLANS[index];
  return (
    <>
      <section className="pr-selector pr-expert" id="pricing-selector">
        <header className="pr-section-head"><div><p className="sr-eyebrow sr-eyebrow-dark"><span /> Expert scale</p><h2>Растите после появления сигнала.</h2></div><p>Начните бесплатно. Переходите дальше, когда публикации становятся регулярными, а заявки — измеримыми.</p></header>
        <div className="pr-expert-layout">
          <div className="pr-plan-scale" role="group" aria-label="Тариф для эксперта">
            {EXPERT_PLANS.map((plan, planIndex) => (
              <button type="button" key={plan.name} aria-pressed={index === planIndex} onClick={() => onSelect(planIndex)}><span>0{planIndex + 1}</span><b>{plan.name}</b><small>{plan.price}</small><i /></button>
            ))}
          </div>
          <article className="pr-offer-detail" key={offer.name}>
            <div className="pr-offer-meta"><span>Тариф эксперта / 0{index + 1}</span>{offer.highlight && <b>Популярный</b>}</div>
            <h3>{offer.name}</h3><div className="pr-price"><strong>{offer.price}</strong><span>{offer.period}</span></div><p>{offer.fit}</p>
            <ul>{offer.scope.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
            <Link href={offer.href}>{offer.cta} <ArrowRight aria-hidden="true" /></Link>
          </article>
        </div>
      </section>

      <section className="pr-compare">
        <header><p className="sr-eyebrow"><span /> Capability ledger</p><h2>Сравнение без мелкого шрифта.</h2></header>
        <div className="pr-compare-table" role="table" aria-label="Сравнение тарифов для экспертов">
          <div className="pr-compare-row pr-compare-head" role="row"><span role="columnheader">Возможность</span>{EXPERT_PLANS.map((plan) => <b role="columnheader" key={plan.name}>{plan.name}</b>)}</div>
          {EXPERT_COMPARISON.map((row) => <div className="pr-compare-row" role="row" key={row[0]}>{row.map((cell, cellIndex) => cellIndex === 0 ? <span role="rowheader" key={cell}>{cell}</span> : <b role="cell" key={`${cell}-${cellIndex}`}>{cell}</b>)}</div>)}
        </div>
      </section>

      <section className="pr-enterprise"><p>Первый шаг / 0 ₽</p><h2>Проверьте спрос до подписки.</h2><Link className="sr-button sr-button-light" href="/scan">Начать бесплатно <ArrowRight aria-hidden="true" /></Link></section>
    </>
  );
}
