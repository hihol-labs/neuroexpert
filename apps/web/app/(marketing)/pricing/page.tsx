import Link from "next/link";
import type { Metadata } from "next";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";

const TITLE = "Тарифы НейроЭксперт — карта спроса, страницы и заявки для экспертов";
const DESCRIPTION =
  "НейроЭксперт находит реальный спрос в нише и превращает голосовые ответы эксперта в страницы для привлечения заявок. Free, Starter, Pro, Expert, Business и запуск под ключ.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/pricing" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "0",
    period: "навсегда",
    headline: "Проверьте спрос и опубликуйте первые страницы без риска.",
    commission: "15%",
    commissionNote: "вы получаете 85%",
    scenario: "Платформа помогает проверить, какие вопросы люди уже задают в вашей нише. Если через страницу пришёл клиент на 5 000 ₽ — вы получили 4 250 ₽.",
    features: [
      "1 ниша",
      "Карта спроса: темы подбираются без ограничений",
      "3 контент-пакета в месяц",
      "2 формата: экспертная статья + пост для Telegram",
      "Telegram-пост — забирайте и публикуйте у себя",
      "SEO-страница работает на платформе",
      "Кнопка «Записаться» на каждой странице",
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
    headline: "Регулярно закрывайте спрос экспертными страницами.",
    commission: "7%",
    commissionNote: "вы получаете 93%",
    scenario: "При 5 клиентах по 5 000 ₽: комиссия 1 750 ₽ вместо 3 750 ₽ на Free. Экономия 2 000 ₽/мес — подписка окупается.",
    features: [
      "2 ниши — добавьте смежное направление",
      "Контент-пакеты без ограничений",
      "Все 5 форматов: статья + пост + карточки + Reels + FAQ",
      "Полный экспорт — забирайте всё для своих каналов",
      "Больше страниц под реальные вопросы аудитории",
      "Комиссия снижена до 7%",
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
    headline: "Добавьте распространение и быстрее проверяйте, что даёт заявки.",
    commission: "3%",
    commissionNote: "вы получаете 97%",
    scenario: "Страницы + посты + кросспостинг. При 8 клиентах: комиссия 1 200 ₽ vs 6 000 ₽ на Free. Разница покрывает подписку 3 раза.",
    features: [
      "3 ниши — полный охват вашей экспертизы",
      "Всё из Starter",
      "Размещение на Дзен, Хабр, Яндекс Кью, отзовиках",
      "Помощь с распространением в первые 3 дня",
      "Напоминания об обновлении каждые 3 месяца",
      "Комиссия всего 3%",
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
    headline: "Видите весь путь: спрос, страницы, трафик, клики и заявки.",
    commission: "0%",
    commissionNote: "вы получаете 100%",
    scenario: "При 10 клиентах по 5 000 ₽: на Free вы теряли бы 7 500 ₽/мес на комиссии. Expert = чистая экономия 2 510 ₽/мес + полная аналитика результата.",
    features: [
      "5 ниш — широкий профиль, личный бренд",
      "Всё из Pro",
      "Видите путь от темы к заявке: спрос, публикации, трафик, клики",
      "Видите, появляются ли ваши страницы в нейросетях — как дополнительный канал",
      "Ваш % ответов vs конкуренты",
      "Какие сайты используют нейросети в вашей теме",
      "Публичный рейтинг экспертности",
      "Подсказки: «По запросу X отвечает Мария — у вас есть шанс»",
      "Комиссия 0%",
    ],
    cta: "Подписаться",
    ctaHref: "/register?plan=expert",
    highlight: false,
  },
];

const COMPARISON_ROWS = [
  { label: "Цена", free: "0 ₽", starter: "1 490 ₽/мес", pro: "2 990 ₽/мес", expert: "4 990 ₽/мес" },
  { label: "Комиссия с клиентов", free: "15%", starter: "7%", pro: "3%", expert: "0%" },
  { label: "Вы получаете", free: "85%", starter: "93%", pro: "97%", expert: "100%" },
  { label: "Главная ценность", free: "Проверка спроса", starter: "Регулярные страницы", pro: "Дистрибуция", expert: "Аналитика заявок" },
  { label: "Ниш", free: "1", starter: "2", pro: "3", expert: "5" },
  { label: "Подобранных тем", free: "Без ограничений", starter: "Без ограничений", pro: "Без ограничений", expert: "Без ограничений" },
  { label: "Контент-пакетов в месяц", free: "3", starter: "Без ограничений", pro: "Без ограничений", expert: "Без ограничений" },
  { label: "Форматы контента", free: "2 (пост + статья)", starter: "Все 5", pro: "Все 5", expert: "Все 5" },
  { label: "Экспорт Telegram-поста", free: "да", starter: "да", pro: "да", expert: "да" },
  { label: "Экспорт всех форматов", free: "—", starter: "да", pro: "да", expert: "да" },
  { label: "Кнопка «Записаться»", free: "да", starter: "да", pro: "да", expert: "да" },
  { label: "Размещение на площадках", free: "—", starter: "—", pro: "да", expert: "да" },
  { label: "Помощь с распространением", free: "—", starter: "—", pro: "да", expert: "да" },
  { label: "Напоминания об обновлении", free: "—", starter: "—", pro: "да", expert: "да" },
  { label: "AI-упоминания", free: "—", starter: "—", pro: "—", expert: "доп. канал" },
  { label: "% ответов vs конкуренты", free: "—", starter: "—", pro: "—", expert: "да" },
  { label: "Рейтинг экспертности", free: "—", starter: "—", pro: "—", expert: "да" },
  { label: "Подсказки по конкурентам", free: "—", starter: "—", pro: "—", expert: "да" },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      {/* Hero */}
      <section className="py-16 bg-[#040714]/40 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-4xl font-bold text-white">Тарифы</h1>
          <p className="mt-4 text-lg text-gray-400">
            Начните с карты спроса и первых страниц. Растите — снижайте комиссию,
            получайте больше форматов, дистрибуцию и аналитику заявок.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Платформа продаёт не AI-упоминания сами по себе, а путь от реального вопроса пользователя к странице записи.
          </p>
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
                    ? "border-blue-500 ring-2 ring-blue-500 bg-blue-500/5 relative"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Популярный
                  </div>
                )}
                <div className="mb-2">
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-white">{plan.price} &#8381;</span>
                    <span className="text-sm text-gray-400">{plan.period}</span>
                  </div>
                  <div className="mt-1">
                    <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-gray-300">
                      Комиссия {plan.commission} ({plan.commissionNote})
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1 font-medium">{plan.headline}</p>
                <p className="text-xs text-gray-500">
                  Без обещаний мгновенных клиентов: результат измеряется по страницам, трафику, кликам и заявкам.
                </p>

                {/* Сценарий */}
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 mb-4">
                  <p className="text-xs text-blue-200">{plan.scenario}</p>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-300">
                      <span className="text-green-400 mt-0.5 flex-shrink-0">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.ctaHref}
                  className={`block text-center rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : plan.id === "free"
                        ? "bg-white text-gray-900 hover:bg-gray-100"
                        : "bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* B2B */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-bold text-white">Business</h3>
              <div className="mt-1">
                <span className="text-2xl font-bold text-white">24 990 &#8381;</span>
                <span className="text-sm text-gray-400">/мес</span>
              </div>
              <p className="mt-2 text-sm text-gray-400">Для клиник, юрфирм и команд. До 10 ниш, до 5 экспертов, карта спроса, брендированные страницы, заявки, персональный менеджер.</p>
              <p className="mt-2 text-xs text-gray-500">Цели по публикациям, трафику и заявкам фиксируются индивидуально.</p>
              <Link href="/register?plan=business" className="mt-4 block text-center rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15">
                Подписаться
              </Link>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-bold text-white">Enterprise</h3>
              <div className="mt-1">
                <span className="text-2xl font-bold text-white">99 990 &#8381;</span>
                <span className="text-sm text-gray-400">/мес</span>
              </div>
              <p className="mt-2 text-sm text-gray-400">White-label, SLA, выделенная инфраструктура, безлимит экспертов, кастомные интеграции и управляемая карта спроса.</p>
              <p className="mt-2 text-xs text-gray-500">Метрики результата и SLA фиксируются индивидуально.</p>
              <Link href="mailto:hello@neuroexpertise.ru" className="mt-4 block text-center rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15">
                Связаться
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Как работает апгрейд */}
      <section className="py-12 bg-[#040714]/40 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-white text-center mb-4">
            Когда стоит перейти на платную подписку
          </h2>
          <p className="text-center text-gray-400 text-sm mb-8">
            Подписка — это не барьер, а способ закрывать больше реального спроса,
            быстрее распространять материалы и видеть, что приносит заявки.
            Считайте сами:
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
              <div className="text-sm font-semibold text-gray-400">Free &rarr; Starter</div>
              <div className="mt-2 text-2xl font-bold text-white">Сценарий: 5 клиентов</div>
              <p className="mt-2 text-sm text-gray-400">
                При 5 клиентах &times; 5 000 &#8381;: комиссия 15% = 3 750 &#8381;.
                На Starter: 1 490 + 7% = 3 240 &#8381;. Экономите + получаете все 5 форматов.
              </p>
            </div>
            <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-5">
              <div className="text-sm font-semibold text-blue-400">Starter &rarr; Pro</div>
              <div className="mt-2 text-2xl font-bold text-white">Сценарий: 8 клиентов</div>
              <p className="mt-2 text-sm text-gray-400">
                Комиссия 3% вместо 7%. Плюс кросспост на площадки — больше охват,
                больше шансов получить трафик и заявки.
                Разница покрывает подписку с запасом.
              </p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
              <div className="text-sm font-semibold text-gray-400">Pro &rarr; Expert</div>
              <div className="mt-2 text-2xl font-bold text-white">Сценарий: 10+ клиентов</div>
              <p className="mt-2 text-sm text-gray-400">
                0% комиссии — все деньги ваши. Плюс аналитика: видите,
                какие темы, страницы и каналы двигают людей к заявке.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Сравнение тарифов</h2>
          <div className="overflow-x-auto bg-white/5 rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left font-medium text-gray-400 w-1/3"></th>
                  <th className="px-4 py-3 text-center font-semibold text-white">Free</th>
                  <th className="px-4 py-3 text-center font-semibold text-white">Starter</th>
                  <th className="px-4 py-3 text-center font-semibold text-blue-400">Pro</th>
                  <th className="px-4 py-3 text-center font-semibold text-white">Expert</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white/5" : ""}>
                    <td className="px-4 py-2.5 font-medium text-gray-300">{row.label}</td>
                    <td className="px-4 py-2.5 text-center text-gray-300">{formatCell(row.free)}</td>
                    <td className="px-4 py-2.5 text-center text-gray-300">{formatCell(row.starter)}</td>
                    <td className="px-4 py-2.5 text-center text-blue-400 font-medium">{formatCell(row.pro)}</td>
                    <td className="px-4 py-2.5 text-center text-gray-300">{formatCell(row.expert)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-gray-500 text-center">
            AI-упоминания остаются полезной метрикой, но главный результат продукта —
            страницы под реальный спрос, трафик, клики по записи и заявки.
          </p>
        </div>
      </section>

      {/* ROI block */}
      <section className="py-16 bg-blue-600">
        <div className="mx-auto max-w-3xl px-6 text-center text-white">
          <h2 className="text-2xl font-bold">Одна консультация = 3 000-5 000 &#8381;</h2>
          <p className="mt-4 text-lg text-blue-100">
            Начните с карты спроса и первой страницы. На Free — вы не платите ничего вперёд.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="rounded-lg bg-white px-8 py-3 font-semibold text-blue-600 hover:bg-blue-50">
              Начать бесплатно
            </Link>
            <Link href="/audit" className="rounded-lg border-2 border-white/50 px-8 py-3 font-semibold text-white hover:bg-white/10">
              Карта спроса
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function formatCell(value: string) {
  if (value === "да") return <span className="text-green-400 font-semibold">&#10003;</span>;
  if (value === "—") return <span className="text-gray-600">&mdash;</span>;
  return value;
}
