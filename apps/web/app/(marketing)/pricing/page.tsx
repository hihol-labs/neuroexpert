import Link from "next/link";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "0",
    period: "навсегда",
    headline: "Попробуйте бесплатно. Платите только когда зарабатываете.",
    features: [
      "3 контент-пакета в месяц — попробовать и увидеть результат",
      "Каждую неделю — 3 вопроса по вашей теме",
      "Система создаёт экспертную статью + пост для Telegram",
      "Telegram-пост — забирайте и публикуйте у себя",
      "SEO-статья работает на платформе — нейросети цитируют вас",
      "Клиент записался — вы получаете 85%, платформа 15%",
    ],
    cta: "Начать бесплатно",
    ctaHref: "/register",
    highlight: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: "1 490",
    period: "/мес",
    headline: "Все 5 форматов. Больше тем. Комиссия ниже.",
    features: [
      "Всё из Free, без лимитов по пакетам",
      "10 подобранных вопросов в неделю",
      "Все 5 форматов: статья + пост + карточки + Reels + FAQ",
      "Полный экспорт — забирайте всё для своих каналов",
      "Комиссия снижена до 7% (вы получаете 93%)",
    ],
    cta: "Подписаться",
    ctaHref: "/register?plan=starter",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "2 990",
    period: "/мес",
    headline: "Ваши статьи видят везде. Система продвигает вас сама.",
    features: [
      "Всё из Starter",
      "Вопросов без ограничений",
      "Статьи размещаются на Дзен, Хабр, Яндекс Кью, отзовиках",
      "Система помогает распространить каждую статью в первые 3 дня",
      "Напоминания об обновлении статей каждые 3 месяца",
      "Комиссия всего 3% (вы получаете 97%)",
    ],
    cta: "Подписаться",
    ctaHref: "/register?plan=pro",
    highlight: true,
  },
  {
    id: "expert",
    name: "Expert",
    price: "4 990",
    period: "/мес",
    headline: "Вы видите всю картину. Все деньги от клиентов — ваши.",
    features: [
      "Всё из Pro",
      "Видите, цитируют ли вас нейросети — и по каким запросам",
      "Какой % ответов ваш, а какой у конкурентов",
      "Какие сайты нейросети используют в вашей теме",
      "Публичный рейтинг экспертности",
      "Подсказки: «По запросу X отвечает Мария — у вас есть шанс»",
      "Комиссия 0% — все деньги от клиентов ваши",
    ],
    cta: "Подписаться",
    ctaHref: "/register?plan=expert",
    highlight: false,
  },
];

const COMPARISON_ROWS = [
  { label: "Цена", free: "0 ₽", starter: "1 490 ₽/мес", pro: "2 990 ₽/мес", expert: "4 990 ₽/мес" },
  { label: "Комиссия с клиентов", free: "15%", starter: "7%", pro: "3%", expert: "0%" },
  { label: "Пакетов контента в месяц", free: "3", starter: "Без ограничений", pro: "Без ограничений", expert: "Без ограничений" },
  { label: "Вопросов в неделю", free: "3", starter: "10", pro: "Без ограничений", expert: "Без ограничений" },
  { label: "Форматы контента", free: "2 (пост + статья)", starter: "Все 5", pro: "Все 5", expert: "Все 5" },
  { label: "Экспорт Telegram-поста", free: "да", starter: "да", pro: "да", expert: "да" },
  { label: "Экспорт всех форматов", free: "—", starter: "да", pro: "да", expert: "да" },
  { label: "Кнопка «Записаться»", free: "да", starter: "да", pro: "да", expert: "да" },
  { label: "Размещение на площадках", free: "—", starter: "—", pro: "да", expert: "да" },
  { label: "Помощь с распространением", free: "—", starter: "—", pro: "да", expert: "да" },
  { label: "Напоминания об обновлении", free: "—", starter: "—", pro: "да", expert: "да" },
  { label: "Видите цитирование нейросетями", free: "—", starter: "—", pro: "—", expert: "да" },
  { label: "% ответов vs конкуренты", free: "—", starter: "—", pro: "—", expert: "да" },
  { label: "Рейтинг экспертности", free: "—", starter: "—", pro: "—", expert: "да" },
  { label: "Подсказки по конкурентам", free: "—", starter: "—", pro: "—", expert: "да" },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gray-900">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-white">НейроЭксперт</Link>
          <div className="flex items-center gap-4">
            <Link href="/audit" className="text-sm text-gray-300 hover:text-white">Бесплатный аудит</Link>
            <Link href="/login" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Войти</Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-4xl font-bold text-gray-900">Тарифы</h1>
          <p className="mt-4 text-lg text-gray-600">Начните бесплатно. Растите — переходите на тариф побольше.</p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 flex flex-col ${
                  plan.highlight
                    ? "border-blue-500 ring-2 ring-blue-500 shadow-lg relative"
                    : "border-gray-200"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Популярный
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">{plan.price} &#8381;</span>
                    <span className="text-sm text-gray-500">{plan.period}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4 font-medium">{plan.headline}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.ctaHref}
                  className={`block text-center rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : plan.id === "free"
                        ? "bg-gray-900 text-white hover:bg-gray-800"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* B2B */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900">Business</h3>
              <div className="mt-1">
                <span className="text-2xl font-bold text-gray-900">24 990 &#8381;</span>
                <span className="text-sm text-gray-500">/мес</span>
              </div>
              <p className="mt-2 text-sm text-gray-600">Для клиник, юрфирм и команд. Мультиэксперт, API, персональный менеджер.</p>
              <Link href="/register?plan=business" className="mt-4 block text-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200">
                Подписаться
              </Link>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900">Enterprise</h3>
              <div className="mt-1">
                <span className="text-2xl font-bold text-gray-900">99 990 &#8381;</span>
                <span className="text-sm text-gray-500">/мес</span>
              </div>
              <p className="mt-2 text-sm text-gray-600">White-label, SLA, выделенная инфраструктура, кастомные интеграции.</p>
              <Link href="mailto:hello@neuroexpertise.ru" className="mt-4 block text-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200">
                Связаться
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Сравнение тарифов</h2>
          <div className="overflow-x-auto bg-white rounded-2xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 w-1/3"></th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Free</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Starter</th>
                  <th className="px-4 py-3 text-center font-semibold text-blue-600">Pro</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Expert</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-gray-50/50" : ""}>
                    <td className="px-4 py-2.5 font-medium text-gray-700">{row.label}</td>
                    <td className="px-4 py-2.5 text-center text-gray-600">{formatCell(row.free)}</td>
                    <td className="px-4 py-2.5 text-center text-gray-600">{formatCell(row.starter)}</td>
                    <td className="px-4 py-2.5 text-center text-gray-900 font-medium">{formatCell(row.pro)}</td>
                    <td className="px-4 py-2.5 text-center text-gray-600">{formatCell(row.expert)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ROI block */}
      <section className="py-16 bg-blue-600">
        <div className="mx-auto max-w-3xl px-6 text-center text-white">
          <h2 className="text-2xl font-bold">Одна консультация = 3 000–5 000 &#8381;</h2>
          <p className="mt-4 text-lg text-blue-100">Подписка окупается с первого клиента.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="rounded-lg bg-white px-8 py-3 font-semibold text-blue-600 hover:bg-blue-50">
              Начать бесплатно
            </Link>
            <Link href="/audit" className="rounded-lg border-2 border-white/50 px-8 py-3 font-semibold text-white hover:bg-white/10">
              Бесплатный аудит
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} НейроЭксперт
        </div>
      </footer>
    </div>
  );
}

function formatCell(value: string) {
  if (value === "да") return <span className="text-green-600 font-semibold">&#10003;</span>;
  if (value === "—") return <span className="text-gray-300">—</span>;
  return value;
}
