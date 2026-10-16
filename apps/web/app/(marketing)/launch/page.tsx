import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, Check, Flag, Radio } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/nav";
import { generateServiceSchema } from "@/lib/schema-org";
import { OfferBlock } from "@/components/marketing/offer";

const TITLE = "Запуск Local Sales OS за 30 дней | НейроЭксперт";
const DESCRIPTION = "Запускаем измеримый контур привлечения клиентов: диагностика, точки входа, события, первые действия и контроль результата.";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

export const metadata: Metadata = {
  title: TITLE, description: DESCRIPTION, alternates: { canonical: "/launch" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/launch" },
};

type PackageType = "audit" | "launch_30d" | "managed_monthly" | "b2b";
type Props = { searchParams: { success?: string; package?: string } };

const phases = [
  ["01", "Дни 01–05", "Собираем контур", "Источники, конкуренты, спрос, обращения и точки измерения."],
  ["02", "Дни 06–12", "Находим разрывы", "Где клиент не увидел, не поверил, не дозвонился или не получил ответ."],
  ["03", "Дни 13–23", "Исправляем маршрут", "Карточки, страницы, офферы, отзывы, события и повторные касания."],
  ["04", "Дни 24–30", "Замыкаем цикл", "Смотрим результат, фиксируем ритм и выбираем следующий приоритет."],
] as const;

const gates = [
  ["GATE 01", "Контекст собран", "Нет слепых зон в источниках и способе обработки обращений."],
  ["GATE 02", "Действие назначено", "У каждой потери есть владелец, срок и ожидаемый эффект."],
  ["GATE 03", "Сигнал измеряется", "Видно, что изменилось после запуска, а что требует нового решения."],
] as const;

const schema = generateServiceSchema({
  name: "Запуск Local Sales OS за 30 дней", description: DESCRIPTION, url: `${APP_URL}/launch`, serviceType: "Local sales system launch",
  offers: [{ name: "Запуск за 30 дней", price: "31100", url: `${APP_URL}/launch` }],
});

function resolvePackageType(value?: string): PackageType {
  if (!value) return "launch_30d";
  if (value.includes("audit")) return "audit";
  if (value.includes("support") || value.includes("managed")) return "managed_monthly";
  if (value.includes("b2b") || value.includes("local_sales")) return "b2b";
  return "launch_30d";
}

export default function LaunchPage({ searchParams }: Props) {
  const packageType = resolvePackageType(searchParams.package);
  return (
    <div className="sr-site ln-site">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <MarketingHeader />
      <main>
        <LaunchHero />
        <OfferBlock
          artifact="Карта спроса с приоритетами, план работ и пакеты сопровождения"
          price="7 900 ₽ аудит · 31 100 ₽ запуск"
          term="3–7 дней / 30 дней"
          cta={{ href: "#application", label: "Оставить заявку на запуск" }}
        />
        <PhaseSection /><GateSection /><ApplicationSection packageType={packageType} packageLabel={searchParams.package} success={searchParams.success === "1"} /></main>
      <MarketingFooter />
    </div>
  );
}

function LaunchHero() {
  return (
    <section className="ln-hero">
      <div className="ln-hero-copy"><div className="sr-index"><span>NE / LAUNCH</span><span>30 DAY PROTOCOL</span></div><p className="sr-eyebrow">Запуск под ключ</p><h1>За 30 дней — от разрозненных каналов к рабочему контуру.</h1><p>Мы не «настраиваем маркетинг». Собираем маршрут спроса, исправляем главные разрывы и оставляем команде измеримый рабочий ритм.</p><a href="#application" className="sr-button sr-button-primary">Запустить протокол <ArrowDown /></a></div>
      <LaunchRail />
    </section>
  );
}

function LaunchRail() {
  return (
    <div className="ln-rail">
      <div className="ln-rail-head"><span><i /> PROTOCOL / ACTIVE</span><span>DAY 01 → 30</span></div>
      <div className="ln-day-scale">{["01", "05", "12", "23", "30"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="ln-track"><i className="ln-track-progress" /><b className="ln-day-marker"><span>DAY</span><strong>14</strong></b>{["DIAGNOSE", "MAP", "BUILD", "MEASURE"].map((label) => <div key={label}><i /><span>{label}</span></div>)}</div>
      <div className="ln-current"><Radio /><span>Текущая контрольная точка</span><strong>Связать события страницы с исходом обращения</strong><small>OWNER / NE + CLIENT</small></div>
      <div className="ln-rail-foot"><span>4 ФАЗЫ</span><span>3 GATES</span><span>1 РАБОЧИЙ КОНТУР</span></div>
    </div>
  );
}

function PhaseSection() {
  return (
    <section className="ln-phases"><div className="ln-section-head"><p className="sr-eyebrow">01 / ПОСЛЕДОВАТЕЛЬНОСТЬ</p><h2>Каждая фаза заканчивается наблюдаемым изменением.</h2><p>Сроки не маскируют неопределённость: если gate не пройден, следующий слой не запускается.</p></div><div className="ln-phase-list">{phases.map(([index, days, title, copy]) => <article key={index}><span>{index}</span><small>{days}</small><h3>{title}</h3><p>{copy}</p><ArrowRight /></article>)}</div></section>
  );
}

function GateSection() {
  return (
    <section className="ln-gates"><div><p className="sr-eyebrow">02 / КОНТРОЛЬ</p><h2>Публикация — не результат. Результат — замкнутый цикл.</h2></div><div className="ln-gate-list">{gates.map(([index, title, copy]) => <article key={index}><div><Flag /><span>{index}</span></div><h3>{title}</h3><p>{copy}</p><Check /></article>)}</div></section>
  );
}

function ApplicationSection({ packageType, packageLabel, success }: { packageType: PackageType; packageLabel?: string; success: boolean }) {
  return (
    <section className="ln-application" id="application"><div className="ln-application-copy"><p className="sr-eyebrow">03 / ЗАЯВКА НА ЗАПУСК</p><h2>Дайте исходные точки. План соберём мы.</h2><p>На первом этапе достаточно контакта, ниши и ссылок. Доступы и интеграции подключаются только после согласования контура.</p><div><strong>31 100–94 100 ₽</strong><span>точный объём фиксируем до старта</span></div></div><LaunchForm packageType={packageType} packageLabel={packageLabel} success={success} /></section>
  );
}

function LaunchForm({ packageType, packageLabel, success }: { packageType: PackageType; packageLabel?: string; success: boolean }) {
  const fields = [["name", "Имя *", "Как к вам обращаться", "text", true], ["contact", "Контакт *", "Telegram или телефон", "text", true], ["email", "Email", "Для отчёта и договора", "email", false], ["niche", "Ниша", "Стоматология, клиника, сервис…", "text", false], ["city", "Город / район", "Москва, Казань, Сочи…", "text", false], ["website", "Сайт или площадки", "Сайт, Карты, 2ГИС, Авито", "text", false]] as const;
  return (
    <form action="/api/service-orders" method="POST" className="ln-form"><input type="hidden" name="package_type" value={packageType} /><input type="hidden" name="package_label" value={packageLabel || "launch_30d"} />{success && <p className="ln-form-success" role="status"><Check /> Заявка отправлена. Свяжемся с планом запуска.</p>}<div className="ln-form-grid">{fields.map(([name, label, placeholder, type, required]) => <label key={name}><span>{label}</span><input name={name} type={type} required={required} placeholder={placeholder} /></label>)}</div><label className="ln-form-wide"><span>Цель и текущая ситуация</span><textarea name="goal" rows={3} placeholder="Каких клиентов нужно больше и где сейчас теряются обращения?" /></label><label className="ln-form-wide"><span>Конкуренты</span><textarea name="competitors" rows={2} placeholder="3–5 компаний, с которыми вас сравнивают" /></label><button type="submit">Отправить заявку <ArrowRight /></button><p>Отправляя форму, вы соглашаетесь с <Link href="/privacy">политикой конфиденциальности</Link>.</p></form>
  );
}
