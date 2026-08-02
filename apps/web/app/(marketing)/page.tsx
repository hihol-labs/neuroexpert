import Link from "next/link";
import { ArrowRight, Check, Crosshair, MapPin, Radio, Route } from "lucide-react";
import { DemandScene } from "@/components/marketing/demand-scene";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/nav";
import { generateServiceSchema } from "@/lib/schema-org";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";
const schema = generateServiceSchema({
  name: "НейроЭксперт",
  description: "Local Sales OS для превращения локального спроса в измеримые заявки и продажи.",
  url: APP_URL,
  serviceType: "Local sales and demand generation SaaS",
  offers: [
    { name: "Local Sales OS для бизнеса", url: `${APP_URL}/for-business` },
    { name: "Запуск под ключ", url: `${APP_URL}/launch` },
    { name: "Тарифы", url: `${APP_URL}/pricing` },
  ],
});

const signalSources = [
  { icon: MapPin, name: "Карты", metric: "1 840", note: "поисков рядом" },
  { icon: Radio, name: "Отзывы", metric: "31%", note: "без ответа" },
  { icon: Crosshair, name: "Сайт", metric: "146", note: "целевых действий" },
  { icon: Route, name: "Повторные касания", metric: "9", note: "можно вернуть" },
] as const;

const operatingSteps = [
  ["01", "Сигнал", "Клиент ищет услугу, читает отзывы или задаёт вопрос AI."],
  ["02", "Потеря", "Система находит место, где интерес не стал обращением."],
  ["03", "Действие", "Команда получает одну задачу с оценкой влияния на выручку."],
] as const;

export default function LandingPage() {
  return (
    <div className="sr-site">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <MarketingHeader />
      <main>
        <HeroSection />
        <SignalStrip />
        <StorySection />
        <ProductSection />
        <CallToAction />
      </main>
      <MarketingFooter />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="sr-hero">
      <div className="sr-hero-copy">
        <div className="sr-index"><span>NE / 01</span><span>LOCAL SALES OS</span></div>
        <p className="sr-eyebrow">Система управления локальным спросом</p>
        <h1>Находим место, где спрос перестаёт быть продажей.</h1>
        <p className="sr-hero-lede">
          НейроЭксперт связывает карты, поиск, отзывы, сайт и звонки — и показывает одно действие, которое вернёт больше обращений сегодня.
        </p>
        <div className="sr-hero-actions">
          <Link href="/for-business" className="sr-button sr-button-primary">
            Найти потери <ArrowRight aria-hidden="true" />
          </Link>
          <Link href="/how-it-works" className="sr-text-link">Как работает система</Link>
        </div>
        <div className="sr-hero-proof">
          <div><strong>7 дней</strong><span>до первого измеримого результата</span></div>
          <div><strong>1 контур</strong><span>от сигнала до обращения</span></div>
        </div>
      </div>
      <div className="sr-hero-visual"><DemandScene /></div>
    </section>
  );
}

function SignalStrip() {
  return (
    <section className="sr-signal-strip" aria-label="Источники сигналов">
      {signalSources.map(({ icon: Icon, name, metric, note }) => (
        <div className="sr-signal-item" key={name}>
          <Icon aria-hidden="true" /><span>{name}</span><strong>{metric}</strong><small>{note}</small>
        </div>
      ))}
    </section>
  );
}

function StorySection() {
  return (
    <section className="sr-story">
      <div className="sr-story-heading">
        <p className="sr-eyebrow">Не ещё одна аналитика</p>
        <h2>От поведения клиента — к конкретному решению.</h2>
        <p>Система не просит собственника изучать графики. Она собирает контекст и объясняет, что делать дальше.</p>
      </div>
      <div className="sr-operating-path">
        {operatingSteps.map(([number, title, copy], index) => (
          <article className="sr-path-step" key={number}>
            <div className="sr-path-marker"><span>{number}</span><i /></div>
            <div><h3>{title}</h3><p>{copy}</p></div>
            <span className="sr-path-status">{index === 2 ? "готово" : "в обработке"}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductSection() {
  return (
    <section className="sr-product-section">
      <div className="sr-product-intro">
        <div><p className="sr-eyebrow">Рабочий экран</p><h2>Видно не всё. Видно главное.</h2></div>
        <p>Приоритеты обновляются каждый день и ранжируются по влиянию на обращения и выручку.</p>
      </div>
      <div className="sr-workspace">
        <WorkspaceHeader />
        <div className="sr-workspace-body">
          <WorkspaceSources />
          <PriorityList />
        </div>
      </div>
    </section>
  );
}

function WorkspaceHeader() {
  return (
    <div className="sr-workspace-bar">
      <span className="sr-brand-mark">N</span><span>Контур спроса / Екатеринбург</span>
      <div><i /> Данные обновлены 4 мин назад</div>
    </div>
  );
}

function WorkspaceSources() {
  return (
    <aside>
      <span>Источники</span>
      {[["Карты", "12"], ["Отзывы", "7"], ["Сайт", "3"], ["Звонки", "5"]].map(([label, count], index) => (
        <div className={index === 1 ? "active" : ""} key={label}><span>{label}</span><em>{count}</em></div>
      ))}
    </aside>
  );
}

function PriorityList() {
  const priorities = [
    ["Ответить на 7 отзывов с вопросом о цене", "+9 обращений", "Начать"],
    ["Вернуть пропущенные звонки за 48 часов", "+5 обращений", "Сценарий готов"],
    ["Исправить маршрут записи на странице услуги", "+3 обращения", "Назначено"],
  ];
  return (
    <div className="sr-priority-list">
      <div className="sr-priority-head"><span>Приоритеты на сегодня</span><span>Влияние</span><span>Статус</span></div>
      {priorities.map(([task, impact, status], index) => (
        <div className="sr-priority-row" key={task}>
          <span className="sr-priority-number">0{index + 1}</span><strong>{task}</strong><span>{impact}</span>
          <span className={index === 0 ? "hot" : ""}>{status}</span><ArrowRight aria-hidden="true" />
        </div>
      ))}
      <div className="sr-workspace-note">
        <Check aria-hidden="true" /><span><strong>16 обращений</strong> — суммарный потенциал действий на сегодня</span>
      </div>
    </div>
  );
}

function CallToAction() {
  return (
    <section className="sr-cta">
      <div><p className="sr-eyebrow">Начать с диагностики</p><h2>Покажем, где бизнес теряет обращения прямо сейчас.</h2></div>
      <Link href="/for-business" className="sr-button sr-button-light">
        Получить карту потерь <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}
