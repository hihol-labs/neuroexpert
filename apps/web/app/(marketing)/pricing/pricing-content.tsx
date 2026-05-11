"use client";

import { useState } from "react";
import Link from "next/link";

type Audience = "business" | "expert";

const SOLO_PLANS = [
  {
    id: "free",
    name: "Free",
    price: "0",
    period: "навсегда",
    headline: "Проверить спрос и опубликовать первые страницы без риска.",
    badge: "Комиссия 15%",
    features: [
      "1 ниша",
      "Карта спроса без ограничения по темам",
      "3 страницы в месяц",
      "SEO-страница и Telegram-пост",
      "Кнопка записи на каждой странице",
    ],
    cta: "Начать бесплатно",
    href: "/register",
    highlight: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: "1 490",
    period: "/мес",
    headline: "Регулярно закрывать спрос экспертными страницами.",
    badge: "Комиссия 7%",
    features: [
      "2 ниши",
      "Страницы без лимита",
      "Все 5 форматов контента",
      "Полный экспорт материалов",
      "Сниженная комиссия с клиентов",
    ],
    cta: "Подписаться",
    href: "/register?plan=starter",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "2 990",
    period: "/мес",
    headline: "Добавить дистрибуцию и быстрее проверять, что даёт заявки.",
    badge: "Комиссия 3%",
    features: [
      "3 ниши",
      "Всё из Starter",
      "Кросспостинг на внешние площадки",
      "Помощь с распространением",
      "Напоминания об обновлении страниц",
    ],
    cta: "Подписаться",
    href: "/register?plan=pro",
    highlight: true,
  },
  {
    id: "expert",
    name: "Expert",
    price: "4 990",
    period: "/мес",
    headline: "Видеть путь от спроса к трафику, кликам и заявкам.",
    badge: "Комиссия 0%",
    features: [
      "5 ниш",
      "Всё из Pro",
      "Аналитика страниц и заявок",
      "Упоминания в нейросетях как дополнительный канал",
      "Сравнение с конкурентами",
    ],
    cta: "Подписаться",
    href: "/register?plan=expert",
    highlight: false,
  },
];

const BUSINESS_SYSTEMS = [
  "Аудит видимости: Яндекс Карты, 2ГИС, Авито, сайт, VK, Telegram, отзывы",
  "Гео-рейтинг, ответы нейросетей и конкуренты по запросам «рядом», «цена», «срочно», «на районе»",
  "Ежедневные задачи для роста обращений, записей и продаж плюс недельный отчёт собственнику",
  "Сбор положительных отзывов и перехват негатива до публичной публикации",
  "Повторные касания: пропущенные звонки, поздние ответы, клиенты без возврата",
];

const PRICE_FACTORS = [
  "Количество филиалов, точек и городов",
  "Количество площадок: карты, Авито, сайт, соцсети, мессенджеры",
  "Количество конкурентов, запросов и направлений услуг",
  "Нужен ли анализ звонков, форм, сообщений и старых лидов",
  "Кто выполняет задачи: вы самостоятельно или мы руками",
  "Насколько быстро нужен запуск и насколько конкурентная ниша",
];

const BUSINESS_MODULE_MATRIX = [
  {
    module: "Аудит видимости",
    audit: "Находим пустые карточки, слабые фото, услуги, отзывы и точки, где клиент не доходит до обращения.",
    launch: "Исправляем карточки, описания, услуги, фото-рекомендации, FAQ и точки входа.",
    support: "Следим за заполненностью, позициями, изменениями площадок и новыми проблемами.",
  },
  {
    module: "Гео-рейтинг, нейросети и конкуренты",
    audit: "Смотрим позиции по запросам «рядом», «цена», «срочно», «на районе» и кого называют нейросети.",
    launch: "Выбираем запросы и площадки, где быстрее всего можно стать заметнее конкурентов.",
    support: "Обновляем рейтинг, упоминания в нейросетях, сравнение с топ-3 и задачи для роста.",
  },
  {
    module: "Ежедневные задачи",
    audit: "Формируем первичный список действий: фото, услуги, отзывы, FAQ, Авито, офферы.",
    launch: "Внедряем первые задачи и запускаем недельный ритм отчётности.",
    support: "Каждый день выдаём действия, каждую неделю показываем прогресс и эффект.",
  },
  {
    module: "Отзывы",
    audit: "Проверяем рейтинг, свежесть отзывов, ответы на негатив и отставание от конкурентов.",
    launch: "Настраиваем сценарий: довольных ведём на Яндекс/2ГИС, негатив — владельцу.",
    support: "Поддерживаем поток отзывов, ответы, перехват негатива и рост доверия.",
  },
  {
    module: "Повторные касания",
    audit: "Ищем пропущенные звонки, поздние ответы, формы без реакции и клиентов без повторного касания.",
    launch: "Вводим учёт обращений, повторные касания и базовые сценарии доведения до продажи.",
    support: "Показываем коммерческий потенциал возврата и возвращаем старых клиентов в работу.",
  },
];

const AUDIT_PACKAGES = [
  {
    name: "Аудит Старт",
    price: "9 900",
    period: "разово",
    fit: "Одна точка, один город, нужно быстро понять, откуда привлечь больше клиентов.",
    scope: [
      "1 филиал или кабинет",
      "Яндекс Карты, 2ГИС, сайт/соцсети",
      "До 5 конкурентов и 10 запросов",
      "Карточки, услуги, фото, отзывы",
      "План действий на 7 дней",
    ],
    cta: "Получить аудит",
    href: "/launch?package=audit_start",
    highlight: false,
  },
  {
    name: "Аудит Рост",
    price: "19 900",
    period: "разово",
    fit: "Основной аудит для бизнеса, которому нужны видимость, конкуренты и план роста.",
    scope: [
      "1-2 филиала",
      "Яндекс Карты, 2ГИС, Авито, сайт, VK/Telegram",
      "До 10 конкурентов и 20 запросов",
      "Отзывы, гео-позиции, услуги, точки входа",
      "План действий на 14 дней",
    ],
    cta: "Выбрать аудит",
    href: "/launch?package=audit_growth",
    highlight: true,
  },
  {
    name: "Аудит Полный",
    price: "29 900",
    period: "разово",
    fit: "Для конкурентной ниши, нескольких точек или сложной локальной выдачи.",
    scope: [
      "До 3-5 филиалов",
      "Все релевантные площадки",
      "До 20 конкурентов и 40 запросов",
      "Авито, отзывы, формы и звонки при наличии данных",
      "Оценка коммерческого потенциала и план на 30 дней",
    ],
    cta: "Заказать полный аудит",
    href: "/launch?package=audit_full",
    highlight: false,
  },
];

const LAUNCH_PACKAGES = [
  {
    name: "Запуск Старт",
    price: "49 000",
    period: "30 дней",
    fit: "Одна точка и одно направление услуг: быстро запустить первые точки входа.",
    scope: [
      "Аудит и упаковка карточек",
      "Описание, услуги, FAQ и кнопки заявки",
      "5-7 страниц под реальный спрос",
      "Базовая настройка сбора отзывов",
      "Недельный отчёт по первым данным",
    ],
    cta: "Запустить Старт",
    href: "/launch?package=launch_start",
    highlight: false,
  },
  {
    name: "Запуск Рост",
    price: "89 000",
    period: "30 дней",
    fit: "Главный пакет для клиник, салонов, юрфирм и локальных сервисов.",
    scope: [
      "1-2 точки или 2-3 направления",
      "Карты, Авито, сайт/страницы, соцсети",
      "10-15 страниц под спрос",
      "Ежедневные задачи и сценарии отзывов",
      "Учёт обращений для повторного касания",
    ],
    cta: "Выбрать запуск",
    href: "/launch?package=launch_growth",
    highlight: true,
  },
  {
    name: "Запуск Интенсив",
    price: "150 000",
    period: "30 дней",
    fit: "Для высокой конкуренции, нескольких точек и быстрого ручного запуска.",
    scope: [
      "До 3-5 точек",
      "Несколько направлений услуг",
      "20-30 страниц под спрос",
      "Отзывы, Авито, конкуренты, повторные касания",
      "Ритм внедрения и отчёт по обращениям",
    ],
    cta: "Обсудить интенсив",
    href: "/launch?package=launch_intensive",
    highlight: false,
  },
];

const SUPPORT_PACKAGES = [
  {
    name: "Сопровождение Лайт",
    price: "39 000",
    period: "/мес",
    fit: "Одна точка, бизнес готов выполнять задачи самостоятельно.",
    scope: [
      "Мониторинг видимости",
      "Гео-рейтинг и конкуренты",
      "Ежедневные задачи",
      "Недельный отчёт",
      "Базовая аналитика заявок",
    ],
    cta: "Начать сопровождение",
    href: "/launch?package=support_control",
    highlight: false,
  },
  {
    name: "Сопровождение",
    price: "69 000",
    period: "/мес",
    fit: "Основной managed-пакет: часть задач помогает выполнять команда НейроЭксперт.",
    scope: [
      "1-2 точки",
      "Карточки, услуги, FAQ, отзывы, Авито",
      "Динамика конкурентов",
      "Работа с обращениями для возврата",
      "Отчёт по заявкам и точкам роста",
    ],
    cta: "Выбрать сопровождение",
    href: "/launch?package=support_managed",
    highlight: true,
  },
  {
    name: "Рост",
    price: "99 000",
    period: "/мес",
    fit: "Несколько точек, высокая конкуренция, нужен полный контур управления.",
    scope: [
      "До 3-5 точек",
      "Все 5 систем",
      "Ежедневное управление задачами",
      "Отзывы, Авито, обращения, страницы под спрос",
      "Регулярные созвоны и отчёт собственнику",
    ],
    cta: "Обсудить рост",
    href: "/launch?package=support_growth",
    highlight: false,
  },
];

const SOLO_COMPARISON = [
  { label: "Цена", free: "0 ₽", starter: "1 490 ₽/мес", pro: "2 990 ₽/мес", expert: "4 990 ₽/мес" },
  { label: "Комиссия с клиентов", free: "15%", starter: "7%", pro: "3%", expert: "0%" },
  { label: "Ниш", free: "1", starter: "2", pro: "3", expert: "5" },
  { label: "Темы из карты спроса", free: "Без ограничений", starter: "Без ограничений", pro: "Без ограничений", expert: "Без ограничений" },
  { label: "Страниц в месяц", free: "3", starter: "Без ограничений", pro: "Без ограничений", expert: "Без ограничений" },
  { label: "Форматы контента", free: "2", starter: "Все 5", pro: "Все 5", expert: "Все 5" },
  { label: "Кросспостинг", free: "—", starter: "—", pro: "да", expert: "да" },
  { label: "Аналитика страниц и заявок", free: "—", starter: "—", pro: "—", expert: "да" },
  { label: "Сравнение с конкурентами", free: "—", starter: "—", pro: "—", expert: "да" },
];

export function PricingContent() {
  const [audience, setAudience] = useState<Audience>("business");

  return (
    <main>
      <section className="bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-16">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
            Тарифы НейроЭксперт
          </p>
          <h1 className="mt-3 text-4xl font-bold text-slate-950 md:text-5xl">
            Выберите свой путь к новым клиентам
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-600">
            Для экспертов это карта спроса и страницы под вопросы людей. Для бизнеса —
            система локальной видимости, отзывов, Авито, ежедневных задач и повторных касаний.
          </p>

          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              aria-pressed={audience === "business"}
              onClick={() => setAudience("business")}
              className={`rounded-md px-4 py-3 text-sm font-semibold transition-colors ${
                audience === "business"
                  ? "bg-blue-700 text-white"
                  : "text-slate-700 hover:bg-blue-50 hover:text-blue-800"
              }`}
            >
              Бизнес / организация
            </button>
            <button
              type="button"
              aria-pressed={audience === "expert"}
              onClick={() => setAudience("expert")}
              className={`rounded-md px-4 py-3 text-sm font-semibold transition-colors ${
                audience === "expert"
                  ? "bg-blue-700 text-white"
                  : "text-slate-700 hover:bg-blue-50 hover:text-blue-800"
              }`}
            >
              Я эксперт
            </button>
          </div>
        </div>
      </section>

      {audience === "business" ? <BusinessPricing /> : <ExpertPricing />}
    </main>
  );
}

function BusinessPricing() {
  return (
    <>
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold text-blue-700">НейроЭксперт для бизнеса</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-950">
                Для бизнеса мы продаём не доступ к платформе, а канал привлечения клиентов
              </h2>
              <p className="mt-4 text-slate-600">
                Сначала показываем, где бизнесу не хватает видимости и доверия. Затем запускаем точки входа
                из карт, Авито, поиска, отзывов, ответов нейросетей и входящих обращений. После запуска ведём
                ежедневные задачи, недельный отчёт и повторные касания клиентов.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/launch?package=b2b"
                  className="rounded-lg bg-blue-700 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Получить аудит видимости
                </Link>
                <Link
                  href="/for-business"
                  className="rounded-lg border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-slate-100"
                >
                  Посмотреть страницу для бизнеса
                </Link>
              </div>
            </div>

            <div className="grid gap-3">
              {BUSINESS_SYSTEMS.map((item, index) => (
                <div key={item} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-700 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm text-slate-700">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <BusinessModuleMatrix />

      <BusinessPackageSection
        eyebrow="Шаг 1"
        title="Аудит видимости"
        description="Подходит, когда бизнесу нужно понять, почему конкуренты выше в картах, Авито и локальной выдаче."
        packages={AUDIT_PACKAGES}
      />

      <BusinessPackageSection
        eyebrow="Шаг 2"
        title="Запуск канала привлечения за 30 дней"
        description="После аудита упаковываем карточки, страницы, отзывы, FAQ и первые задачи так, чтобы появились измеримые точки входа."
        packages={LAUNCH_PACKAGES}
      />

      <BusinessPackageSection
        eyebrow="Шаг 3"
        title="Сопровождение продаж"
        description="Ежемесячный ритм роста: видимость, конкуренты, отзывы, Авито, повторные касания и недельный отчёт."
        packages={SUPPORT_PACKAGES}
      />

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold text-blue-700">Почему цена отличается</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-950">
                Клиент сразу видит, за что платит 9 900, 49 000 или 99 000 ₽
              </h2>
              <p className="mt-4 text-slate-600">
                Разброс цены завязан на объём точек, площадок, конкуренции и ручной работы.
                Это не «цена с потолка», а понятная лестница сложности.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRICE_FACTORS.map((factor) => (
                <div key={factor} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-700">{factor}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-950">Сети, франшизы и 5+ филиалов</h3>
                <p className="mt-2 text-sm text-amber-800">
                  Для нескольких городов, SLA, расширенных интеграций, телефонии, CRM и команды исполнителей
                  стоимость фиксируется индивидуально после аудита.
                </p>
              </div>
              <Link
                href="/launch?package=enterprise"
                className="rounded-lg bg-amber-300 px-5 py-3 text-center text-sm font-semibold text-amber-950 hover:bg-amber-200"
              >
                Обсудить крупный проект
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function BusinessModuleMatrix() {
  return (
    <section className="bg-blue-50 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-blue-700">Система привлечения клиентов</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            5 модулей системы × аудит, запуск и сопровождение
          </h2>
          <p className="mt-3 text-slate-600">
            Это не разовый маркетинговый отчёт. Каждый модуль проходит путь от диагностики
            к внедрению и регулярному развитию канала привлечения.
          </p>
        </div>

        <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="w-[18%] px-4 py-4 text-left font-semibold text-slate-950">Модуль</th>
                <th className="w-[27%] px-4 py-4 text-left font-semibold text-blue-700">Аудит</th>
                <th className="w-[27%] px-4 py-4 text-left font-semibold text-blue-700">Запуск 30 дней</th>
                <th className="w-[28%] px-4 py-4 text-left font-semibold text-blue-700">Сопровождение</th>
              </tr>
            </thead>
            <tbody>
              {BUSINESS_MODULE_MATRIX.map((row, index) => (
                <tr key={row.module} className={index % 2 === 0 ? "bg-white" : ""}>
                  <td className="px-4 py-4 align-top font-semibold text-slate-950">{row.module}</td>
                  <td className="px-4 py-4 align-top text-slate-700">{row.audit}</td>
                  <td className="px-4 py-4 align-top text-slate-700">{row.launch}</td>
                  <td className="px-4 py-4 align-top text-slate-700">{row.support}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          Поэтому цена растёт не абстрактно: чем больше площадок, филиалов, конкурентов,
          ручной работы и контроля лидов, тем выше объём системы.
        </p>
      </div>
    </section>
  );
}

function ExpertPricing() {
  return (
    <>
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold text-blue-700">НейроЭксперт для экспертов</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">
              Для экспертов: спрос, голосовые ответы, страницы и заявки
            </h2>
            <p className="mt-4 text-slate-600">
              Тарифы для экспертов нужны частным специалистам: психологам, юристам, нутрициологам,
              логопедов, консультантов. Это дешёвый вход, проверка спроса и рост личной экспертной видимости.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {SOLO_PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12 ">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-950">Сравнение тарифов для экспертов</h2>
          <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="w-1/3 px-4 py-3 text-left font-medium text-slate-600"></th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-950">Free</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-950">Starter</th>
                  <th className="px-4 py-3 text-center font-semibold text-blue-700">Pro</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-950">Expert</th>
                </tr>
              </thead>
              <tbody>
                {SOLO_COMPARISON.map((row, index) => (
                  <tr key={row.label} className={index % 2 === 0 ? "bg-white" : ""}>
                    <td className="px-4 py-3 font-medium text-slate-700">{row.label}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{formatCell(row.free)}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{formatCell(row.starter)}</td>
                    <td className="px-4 py-3 text-center font-medium text-blue-700">{formatCell(row.pro)}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{formatCell(row.expert)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">
            Главный результат — не само упоминание в нейросети, а страница под реальный спрос, трафик, клики по записи и заявки.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-slate-950">Одна консультация может окупить тариф</h2>
          <p className="mt-4 text-slate-600">
            Начните бесплатно, проверьте карту спроса и опубликуйте первые страницы.
            Переходить на платные тарифы имеет смысл, когда появляются регулярные публикации и заявки.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/register" className="rounded-lg bg-blue-700 px-8 py-3 font-semibold text-white hover:bg-blue-800">
              Начать бесплатно
            </Link>
            <Link href="/audit" className="rounded-lg border border-slate-300 px-8 py-3 font-semibold text-slate-950 hover:bg-slate-100">
              Посмотреть карту спроса
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function BusinessPackageSection({
  eyebrow,
  title,
  description,
  packages,
}: {
  eyebrow: string;
  title: string;
  description: string;
  packages: typeof AUDIT_PACKAGES;
}) {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-blue-700">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">{title}</h2>
          <p className="mt-3 text-slate-600">{description}</p>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {packages.map((pack) => (
            <PackageCard key={pack.name} pack={pack} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PackageCard({ pack }: { pack: (typeof AUDIT_PACKAGES)[number] }) {
  return (
    <div
      className={`relative flex flex-col rounded-lg border p-6 ${
        pack.highlight ? "border-blue-200 bg-blue-50 shadow-sm shadow-blue-900/10" : "border-slate-200 bg-white"
      }`}
    >
      {pack.highlight && (
        <span className="absolute right-4 top-4 rounded-md bg-blue-700 px-2 py-1 text-xs font-semibold text-white">
          Рекомендуемый
        </span>
      )}
      <h3 className="pr-28 text-xl font-bold text-slate-950">{pack.name}</h3>
      <div className="mt-3">
        <span className="text-3xl font-bold text-slate-950">{pack.price} ₽</span>
        <span className="ml-2 text-sm text-slate-600">{pack.period}</span>
      </div>
      <p className="mt-4 text-sm text-slate-600">{pack.fit}</p>
      <ul className="mt-5 flex-1 space-y-2">
        {pack.scope.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-slate-700">
            <span className="mt-0.5 text-blue-700">&#10003;</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <Link
        href={pack.href}
        className={`mt-6 rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
          pack.highlight
            ? "bg-blue-700 text-white hover:bg-blue-800"
            : "bg-blue-50 text-blue-800 hover:bg-blue-100"
        }`}
      >
        {pack.cta}
      </Link>
    </div>
  );
}

function PlanCard({ plan }: { plan: (typeof SOLO_PLANS)[number] }) {
  return (
    <div
      className={`relative flex flex-col rounded-lg border p-6 ${
        plan.highlight ? "border-blue-200 bg-blue-50 shadow-sm shadow-blue-900/10" : "border-slate-200 bg-white"
      }`}
    >
      {plan.highlight && (
        <span className="absolute right-4 top-4 rounded-md bg-blue-700 px-2 py-1 text-xs font-semibold text-white">
          Популярный
        </span>
      )}
      <h3 className="text-xl font-bold text-slate-950">{plan.name}</h3>
      <div className="mt-3">
        <span className="text-3xl font-bold text-slate-950">{plan.price} ₽</span>
        <span className="ml-2 text-sm text-slate-600">{plan.period}</span>
      </div>
      <span className="mt-3 inline-flex w-fit rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
        {plan.badge}
      </span>
      <p className="mt-4 text-sm text-slate-600">{plan.headline}</p>
      <ul className="mt-5 flex-1 space-y-2">
        {plan.features.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-slate-700">
            <span className="mt-0.5 text-blue-700">&#10003;</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <Link
        href={plan.href}
        className={`mt-6 rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
          plan.highlight
            ? "bg-blue-700 text-white hover:bg-blue-800"
            : plan.id === "free"
              ? "bg-blue-50 text-blue-800 hover:bg-blue-100"
              : "bg-slate-100 text-slate-950 hover:bg-slate-100"
        }`}
      >
        {plan.cta}
      </Link>
    </div>
  );
}

function formatCell(value: string) {
  if (value === "да") return <span className="font-semibold text-green-600">&#10003;</span>;
  if (value === "—") return <span className="text-slate-400">&mdash;</span>;
  return value;
}
