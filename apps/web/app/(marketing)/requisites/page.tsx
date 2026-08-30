import type { Metadata } from "next";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";

const TITLE = "Реквизиты | НейроЭксперт";
const DESCRIPTION =
  "Официальные реквизиты исполнителя услуг НейроЭксперт: ФИО самозанятого, ИНН, контактные данные.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/requisites" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/requisites" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function RequisitesPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-3xl font-bold text-slate-950">Реквизиты</h1>
          <p className="mt-4 text-slate-600">
            Исполнитель услуг платформы НейроЭксперт
          </p>

          <div className="mt-12 space-y-8 text-slate-700 text-sm leading-relaxed">
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div>
                <span className="text-slate-500 block text-xs uppercase tracking-wide">ФИО</span>
                <span className="text-slate-950 text-base">Хихол Дмитрий Николаевич</span>
              </div>

              <div>
                <span className="text-slate-500 block text-xs uppercase tracking-wide">Правовой статус</span>
                <span className="text-slate-950 text-base">
                  Самозанятый — плательщик налога на профессиональный доход
                </span>
                <p className="mt-1 text-xs text-slate-600">
                  В соответствии с Федеральным законом № 422-ФЗ от 27 ноября 2018 г.
                </p>
              </div>

              <div>
                <span className="text-slate-500 block text-xs uppercase tracking-wide">ИНН</span>
                <span className="text-slate-950 text-base font-mono">683306354810</span>
              </div>

              <div>
                <span className="text-slate-500 block text-xs uppercase tracking-wide">Город</span>
                <span className="text-slate-950 text-base">Тамбов, Россия</span>
              </div>

              <div>
                <span className="text-slate-500 block text-xs uppercase tracking-wide">Электронная почта</span>
                <a
                  href="mailto:info@neuroexpertise.ru"
                  className="text-blue-700 hover:underline text-base"
                >
                  info@neuroexpertise.ru
                </a>
                <span className="text-slate-500 ml-2 text-xs">— общие вопросы и возвраты</span>
                <br />
                <a
                  href="mailto:hello@neuroexpertise.ru"
                  className="text-blue-700 hover:underline text-base"
                >
                  hello@neuroexpertise.ru
                </a>
                <span className="text-slate-500 ml-2 text-xs">— техподдержка</span>
              </div>

              <div>
                <span className="text-slate-500 block text-xs uppercase tracking-wide">Телефон</span>
                <a
                  href="tel:+79051238877"
                  className="text-slate-950 hover:text-blue-700 text-base font-mono"
                >
                  +7 905 123-88-77
                </a>
              </div>

              <div>
                <span className="text-slate-500 block text-xs uppercase tracking-wide">Сайт</span>
                <a
                  href="https://neuroexpertise.ru"
                  className="text-blue-700 hover:underline text-base"
                >
                  https://neuroexpertise.ru
                </a>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-950 mb-3">Платежи</h2>
              <p className="mb-3">
                Основной способ оплаты работ — счёт исполнителя:{" "}
                <a href="/pay" className="text-blue-700 hover:underline">
                  порядок оплаты и документы
                </a>
                . Чек «Мой налог» направляется после поступления оплаты.
              </p>
              <p>
                Онлайн-оплата картой на сайте, где она доступна, осуществляется
                через платёжный сервис
                ЮKassa (ООО НКО «ЮMoney», лицензия ЦБ РФ № 3510-К).
                Возможные способы оплаты: банковская карта Visa / Mastercard / МИР,
                СБП, ЮMoney. Все платежи проходят через защищённое соединение;
                реквизиты карты не передаются и не сохраняются на серверах НейроЭксперт.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-950 mb-3">Правовые документы</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <a href="/terms" className="text-blue-700 hover:underline">
                    Публичная оферта (Условия использования)
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-blue-700 hover:underline">
                    Политика конфиденциальности
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
