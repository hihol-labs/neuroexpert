import Link from "next/link";
import type { Metadata } from "next";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";

const TITLE = "Запуск канала привлечения клиентов под ключ | НейроЭксперт";
const DESCRIPTION =
  "За 30 дней запускаем канал привлечения клиентов для бизнеса и экспертов: аудит видимости, карты, Авито, отзывы, страницы под спрос, видимость в нейросетях и отчёт по трафику, кликам и обращениям.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/launch" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/launch" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

interface Props {
  searchParams: { success?: string; package?: string };
}

const STEPS = [
  "Проводим аудит видимости: поиск, карты, Авито, отзывы, сайт, Telegram и нейросети",
  "Находим реальные вопросы людей и коммерческие точки входа в вашей нише",
  "Упаковываем карточки, офферы, экспертные ответы, страницы и кнопки записи",
  "Публикуем, отправляем на индексацию, усиливаем отзывы и площадки",
  "Смотрим трафик, клики, заявки, пропущенные обращения и недельный отчёт",
];

const RESULT_GATES = [
  {
    title: "Перед публикацией",
    desc: "Проверяем спрос, услугу, оффер, CTA, факты, FAQ, доказательства и способ измерения.",
  },
  {
    title: "После запуска",
    desc: "Смотрим индексацию, показы, клики, CTA, заявки, звонки и скорость ответа.",
  },
  {
    title: "Через 2-4 недели",
    desc: "Решаем: оставить страницу, усилить, объединить, обновить или убрать из контура.",
  },
];

function resolvePackageType(packageName?: string): "audit" | "launch_30d" | "managed_monthly" | "b2b" {
  if (!packageName) return "launch_30d";
  if (packageName.includes("audit")) return "audit";
  if (packageName.includes("support") || packageName.includes("managed")) return "managed_monthly";
  if (packageName.includes("b2b") || packageName.includes("local_sales")) return "b2b";
  return "launch_30d";
}

export default function LaunchPage({ searchParams }: Props) {
  const success = searchParams.success === "1";
  const packageType = resolvePackageType(searchParams.package);
  const isB2B = packageType === "b2b" || packageType === "audit" || packageType === "managed_monthly";

  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <main>
        <section className="py-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_420px] lg:items-start">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-blue-700">
                Запуск под ключ
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                Запускаем канал привлечения клиентов из поиска, карт, Авито, отзывов, нейросетей и входящих обращений
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-700">
                Мы продаём не абстрактную платформу, а запуск результата:
                аудит каналов, упаковку точек входа, усиление карточек, сбор
                отзывов, экспертные страницы и первые измеримые сигналы —
                индексацию, трафик, клики, обращения, записи и список клиентов
                для повторного касания.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {STEPS.map((step, i) => (
                  <div key={step} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-bold text-blue-700">0{i + 1}</div>
                    <p className="mt-2 text-sm text-slate-700">{step}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm text-amber-800">
                  Мы не обещаем фиксированное число клиентов без данных. Цель первого месяца —
                  запустить рабочий канал и получить первые измеримые сигналы: исправленные
                  площадки, страницы, индексацию, трафик, клики, обращения и понятный список
                  ежедневных действий. Если страница не ведёт к действию клиента, она становится
                  задачей на улучшение, объединение или удаление.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              {success ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800">
                  Заявка отправлена. Мы свяжемся с вами и предложим план запуска.
                </div>
              ) : null}

              <h2 className="text-xl font-bold text-slate-950">
                {isB2B ? "Получить аудит и план запуска" : "Получить план запуска"}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Оставьте контакты и базовый контекст — подготовим первичный
                разбор видимости и формат запуска.
              </p>

              <form action="/api/service-orders" method="POST" className="mt-6 space-y-4">
                <input type="hidden" name="package_type" value={packageType} />
                <input type="hidden" name="package_label" value={searchParams.package || "launch_30d"} />
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Имя *</label>
                  <input
                    name="name"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-gray-500 outline-none focus:border-blue-500"
                    placeholder="Как к вам обращаться"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Контакт *</label>
                  <input
                    name="contact"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-gray-500 outline-none focus:border-blue-500"
                    placeholder="Telegram, WhatsApp или телефон"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Email</label>
                  <input
                    name="email"
                    type="email"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-gray-500 outline-none focus:border-blue-500"
                    placeholder="Для отчёта и договора"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Ниша</label>
                  <input
                    name="niche"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-gray-500 outline-none focus:border-blue-500"
                    placeholder="Стоматология, косметология, юристы, психолог..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Город / район</label>
                  <input
                    name="city"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-gray-500 outline-none focus:border-blue-500"
                    placeholder="Город, район или филиалы"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Сайт или площадки</label>
                  <input
                    name="website"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-gray-500 outline-none focus:border-blue-500"
                    placeholder="Сайт, Яндекс Карты, 2ГИС, Авито, VK, Telegram"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Конкуренты</label>
                  <textarea
                    name="competitors"
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-gray-500 outline-none focus:border-blue-500"
                    placeholder="3-5 компаний, с которыми вас сравнивают"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Цель</label>
                  <textarea
                    name="goal"
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-gray-500 outline-none focus:border-blue-500"
                    placeholder="Каких клиентов хотите привлекать, какая услуга важнее всего, есть ли пропущенные звонки или обращения без повторного касания"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-800"
                >
                  Отправить заявку
                </button>
                <p className="text-xs text-slate-500">
                  Нажимая кнопку, вы соглашаетесь с{" "}
                  <Link href="/privacy" className="text-blue-700 hover:text-blue-900">
                    политикой конфиденциальности
                  </Link>
                  .
                </p>
              </form>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-blue-700">Контроль результата</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-950">
                Запуск не заканчивается публикацией страниц
              </h2>
              <p className="mt-4 text-slate-600">
                Мы заранее фиксируем, какие сигналы должны показать движение:
                индексация, показы, клики, заявки, исходы лидов и задачи роста.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {RESULT_GATES.map((gate, index) => (
                <div key={gate.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-bold text-blue-700">0{index + 1}</div>
                  <h3 className="mt-3 text-lg font-semibold text-slate-950">{gate.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{gate.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
