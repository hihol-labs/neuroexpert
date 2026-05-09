"use client";

import Link from "next/link";
import { useState } from "react";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";
import { FadeIn } from "@/components/marketing/fade-in";

const PROBLEMS = [
  {
    icon: "🗺️",
    title: "В картах и поиске выше конкуренты",
    desc: "По запросам рядом, цена, срочно и на районе клиент видит не вас: карточка слабая, услуг мало, фото устарели, рейтинг и отзывы проигрывают.",
  },
  {
    icon: "📦",
    title: "Авито, VK, сайт и Telegram не собраны в канал",
    desc: "Площадки есть, но каждая живёт отдельно. Нет понятной связки: вопрос клиента -> страница или карточка -> CTA -> заявка -> follow-up.",
  },
  {
    icon: "📞",
    title: "Часть заявок уже приходит, но теряется",
    desc: "Не взяли трубку, поздно ответили, не дожали после расчёта, не попросили отзыв, не вернули старого клиента — деньги уходят без видимого отчёта.",
  },
];

const BENEFITS = [
  {
    icon: "🔎",
    title: "1. Аудит видимости",
    desc: "Проверяем Яндекс Карты, 2ГИС, Авито, VK, сайт, Telegram, отзывы, формы и телефонию. Показываем, где карточка пустая, где нет услуг и где теряются заявки.",
    color: "cyan",
  },
  {
    icon: "📍",
    title: "2. Гео-рейтинг и конкуренты",
    desc: "Сравниваем позиции по локальным запросам с топ-3 конкурентами: отзывы, фото, цены, акции, ответы на негатив, заполненность услуг и карточек.",
    color: "purple",
  },
  {
    icon: "✅",
    title: "3. Ежедневные задачи",
    desc: "Не абстрактная аналитика, а действия: добавить фото, обновить услуги, ответить на отзывы, поднять объявления, переписать описание, добавить FAQ.",
    color: "cyan",
  },
  {
    icon: "⭐",
    title: "4. Сбор и возврат отзывов",
    desc: "После визита клиент получает ссылку: довольные оставляют отзыв на Яндекс/2ГИС, недовольные пишут владельцу до публичного негатива.",
    color: "purple",
  },
  {
    icon: "📞",
    title: "5. Потерянные лиды",
    desc: "Фиксируем пропущенные звонки, сообщения без ответа, клиентов без follow-up и потенциальную потерю выручки за неделю.",
    color: "cyan",
  },
];

const INDUSTRIES = [
  { icon: "🦷", name: "Стоматологии" },
  { icon: "✨", name: "Косметологии" },
  { icon: "💆", name: "Салоны красоты" },
  { icon: "🚗", name: "Автосервисы" },
  { icon: "⚖️", name: "Юридические фирмы" },
  { icon: "🏥", name: "Клиники и медкабинеты" },
  { icon: "🧒", name: "Детские центры" },
  { icon: "🏠", name: "Ремонт квартир" },
  { icon: "🧼", name: "Клининг" },
  { icon: "❄️", name: "Окна и кондиционеры" },
];

const PLANS = [
  {
    name: "Аудит видимости",
    price: "9 900-29 900",
    period: "₽",
    desc: "Разово: понять, где бизнес теряет клиентов",
    features: [
      "9 900₽ — 1 город, 2-3 площадки, до 3 конкурентов",
      "19 900₽ — карты + Авито + сайт + отзывы, до 5 конкурентов",
      "29 900₽ — несколько точек, телефония/формы и расширенный разбор",
      "Индекс видимости и список слабых мест",
      "План ежедневных задач на первую неделю",
    ],
    cta: "Заказать аудит",
    highlight: false,
  },
  {
    name: "Запуск за 30 дней",
    price: "49 000-150 000",
    period: "₽",
    desc: "Managed запуск канала заявок",
    features: [
      "49 000₽ — одна услуга, базовые карточки и первые страницы",
      "90 000₽ — несколько услуг, карты + Авито + отзывы + SEO/AIO",
      "150 000₽ — конкурентная ниша, несколько точек и ручное сопровождение",
      "Упаковка офферов, CTA и страниц под спрос",
      "Первые измеримые результаты: индексация, трафик, клики, заявки",
    ],
    cta: "Запустить канал",
    highlight: true,
  },
  {
    name: "Local Sales OS",
    price: "39 000-99 000",
    period: "₽/мес",
    desc: "Сопровождение и операционная система роста",
    features: [
      "39 000₽ — контроль карточек, задач, отзывов и отчётности",
      "69 000₽ — добавляем конкурентов, Авито, публикации и follow-up",
      "99 000₽ — несколько точек, лиды, команда, углублённая аналитика",
      "Ежедневные задачи + недельный отчёт по результатам",
      "Фокус на рост входящих обращений и возврат потерянных лидов",
    ],
    cta: "Обсудить сопровождение",
    highlight: false,
  },
];

function B2BLeadForm() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [experts, setExperts] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !company.trim() || !contact.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/b2b-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim(),
          contact: contact.trim(),
          experts_count: experts,
          message: message.trim(),
        }),
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
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-2xl font-bold text-white">Заявка отправлена!</h3>
        <p className="mt-3 text-gray-400">
          Мы свяжемся с вами в течение 24 часов.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Имя *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-md focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            placeholder="Иван Иванов"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Компания *
          </label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-md focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            placeholder="Название компании"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Контакт (Telegram / телефон) *
          </label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-md focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            placeholder="@telegram или +7..."
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Кол-во точек / филиалов
          </label>
          <select
            value={experts}
            onChange={(e) => setExperts(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white backdrop-blur-md focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 [&>option]:bg-gray-900"
          >
            <option value="">Выберите...</option>
            <option value="1">1</option>
            <option value="2-3">2-3</option>
            <option value="4-5">4-5</option>
            <option value="5+">5+</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Расскажите о задаче
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-md focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 resize-none"
          placeholder="Какие площадки уже есть: Яндекс Карты, 2ГИС, Авито, сайт, VK, Telegram..."
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="group relative w-full rounded-2xl px-8 py-4 text-lg font-semibold text-white overflow-hidden transition-transform hover:scale-[1.02] disabled:opacity-50"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600" />
        <span className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-blue-600 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
        <span className="relative">
          {submitting ? "Отправка..." : "Оставить заявку"}
        </span>
      </button>
    </form>
  );
}

export default function ForBusinessPage() {
  return (
    <>
      <MarketingHeader />

        {/* ===== HERO ===== */}
        <section className="min-h-[85vh] flex items-center justify-center">
          <div className="mx-auto max-w-4xl px-6 py-20 text-center">
            <FadeIn>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-2 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-cyan-400" />
                </span>
                <span className="text-sm font-medium text-cyan-300">
                  Local Sales OS для бизнеса
                </span>
              </div>
            </FadeIn>

            <FadeIn delay={150}>
              <h1 className="mt-10 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl leading-[1.1]">
                <span className="text-white">Покажем, где бизнес</span>
                <br />
                <span className="text-cyan-400 [text-shadow:_0_0_40px_rgba(34,211,238,0.5),_0_0_80px_rgba(34,211,238,0.2)]">
                  теряет клиентов
                </span>
                <br />
                <span className="text-white">и запустим рост заявок</span>
              </h1>
            </FadeIn>

            <FadeIn delay={300}>
              <p className="mx-auto mt-8 max-w-2xl text-lg text-gray-300 leading-relaxed">
                Для локальных компаний с высоким чеком и конкуренцией:
                аудитируем карты, Авито, отзывы, сайт, Telegram, поиск и нейросети,
                затем превращаем слабые места в ежедневные действия, страницы,
                карточки и заявки.
              </p>
            </FadeIn>

            <FadeIn delay={450}>
              <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="#form"
                  className="group relative rounded-2xl px-10 py-4 text-lg font-semibold text-white overflow-hidden transition-all hover:scale-105 border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)]"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl" />
                  <span className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-300" />
                  <span className="relative">Получить аудит видимости</span>
                </a>
                <Link
                  href="/pricing"
                  className="rounded-2xl border border-cyan-400/30 bg-white/5 px-10 py-4 text-lg font-semibold text-white backdrop-blur-md hover:bg-white/10 hover:border-cyan-400/60 transition-all"
                >
                  Смотреть B2B-пакеты
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ===== ПРОБЛЕМЫ ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Знакомые проблемы?
              </h2>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-3">
              {PROBLEMS.map((p, i) => (
                <FadeIn key={p.title} delay={i * 150}>
                  <div className="relative h-full rounded-3xl border border-red-500/15 bg-[#04080f]/60 p-8 backdrop-blur-xl hover:border-red-400/30 transition-all overflow-hidden">
                    <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-red-400/30 to-transparent" />
                    <span className="text-4xl">{p.icon}</span>
                    <h3 className="mt-4 text-xl font-semibold text-white">
                      {p.title}
                    </h3>
                    <p className="mt-3 text-gray-400 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ===== РЕШЕНИЕ ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Что получает компания
              </h2>
              <p className="mt-4 text-gray-400 max-w-xl mx-auto">
                Не просто маркетинг, а операционная система привлечения заявок
              </p>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((b, i) => (
                <FadeIn key={b.title} delay={i * 100}>
                  <div
                    className={`relative h-full rounded-3xl border bg-[#04080f]/60 p-8 backdrop-blur-xl transition-all overflow-hidden ${
                      b.color === "purple"
                        ? "border-purple-500/20 hover:border-purple-400/40"
                        : "border-cyan-500/20 hover:border-cyan-400/40"
                    }`}
                  >
                    <div
                      className={`absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent to-transparent ${
                        b.color === "purple"
                          ? "via-purple-400/30"
                          : "via-cyan-400/30"
                      }`}
                    />
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                        b.color === "purple"
                          ? "bg-purple-500/15 border-purple-500/25"
                          : "bg-cyan-500/15 border-cyan-500/25"
                      }`}
                    >
                      <span className="text-2xl">{b.icon}</span>
                    </div>
                    <h3
                      className={`mt-4 text-lg font-semibold ${
                        b.color === "purple"
                          ? "text-purple-300"
                          : "text-cyan-300"
                      }`}
                    >
                      {b.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                      {b.desc}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ===== ОТРАСЛИ ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-5xl px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Для каких компаний
              </h2>
            </FadeIn>

            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
              {INDUSTRIES.map((ind, i) => (
                <FadeIn key={ind.name} delay={Math.min(i * 50, 400)}>
                  <div className="rounded-2xl border border-white/10 bg-[#04080f]/50 p-4 text-center backdrop-blur-xl hover:border-cyan-500/20 hover:bg-cyan-500/5 transition-all">
                    <span className="text-2xl">{ind.icon}</span>
                    <p className="mt-2 text-xs font-medium text-gray-400">
                      {ind.name}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ===== ТАРИФЫ ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-5xl px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Пакеты внедрения
              </h2>
              <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
                Разброс цены зависит от количества точек, площадок, конкурентов,
                услуг и уровня ручного сопровождения. Это видно до оплаты в плане работ.
              </p>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-3">
              {PLANS.map((plan, i) => (
                <FadeIn key={plan.name} delay={i * 150}>
                  <div
                    className={`relative rounded-3xl border p-8 backdrop-blur-xl overflow-hidden ${
                      plan.highlight
                        ? "border-cyan-500/30 bg-cyan-500/5 shadow-[0_0_30px_rgba(34,211,238,0.08)]"
                        : "border-white/10 bg-[#04080f]/60"
                    }`}
                  >
                    {plan.highlight && (
                      <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                    )}

                    <h3 className="text-2xl font-bold text-white">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">{plan.desc}</p>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-cyan-400">
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-gray-500">{plan.period}</span>
                      )}
                    </div>

                    <ul className="mt-6 space-y-3">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2 text-sm text-gray-300"
                        >
                          <span className="text-cyan-400 flex-shrink-0">
                            ✓
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <a
                      href="#form"
                      className={`mt-8 block w-full rounded-2xl py-3 text-center font-semibold transition-all ${
                        plan.highlight
                          ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90"
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

        {/* ===== ФОРМА ЗАЯВКИ ===== */}
        <section id="form" className="py-24">
          <div className="mx-auto max-w-2xl px-6">
            <FadeIn>
              <div className="rounded-3xl border border-cyan-500/20 bg-[#04080f]/60 p-10 backdrop-blur-xl overflow-hidden relative">
                <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                <h2 className="text-2xl font-bold text-white text-center mb-2">
                  Обсудим ваш проект
                </h2>
                <p className="text-gray-400 text-center mb-8">
                  Расскажите о компании, услугах и площадках — предложим аудит и план запуска Local Sales OS
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
