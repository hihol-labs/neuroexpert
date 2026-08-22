import Link from "next/link";
import { ArrowRight, Check, CornerDownRight, Crosshair, MessageSquareText, PhoneCall, Search } from "lucide-react";
import { BusinessDemandPath } from "@/components/marketing/business-demand-path";
import { BusinessLeadForm } from "@/components/marketing/business-lead-form";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/nav";
import { generateServiceSchema } from "@/lib/schema-org";
import { OfferBlock } from "@/components/marketing/offer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";
const schema = generateServiceSchema({
  name: "Диагностика локального спроса для бизнеса",
  description: "Находим разрывы между поиском клиента, обращением и продажей — и даём план возврата потерянного спроса.",
  url: `${APP_URL}/for-business`,
  serviceType: "Local demand and conversion diagnostics",
  offers: [
    { name: "Аудит продаж", price: "7900", url: `${APP_URL}/for-business#form` },
    { name: "Запуск за 30 дней", price: "31100", url: `${APP_URL}/launch?package=local_sales_os` },
  ],
});

const routeStages = [
  { index: "01", icon: Search, title: "Ищут", value: "1 240", note: "запросов в месяц", loss: "Карточка ниже конкурентов" },
  { index: "02", icon: Crosshair, title: "Сравнивают", value: "214", note: "переходов", loss: "Не хватает цены и доверия" },
  { index: "03", icon: PhoneCall, title: "Обращаются", value: "38", note: "звонков и форм", loss: "17 без ответа или follow-up" },
  { index: "04", icon: Check, title: "Покупают", value: "13", note: "записей", loss: "Точка роста найдена" },
] as const;

const interventions = [
  ["Видимость", "Карты, 2ГИС, сайт и AI-ответы показывают не вас", "Усилить карточки и страницы под уже существующий спрос"],
  ["Доверие", "Клиент смотрит, но не выбирает", "Добавить цену, свежие отзывы, ответы и доказательства"],
  ["Контакт", "Звонок или форма не превращаются в диалог", "Сократить время ответа и запустить повторное касание"],
] as const;

const auditRows = [
  ["01", "Карта спроса", "где и как вас ищут"],
  ["02", "Карта разрывов", "на каком этапе уходят"],
  ["03", "Конкурентный разбор", "почему выбирают соседей"],
  ["04", "Потенциал возврата", "сколько обращений можно вернуть"],
  ["05", "План 7 / 30", "что сделать сначала"],
] as const;

const plans = [
  { number: "01", name: "Аудит продаж", price: "7 900–24 900 ₽", timing: "3–7 дней", copy: "Разобрать маршрут спроса, найти разрывы и выдать план первых действий.", href: "#form", cta: "Начать с аудита" },
  { number: "02", name: "Запуск", price: "31 100–94 100 ₽", timing: "30 дней", copy: "Исправить точки входа, настроить события и запустить возврат обращений.", href: "/launch?package=local_sales_os", cta: "Запустить контур" },
  { number: "03", name: "Сопровождение", price: "29 000–79 000 ₽/мес", timing: "постоянно", copy: "Управлять ростом каждую неделю: сигналы, задачи, внедрение и измерение.", href: "#form", cta: "Обсудить работу" },
] as const;

export default function ForBusinessPage() {
  return (
    <div className="sr-site br-site">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <MarketingHeader />
      <main>
        <BusinessHero />
        <OfferBlock
          artifact="Карта спроса с приоритетами, план работ и пакеты сопровождения"
          price="от 7 900 ₽"
          term="3–7 дней / 30 дней"
          cta={{ href: "/launch?package=audit_start", label: "Заказать карту спроса" }}
        />
        <IndustryRail />
        <RouteSection />
        <InterventionSection />
        <AuditSection />
        <PlanSection />
        <LeadSection />
      </main>
      <MarketingFooter />
    </div>
  );
}

function BusinessHero() {
  return (
    <section className="br-hero">
      <div className="br-hero-copy">
        <div className="sr-index"><span>NE / BUSINESS</span><span>DEMAND ROUTE</span></div>
        <p className="sr-eyebrow">Диагностика локальных продаж</p>
        <h1>Проследим путь клиента. Найдём место потери.</h1>
        <p className="br-hero-lede">От запроса в картах до звонка, ответа и записи. Один маршрут показывает, где бизнес недополучает обращения — и что даст результат быстрее всего.</p>
        <div className="br-hero-actions">
          <Link className="sr-button sr-button-primary" href="#form">Получить карту потерь <ArrowRight /></Link>
          <span><i /> первый разбор за 3–7 дней</span>
        </div>
      </div>
      <BusinessDemandPath />
    </section>
  );
}

function IndustryRail() {
  return (
    <div className="br-industry-rail" aria-label="Подходит для локального бизнеса">
      <span>ЛОКАЛЬНЫЙ БИЗНЕС</span>
      <p>СТОМАТОЛОГИИ · КЛИНИКИ · АВТОСЕРВИСЫ · САЛОНЫ · ЮРИСТЫ · РЕМОНТ · ДЕТСКИЕ ЦЕНТРЫ</p>
    </div>
  );
}

function RouteSection() {
  return (
    <section className="br-route-section">
      <SectionIntro index="01 / МАРШРУТ" title="Не просто трафик. Вся цепочка до денег." copy="Смотрим не на каналы по отдельности, а на переходы между ними. Именно там чаще всего исчезает уже оплаченный или заработанный спрос." />
      <div className="br-funnel">
        <div className="br-funnel-head"><span>Этап</span><span>Объём</span><span>Сигнал</span></div>
        <p className="br-funnel-disclaimer">Пример разбора: цифры условные, показывают формат отчёта. В вашем аудите — данные вашей клиники.</p>
        {routeStages.map(({ icon: Icon, ...stage }) => (
          <article className="br-funnel-row" key={stage.index}>
            <span className="br-funnel-index">{stage.index}</span><Icon aria-hidden="true" />
            <div><strong>{stage.title}</strong><small>{stage.note}</small></div>
            <em>{stage.value}</em><span className={stage.index === "03" ? "alert" : ""}>{stage.loss}</span>
          </article>
        ))}
        <div className="br-funnel-summary"><CornerDownRight /><span>Так выглядит разрыв в примере выше</span><strong>+6 продаж / мес</strong></div>
      </div>
    </section>
  );
}

function InterventionSection() {
  return (
    <section className="br-interventions">
      <div className="br-intervention-title"><p className="sr-eyebrow">02 / ТОЧКИ ВМЕШАТЕЛЬСТВА</p><h2>Исправляем не маркетинг вообще. Исправляем разрыв.</h2></div>
      <div className="br-intervention-list">
        {interventions.map(([title, symptom, action], index) => (
          <article key={title}>
            <span>0{index + 1}</span><h3>{title}</h3><p>{symptom}</p><div><ArrowRight /><strong>{action}</strong></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AuditSection() {
  return (
    <section className="br-audit">
      <div className="br-audit-copy">
        <p className="sr-eyebrow">03 / РЕЗУЛЬТАТ ДИАГНОСТИКИ</p>
        <h2>Не презентация на 80 слайдов. Рабочая карта решений.</h2>
        <p>Каждый вывод привязан к источнику, потере, ожидаемому эффекту и следующему действию команды.</p>
        <Link href="#form" className="sr-text-link">Запросить пример разбора <ArrowRight /></Link>
      </div>
      <div className="br-audit-sheet">
        <div className="br-sheet-head"><span>NE / LOSS MAP</span><span>REV. 01</span></div>
        {auditRows.map(([number, title, note]) => <div className="br-sheet-row" key={number}><span>{number}</span><strong>{title}</strong><small>{note}</small><Check /></div>)}
        <div className="br-sheet-total"><span>Срок подготовки</span><strong>3–7 рабочих дней</strong></div>
      </div>
    </section>
  );
}

function PlanSection() {
  return (
    <section className="br-plans">
      <SectionIntro index="04 / ФОРМАТ РАБОТЫ" title="Начать с диагноза. Продолжить только там, где есть эффект." copy="Масштаб работ зависит от количества точек, каналов и данных. Диапазон фиксируем до старта." />
      <div className="br-plan-list">
        {plans.map((plan, index) => (
          <article className={index === 1 ? "featured" : ""} key={plan.number}>
            <div><span>{plan.number}</span><small>{plan.timing}</small></div><h3>{plan.name}</h3><strong>{plan.price}</strong><p>{plan.copy}</p>
            <Link href={plan.href}>{plan.cta}<ArrowRight /></Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function LeadSection() {
  return (
    <section className="br-lead" id="form">
      <div className="br-lead-copy">
        <p className="sr-eyebrow">05 / ПЕРВЫЙ ШАГ</p><h2>Покажите точки входа. Мы соберём маршрут.</h2>
        <p>Достаточно сайта, карточек и контакта. На первом созвоне уточним город, средний чек и текущий поток обращений.</p>
        <div><MessageSquareText /><span><strong>Ответим лично</strong><small>без автоматической продажи и доступа к кабинетам</small></span></div>
      </div>
      <BusinessLeadForm />
    </section>
  );
}

function SectionIntro({ index, title, copy }: { index: string; title: string; copy: string }) {
  return <div className="br-section-intro"><p className="sr-eyebrow">{index}</p><h2>{title}</h2><p>{copy}</p></div>;
}
