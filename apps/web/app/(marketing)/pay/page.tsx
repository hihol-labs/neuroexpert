import type { Metadata } from "next";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";

const TITLE = "Оплата | НейроЭксперт";
const DESCRIPTION =
  "Как оплатить работы НейроЭксперт: счёт самозанятого, платёжная ссылка, документы — оферта, счёт, акт.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pay" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/pay" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

// Страница читает переменную окружения В МОМЕНТ ЗАПРОСА (серверный компонент,
// force-dynamic), а не на сборке: платёжная ссылка меняется чаще, чем релиз,
// и запекать её в бандл значило бы пересобирать образ ради строки.
export const dynamic = "force-dynamic";

/**
 * Платёжная ссылка (СБП / «Мой налог» / банк) из окружения.
 * Принимается только https-адрес: ссылка ведёт клиента к переводу денег, и
 * подстановка http или произвольной схемы из env — это ровно тот случай,
 * когда «потом поправим» стоит чужих денег.
 */
function paymentLink(): string | null {
  const raw = (process.env.PAYMENT_LINK_URL ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const INN = "683306354810";
const FIO = "Хихол Дмитрий Николаевич";

export default function PayPage() {
  const link = paymentLink();

  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-3xl font-bold text-slate-950">Оплата работ</h1>
          <p className="mt-4 text-slate-600">
            Оплата идёт по счёту исполнителя. Состав работ и сумма фиксируются в
            счёте до начала работ — то, что не в счёте, не оплачивается.
          </p>

          {/* Состояние платёжной ссылки объявляется в разметке ЯВНО: без этого
              опечатка в PAYMENT_LINK_URL (http, лишний пробел, мусор) молча
              деградировала бы в путь «Запросить счёт», а оракул считал бы шаг
              оплаты рабочим — ссылки нет, и никто не узнает. */}
          <section
            data-payment
            data-payment-link-status={link ? "live" : "absent"}
            className="mt-10 rounded-xl border border-slate-200 bg-white p-6"
          >
            <h2 className="text-xl font-semibold text-slate-950">Счёт и способ оплаты</h2>

            <dl className="mt-6 space-y-5 text-sm leading-relaxed text-slate-700">
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">
                  Что оплачивается
                </dt>
                <dd data-payment-subject className="text-slate-950 text-base">
                  Работы по счёту: аудит видимости, запуск точек входа или
                  сопровождение — конкретный состав указан в вашем счёте.
                </dd>
              </div>

              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">Сумма</dt>
                <dd data-payment-amount className="text-slate-950 text-base">
                  По счёту
                </dd>
                <p className="mt-1 text-xs text-slate-600">
                  Действующие тарифы —{" "}
                  <a href="/pricing" className="text-blue-700 hover:underline">
                    на странице «Цены»
                  </a>
                  . Сумма в счёте совпадает с выбранным пакетом.
                </p>
              </div>

              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">
                  Способ оплаты
                </dt>
                <dd data-payment-method className="text-slate-950 text-base">
                  {link
                    ? "Онлайн по платёжной ссылке (СБП) либо переводом по реквизитам ниже."
                    : "Перевод по реквизитам исполнителя (СБП или банковский перевод) по выставленному счёту."}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">
                  Получатель
                </dt>
                <dd
                  data-payment-requisites
                  className="text-slate-950 text-base font-mono"
                >
                  {FIO}, самозанятый (НПД), ИНН {INN}
                </dd>
                <p className="mt-1 text-xs text-slate-600">
                  Чек «Мой налог» отправляем на тот контакт, который вы оставили —
                  почту или мессенджер, — после поступления оплаты.
                </p>
              </div>

              <div data-payment-docs>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">
                  Документы
                </dt>
                <dd className="text-base">
                  <a href="/terms" className="text-blue-700 hover:underline">
                    Публичная оферта
                  </a>
                  {" · "}
                  <a href="/requisites" className="text-blue-700 hover:underline">
                    Реквизиты исполнителя
                  </a>
                </dd>
              </div>
            </dl>

            <a
              data-payment-cta
              href={link ?? "/launch"}
              // Платёжному сервису незачем знать, с какой страницы пришёл
              // клиент: referrer гасится для внешней ссылки (аудит, PRIV-1).
              rel={link ? "noreferrer" : undefined}
              className="mt-8 inline-flex items-center rounded-lg bg-slate-950 px-5 py-3 text-white hover:bg-slate-800"
            >
              {link ? "Оплатить по ссылке" : "Запросить счёт"}
            </a>
          </section>

          <section className="mt-12 text-sm leading-relaxed text-slate-700">
            <h2 className="text-xl font-semibold text-slate-950">Как проходит оплата</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5">
              <li>Согласуем состав работ и сумму — письмом или в мессенджере.</li>
              <li>Присылаем счёт: получатель, ИНН, сумма, назначение платежа.</li>
              <li>
                Вы оплачиваете переводом или по платёжной ссылке. Чек «Мой налог»
                приходит после поступления денег.
              </li>
              <li>
                Начинаем работы. По завершении подписываем акт — шаблон совпадает
                с составом работ из счёта.
              </li>
            </ol>
            <p className="mt-4 text-xs text-slate-600">
              Возврат и порядок расторжения описаны в{" "}
              <a href="/terms" className="text-blue-700 hover:underline">
                публичной оферте
              </a>
              .
            </p>
          </section>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
