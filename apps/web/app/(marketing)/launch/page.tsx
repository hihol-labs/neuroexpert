import Link from "next/link";
import type { Metadata } from "next";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";

const TITLE = "Запуск канала привлечения клиентов под ключ | НейроЭксперт";
const DESCRIPTION =
  "За 30 дней запускаем канал заявок для бизнеса и экспертов: аудит видимости, карты, Авито, отзывы, страницы под спрос, AI-видимость и отчёт по трафику, кликам и заявкам.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/launch" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/launch" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

interface Props {
  searchParams: { success?: string };
}

const STEPS = [
  "Проводим аудит видимости: поиск, карты, Авито, отзывы, сайт, Telegram и нейросети",
  "Находим реальные вопросы людей и коммерческие точки входа в вашей нише",
  "Упаковываем карточки, офферы, экспертные ответы, страницы и CTA для записи",
  "Публикуем, отправляем на индексацию, усиливаем отзывы и площадки",
  "Смотрим трафик, клики, заявки, пропущенные обращения и недельный отчёт",
];

export default function LaunchPage({ searchParams }: Props) {
  const success = searchParams.success === "1";

  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <main>
        <section className="py-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_420px] lg:items-start">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-cyan-300">
                Запуск под ключ
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Запускаем канал привлечения клиентов из поиска, карт, Авито, отзывов и нейросетей за 30 дней
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-300">
                Мы продаём не абстрактную платформу, а запуск результата: аудит,
                упаковку, публикации, усиление карточек, сбор отзывов и первые
                измеримые сигналы — индексацию, трафик, клики, заявки и найденные
                потери во входящих обращениях.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {STEPS.map((step, i) => (
                  <div key={step} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-bold text-cyan-300">0{i + 1}</div>
                    <p className="mt-2 text-sm text-gray-200">{step}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5">
                <p className="text-sm text-amber-100">
                  Мы не обещаем фиксированное число клиентов без данных. Цель первого месяца —
                  запустить рабочий канал и получить первые измеримые сигналы: исправленные
                  площадки, страницы, индексацию, трафик, клики, заявки и понятный список
                  ежедневных действий.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-400/20 bg-[#04080f]/80 p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)] backdrop-blur-xl">
              {success ? (
                <div className="rounded-2xl border border-green-400/20 bg-green-400/10 p-4 text-green-100">
                  Заявка отправлена. Мы свяжемся с вами и предложим план запуска.
                </div>
              ) : null}

              <h2 className="text-xl font-bold text-white">Получить план запуска</h2>
              <p className="mt-2 text-sm text-gray-400">
                Оставьте контакты — подготовим первичный разбор видимости и формат запуска.
              </p>

              <form action="/api/service-orders" method="POST" className="mt-6 space-y-4">
                <input type="hidden" name="package_type" value="launch_30d" />
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Имя *</label>
                  <input
                    name="name"
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-cyan-400"
                    placeholder="Как к вам обращаться"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Контакт *</label>
                  <input
                    name="contact"
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-cyan-400"
                    placeholder="Telegram, WhatsApp или телефон"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Email</label>
                  <input
                    name="email"
                    type="email"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-cyan-400"
                    placeholder="Для отчёта и договора"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Ниша</label>
                  <input
                    name="niche"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-cyan-400"
                    placeholder="Стоматология, косметология, юристы, психолог..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Сайт или площадки</label>
                  <input
                    name="website"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-cyan-400"
                    placeholder="Сайт, Яндекс Карты, 2ГИС, Авито, VK, Telegram"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Цель</label>
                  <textarea
                    name="goal"
                    rows={3}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-cyan-400"
                    placeholder="Каких клиентов хотите привлекать и какая услуга самая важная"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold text-white hover:from-cyan-400 hover:to-blue-500"
                >
                  Отправить заявку
                </button>
                <p className="text-xs text-gray-500">
                  Нажимая кнопку, вы соглашаетесь с{" "}
                  <Link href="/privacy" className="text-cyan-300 hover:text-cyan-200">
                    политикой конфиденциальности
                  </Link>
                  .
                </p>
              </form>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
