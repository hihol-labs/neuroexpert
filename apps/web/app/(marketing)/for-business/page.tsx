"use client";

import Link from "next/link";
import { useState } from "react";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";
import { FadeIn } from "@/components/marketing/fade-in";
import {
  BeforeAfterPanel,
  LocalSalesAuditMockup,
  LocalSalesCockpitMockup,
  RevenueCalculatorMockup,
  SevenDayResultPanel,
  VerticalScenarioGrid,
} from "@/components/marketing/product-mockups";

const LOSS_ZONES = [
  {
    title: "Яндекс Карты",
    desc: "Слабая карточка, мало фото, не заполнены услуги и цены, нет свежих отзывов или конкуренты выше по запросам рядом, цена и срочно.",
  },
  {
    title: "2ГИС",
    desc: "Неверные рубрики, пустые услуги, мало доказательств, отзывы без ответов и слабее карточка, чем у соседних компаний.",
  },
  {
    title: "Авито",
    desc: "Объявления не продают: слабые заголовки, фото без доверия, непонятные цены, нет пакетного оффера и регулярного обновления.",
  },
  {
    title: "Отзывы",
    desc: "Мало свежих отзывов, негатив висит без реакции, довольных клиентов не просят оставить отзыв, доверие не накапливается.",
  },
  {
    title: "Сайт и страницы",
    desc: "Нет страниц под услуги, районы, цены и вопросы перед покупкой. Клиент не получает ответ и уходит к агрегатору или конкуренту.",
  },
  {
    title: "Мессенджеры и формы",
    desc: "Заявки приходят, но ответ долгий, нет статуса, нет скрипта и повторного касания после первого сообщения.",
  },
  {
    title: "Звонки",
    desc: "Пропущенные звонки, поздний перезвон, нет SLA и непонятно, сколько денег уже потеряно на входящих обращениях.",
  },
  {
    title: "Ответы нейросетей",
    desc: "ChatGPT, Алиса, Perplexity и другие системы не знают бизнес, называют агрегаторы или увереннее рекомендуют конкурентов.",
  },
];

const MODULES = [
  {
    title: "1. Аудит видимости",
    checks: "Карты, 2ГИС, Авито, сайт, отзывы, формы, мессенджеры, звонки, поиск и ответы нейросетей.",
    actions: "Фиксируем слабые места: фото, услуги, цены, кнопки заявки, категории, отзывы, негатив, пустые каналы и точки потери заявки.",
    result: "Карта потерь и список приоритетов: что мешает получать обращения уже сейчас.",
  },
  {
    title: "2. Гео-рейтинг, нейросети и конкуренты",
    checks: "Запросы рядом, цена, срочно, район, лучший, записаться; топ конкурентов в картах, поиске, Авито и нейросетях.",
    actions: "Сравниваем рейтинг, отзывы, фото, услуги, офферы, скорость ответа, упоминания в нейросетях и причины, почему конкуренты выглядят сильнее.",
    result: "Понятный ответ: почему клиент видит и слышит о конкурентах раньше, чем о вас.",
  },
  {
    title: "3. Ежедневные задачи",
    checks: "Какие действия быстрее двигают заявки: карточки, отзывы, Авито, FAQ, офферы, страницы, повторные касания.",
    actions: "Даём задачи с приоритетом, ответственным, сроком, ожидаемым эффектом, метрикой и доказательством выполнения.",
    result: "Не “разберитесь с маркетингом”, а список действий на сегодня, неделю и 30 дней.",
  },
  {
    title: "4. Сбор и возврат отзывов",
    checks: "Свежесть отзывов, рейтинг, ответы на негатив, площадки, где отзывов не хватает, и сценарий запроса после услуги.",
    actions: "Настраиваем маршрут: довольный клиент идёт на Яндекс/2ГИС, недовольный сначала пишет владельцу или администратору.",
    result: "Больше цифрового доверия, меньше публичного негатива, сильнее карточки, поиск и ответы нейросетей.",
  },
  {
    title: "5. Потерянные обращения",
    checks: "Пропущенные звонки, сообщения без ответа, заявки без повторного касания, клиенты после расчёта цены, старые обращения.",
    actions: "Собираем список возврата: кому перезвонить, что написать, какой оффер предложить, какие обращения ещё можно вернуть.",
    result: "Оценка потерянной выручки и действия, которые возвращают уже пришедший спрос.",
  },
];

const AI_QUERIES = [
  "какая стоматология рядом лучше",
  "где сделать имплантацию цена",
  "надёжный автосервис срочно",
  "какая клиника лучше в городе",
  "к кому обратиться по банкротству",
  "какой салон красоты выбрать",
];

const DELIVERABLES = [
  "индекс локальной видимости",
  "карта слабых мест по каналам",
  "сравнение с 5-10 конкурентами",
  "кого называют нейросети",
  "задачи на первые 7 дней",
  "план роста на 30 дней",
  "оценка потерянных обращений",
  "рекомендация: делать самим, запускать с нами или брать сопровождение",
];

const METRICS = [
  "позиции в Яндекс Картах и 2ГИС",
  "заполненность карточек и услуг",
  "количество и свежесть отзывов",
  "ответы на негатив",
  "клики по звонку, маршруту и записи",
  "скорость ответа в мессенджерах",
  "пропущенные звонки и обращения без повторного касания",
  "упоминания вас и конкурентов в нейросетях",
  "заявки, записи и повторные касания",
];

const INDUSTRIES = [
  "Стоматологии",
  "Косметологии",
  "Салоны красоты",
  "Автосервисы",
  "Юридические фирмы",
  "Клиники и медкабинеты",
  "Детские центры",
  "Ремонт квартир",
  "Клининг",
  "Окна и кондиционеры",
];

const PLANS = [
  {
    name: "Аудит продаж",
    price: "9 900-29 900",
    period: "₽",
    desc: "За 3-7 дней показать, где бизнес теряет клиентов",
    features: [
      "карты, 2ГИС, Авито, сайт, отзывы и ответы нейросетей",
      "до 5-10 конкурентов по локальным запросам",
      "карта потерь и индекс видимости",
      "задачи на 7 дней и план на 30 дней",
      "если запускаем внедрение, аудит засчитывается в работу",
    ],
    cta: "Получить аудит",
    href: "#form",
    highlight: false,
  },
  {
    name: "Запуск за 30 дней",
    price: "49 000-150 000",
    period: "₽",
    desc: "Запустить первые точки входа под ключ",
    features: [
      "упаковка карточек, услуг, кнопок заявки и офферов",
      "первые страницы под локальный спрос",
      "сценарии отзывов и ответы на негатив",
      "базовый учёт потерянных обращений",
      "недельный отчёт по внедрению и сигналам",
    ],
    cta: "Запустить канал",
    href: "/launch?package=local_sales_os",
    highlight: true,
  },
  {
    name: "Сопровождение продаж",
    price: "39 000-99 000",
    period: "₽/мес",
    desc: "Ежемесячное управление ростом обращений",
    features: [
      "ежедневные задачи роста и контроль выполнения",
      "мониторинг конкурентов, отзывов, Авито и нейросетей",
      "возврат потерянных обращений и повторные касания",
      "экспертные страницы под новые вопросы",
      "недельный отчёт: что сделано, что изменилось, где деньги",
    ],
    cta: "Обсудить сопровождение",
    href: "#form",
    highlight: false,
  },
];

function B2BLeadForm() {
  const [form, setForm] = useState({
    name: "",
    company: "",
    contact: "",
    city: "",
    niche: "",
    website: "",
    platforms: "",
    competitors: "",
    avg_check: "",
    current_leads: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.company.trim() || !form.contact.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/b2b-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка отправки");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-3xl border border-green-500/20 bg-green-500/10 p-8 text-center backdrop-blur-xl">
        <div className="text-5xl mb-4">✓</div>
        <h3 className="text-2xl font-bold text-white">Заявка отправлена</h3>
        <p className="mt-3 text-gray-400">
          Мы свяжемся с вами, уточним площадки и предложим формат аудита.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Имя *" value={form.name} onChange={(v) => updateField("name", v)} placeholder="Иван Иванов" required />
        <Field label="Компания *" value={form.company} onChange={(v) => updateField("company", v)} placeholder="Название компании" required />
        <Field label="Контакт *" value={form.contact} onChange={(v) => updateField("contact", v)} placeholder="@telegram или +7..." required />
        <Field label="Город / район" value={form.city} onChange={(v) => updateField("city", v)} placeholder="Москва, Казань, Сочи..." />
        <Field label="Ниша" value={form.niche} onChange={(v) => updateField("niche", v)} placeholder="стоматология, автосервис..." />
        <Field label="Сайт" value={form.website} onChange={(v) => updateField("website", v)} placeholder="site.ru" />
        <Field label="Средний чек" value={form.avg_check} onChange={(v) => updateField("avg_check", v)} placeholder="например, 7 000 ₽ или 35 000 ₽" />
      </div>

      <TextArea
        label="Ссылки на площадки"
        value={form.platforms}
        onChange={(v) => updateField("platforms", v)}
        placeholder="Яндекс Карты, 2ГИС, Авито, VK, Telegram, Google Maps..."
        rows={3}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextArea label="3-5 конкурентов" value={form.competitors} onChange={(v) => updateField("competitors", v)} placeholder="Кого считаете сильными в городе" rows={3} />
        <TextArea label="Заявки и потери" value={form.current_leads} onChange={(v) => updateField("current_leads", v)} placeholder="Заявок в месяц, пропущенные звонки, CRM/телефония, обращения без повторного касания" rows={3} />
      </div>

      <TextArea
        label="Что хотите улучшить"
        value={form.message}
        onChange={(v) => updateField("message", v)}
        placeholder="Мало заявок, конкуренты выше в картах, слабые отзывы, не понимаем потери в звонках..."
        rows={4}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="group relative w-full rounded-2xl px-8 py-4 text-lg font-semibold text-white overflow-hidden transition-transform hover:scale-[1.02] disabled:opacity-50"
      >
        <span className="absolute inset-0 bg-emerald-300" />
        <span className="absolute -inset-2 bg-emerald-300 blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
        <span className="relative text-[#07100e]">{submitting ? "Отправка..." : "Получить аудит видимости"}</span>
      </button>

      <p className="text-center text-xs text-gray-500">
        Для первого разбора достаточно ссылок и контекста. Доступы к CRM, телефонии и кабинетам нужны только после согласования.
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-gray-400 mb-1">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-md focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
        placeholder={placeholder}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-gray-400 mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-md focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 resize-none"
        placeholder={placeholder}
      />
    </label>
  );
}

export default function ForBusinessPage() {
  return (
    <>
      <MarketingHeader />

      <section className="min-h-[88vh]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <FadeIn>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-5 py-2 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-300" />
                </span>
                <span className="text-sm font-medium text-emerald-200">
                  Система локальных продаж для бизнеса
                </span>
              </div>
            </FadeIn>

            <FadeIn delay={150}>
              <h1 className="mt-8 max-w-3xl text-4xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
                Найдём, где бизнес теряет клиентов, и запустим рост продаж
              </h1>
            </FadeIn>

            <FadeIn delay={300}>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-300">
                За 7 дней проверим карты, 2ГИС, Авито, отзывы, сайт,
                мессенджеры, звонки, локальную выдачу и ответы нейросетей. Покажем,
                кто забирает ваш спрос, где теряются деньги и какие действия
                нужно сделать первыми.
              </p>
            </FadeIn>

            <FadeIn delay={450}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#form"
                  className="rounded-2xl bg-emerald-300 px-8 py-4 text-base font-semibold text-[#07100e] transition-colors hover:bg-emerald-200"
                >
                  Получить аудит продаж
                </a>
                <Link
                  href="/pricing"
                  className="rounded-2xl border border-white/15 bg-white/[0.04] px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10"
                >
                  Смотреть пакеты
                </Link>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                Не обещаем “100 лидов”. Сначала показываем реальные потери,
                конкурентов, задачи и план на 30 дней.
              </p>
            </FadeIn>
          </div>

          <FadeIn delay={260}>
            <LocalSalesAuditMockup />
          </FadeIn>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 lg:grid-cols-[1.2fr_0.8fr]">
          <FadeIn>
            <SevenDayResultPanel />
          </FadeIn>
          <FadeIn delay={150}>
            <RevenueCalculatorMockup />
          </FadeIn>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="mb-10 text-center">
            <p className="text-sm font-semibold text-emerald-300">Рабочая панель</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Панель собственника: видимость, конкуренты, отзывы, задачи и потерянные обращения
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              Клиент должен видеть не PDF-аудит, а живую систему: где проседает
              поток клиентов, кто отвечает, какие задачи на сегодня и что изменилось за неделю.
            </p>
          </FadeIn>
          <FadeIn>
            <LocalSalesCockpitMockup />
          </FadeIn>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Где локальный бизнес теряет заявки
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              Клиент уже ищет услугу, сравнивает отзывы, смотрит карточки,
              спрашивает нейросети и звонит. Вопрос в том, кто заберёт обращение.
            </p>
          </FadeIn>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {LOSS_ZONES.map((zone, i) => (
              <FadeIn key={zone.title} delay={i * 60}>
                  <div className="h-full rounded-2xl border border-white/10 bg-[#101715]/70 p-5 backdrop-blur-xl hover:border-emerald-300/30 transition-all">
                  <h3 className="text-base font-semibold text-white">{zone.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{zone.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              5 модулей системы локальных продаж
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              Каждый модуль показывает не только проблему, но и практический
              следующий шаг: что проверяем, что делаем и какой результат измеряем.
            </p>
          </FadeIn>

          <div className="space-y-4">
            {MODULES.map((module, i) => (
              <FadeIn key={module.title} delay={i * 80}>
                <div className="grid gap-4 rounded-3xl border border-white/10 bg-[#04080f]/60 p-6 backdrop-blur-xl lg:grid-cols-[1.1fr_1fr_1fr_1fr]">
                    <h3 className="text-xl font-semibold text-emerald-300">{module.title}</h3>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Проверяем</p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-300">{module.checks}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Делаем</p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-300">{module.actions}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Измеряем</p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-300">{module.result}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="mb-10 text-center">
            <p className="text-sm font-semibold text-emerald-300">Сценарии по отраслям</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Одна панель управления, разные точки потерь
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              В стоматологии важны услуги, отзывы и рассрочка. В автосервисе — срочность,
              цены и доверие. В юрфирме — кейсы, сроки и первичная консультация.
            </p>
          </FadeIn>
          <FadeIn>
            <VerticalScenarioGrid />
          </FadeIn>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Было → нашли потери → сделали → измеряем
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              Такой формат должен стать основой кейсов: не “мы настроили маркетинг”,
              а что именно нашли, что исправили и какой показатель отслеживаем.
            </p>
          </FadeIn>
          <FadeIn>
            <BeforeAfterPanel />
          </FadeIn>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <FadeIn>
              <p className="text-sm font-semibold text-emerald-300">Ответы нейросетей уже влияют на выбор</p>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                Клиенты спрашивают нейросети, кого выбрать
              </h2>
              <p className="mt-5 text-gray-400 leading-relaxed">
                Мы проверяем, попадает ли бизнес в ответы ChatGPT, Алисы,
                Perplexity, YandexGPT и других систем, кого нейросети рекомендуют
                вместо него и какие источники нужно усилить: карточки, отзывы,
                страницы, FAQ, экспертные ответы и локальные доказательства.
              </p>
            </FadeIn>
            <FadeIn delay={150}>
              <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-6 backdrop-blur-xl">
                <p className="text-sm font-semibold text-emerald-100">Примеры запросов клиентов</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {AI_QUERIES.map((query) => (
                    <div key={query} className="rounded-xl border border-white/10 bg-[#101715]/70 p-4 text-sm text-gray-300">
                      “{query}”
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Что вы получите через 7 дней
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              Первый результат — не “доступ к платформе”, а понятная карта
              потерь и управленческий план, что делать дальше.
            </p>
          </FadeIn>

          <div className="grid gap-4 md:grid-cols-4">
            {DELIVERABLES.map((item, i) => (
              <FadeIn key={item} delay={i * 60}>
                <div className="h-full rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-5 text-sm font-medium text-cyan-50">
                  {item}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <FadeIn>
              <p className="text-sm font-semibold text-cyan-300">Как внедряем</p>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                Сначала аудит, затем запуск, потом операционная система
              </h2>
              <p className="mt-5 text-gray-400 leading-relaxed">
                Мы не начинаем с тяжёлых интеграций. Сначала используем открытые
                данные, ваши ссылки, ручную проверку и выгрузки. После первых
                платных пилотов подключаем полуавтоматические источники и личный кабинет.
              </p>
            </FadeIn>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["7 дней", "Аудит", "Потери, конкуренты, ответы нейросетей, задачи на неделю и план на 30 дней."],
                ["30 дней", "Запуск", "Упаковка карточек, отзывов, Авито, страниц, кнопок заявки и первых повторных касаний."],
                ["каждый месяц", "Сопровождение", "Ежедневные задачи, недельный отчёт, возврат обращений и рост точек входа."],
              ].map(([term, title, desc], i) => (
                <FadeIn key={title} delay={i * 100}>
                  <div className="h-full rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                    <div className="text-sm font-bold text-cyan-300">{term}</div>
                    <h3 className="mt-3 text-xl font-semibold text-white">{title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-gray-400">{desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Эффективность измеряем по коммерческим сигналам
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              Мы не обещаем фиксированное число клиентов без данных. Но показываем
              метрики, которые влияют на поток обращений, записи и продажи.
            </p>
          </FadeIn>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {METRICS.map((metric) => (
              <FadeIn key={metric}>
                <div className="rounded-2xl border border-white/10 bg-[#04080f]/60 p-4 text-sm text-gray-300">
                  {metric}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <FadeIn className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Пакеты внедрения
            </h2>
            <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
              Клиент покупает не набор функций, а степень нашего участия:
              диагностика, запуск под ключ или ежемесячное управление ростом.
            </p>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 150}>
                <div
                  className={`relative h-full rounded-3xl border p-8 backdrop-blur-xl overflow-hidden ${
                    plan.highlight
                        ? "border-emerald-300/30 bg-emerald-300/5 shadow-[0_0_30px_rgba(16,185,129,0.08)]"
                      : "border-white/10 bg-[#04080f]/60"
                  }`}
                >
                  <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{plan.desc}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-emerald-300">{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-emerald-300 flex-shrink-0">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={plan.href}
                    className={`mt-8 block w-full rounded-2xl py-3 text-center font-semibold transition-all ${
                      plan.highlight
                        ? "bg-emerald-300 text-[#07100e] hover:bg-emerald-200"
                        : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <FadeIn className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Для каких компаний
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              Лучше всего работает там, где высокий чек, локальная конкуренция,
              важны отзывы и клиент сравнивает несколько вариантов перед заявкой.
            </p>
          </FadeIn>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            {INDUSTRIES.map((industry, i) => (
              <FadeIn key={industry} delay={Math.min(i * 50, 400)}>
                <div className="rounded-2xl border border-white/10 bg-[#04080f]/50 p-4 text-center backdrop-blur-xl hover:border-cyan-500/20 hover:bg-cyan-500/5 transition-all">
                  <p className="text-sm font-medium text-gray-300">{industry}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FadeIn>
              <div className="h-full rounded-3xl border border-green-500/20 bg-green-500/10 p-8">
                <h2 className="text-2xl font-bold text-white">Что делаем</h2>
                <ul className="mt-5 space-y-3 text-sm text-green-100/90">
                  <li>✓ показываем потери по каналам и конкурентам</li>
                  <li>✓ запускаем страницы, карточки, отзывы, кнопки заявки и повторные касания</li>
                  <li>✓ даём ежедневные задачи и недельный отчёт</li>
                  <li>✓ измеряем клики, обращения, записи, упоминания в нейросетях и возврат обращений</li>
                </ul>
              </div>
            </FadeIn>
            <FadeIn delay={150}>
              <div className="h-full rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8">
                <h2 className="text-2xl font-bold text-white">Чего не обещаем</h2>
                <ul className="mt-5 space-y-3 text-sm text-amber-100/90">
                  <li>— фиксированное число клиентов без данных</li>
                  <li>— первое место в картах или поиске за любой срок</li>
                  <li>— гарантированное цитирование в нейросетях</li>
                  <li>— рискованный парсинг как основу продукта</li>
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section id="form" className="py-24">
        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <div className="rounded-3xl border border-emerald-300/20 bg-[#101715]/70 p-10 backdrop-blur-xl overflow-hidden relative">
              <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
              <h2 className="text-2xl font-bold text-white text-center mb-2">
                Получить аудит локального спроса
              </h2>
              <p className="text-gray-400 text-center mb-8">
                Оставьте контакты и ссылки на основные площадки. Мы скажем,
                где стоит начинать: карты, 2ГИС, Авито, отзывы, сайт, ответы нейросетей
                или потерянные обращения.
              </p>
              <B2BLeadForm />
            </div>
          </FadeIn>
        </div>
      </section>

      <MarketingFooter />
    </>
  );
}
