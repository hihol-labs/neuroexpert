/**
 * R-01 (ADR-004): письма клиенту Audit Start о провале замера и о возврате.
 * Шаблоны живут в git (не в SMTP-провайдере). Стиль: без "ё", короткое тире, прямые кавычки.
 * Клиент никогда не должен писать в поддержку, чтобы вернуть деньги: оба письма говорят,
 * что возврат запущен автоматически, и дают ссылку на страницу статуса.
 */
export interface PackageOrderMailInput {
  orderId: string;
  amountRub: number;
  statusUrl: string;
  nicheName?: string;
  city?: string;
}
export interface MailContent { subject: string; text: string; html: string }

const rub = (n: number) => `${n.toLocaleString("ru-RU")} руб.`;
const pair = (i: PackageOrderMailInput) => [i.nicheName, i.city].filter(Boolean).join(", ");
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const wrap = (title: string, paragraphs: string[], link: string) =>
  `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">` +
  `<h2 style="font-size:18px">${esc(title)}</h2>` +
  paragraphs.map((p) => `<p>${esc(p)}</p>`).join("") +
  `<p><a href="${esc(link)}">${esc(link)}</a></p>` +
  `<p style="color:#666;font-size:13px">НейроЭксперт - замер видимости в AI-ответах</p></div>`;

/** Замер не выполнен (status=failed при списанной оплате): возврат уже запущен автоматически. */
export function failedPaidEmail(i: PackageOrderMailInput): MailContent {
  const subject = `Аудит Старт: замер не выполнен, возврат ${rub(i.amountRub)} запущен автоматически`;
  const paragraphs = [
    `Мы не смогли выполнить замер по заказу "Аудит Старт"${pair(i) ? ` (${pair(i)})` : ""}: AI-платформы не ответили в отведенный срок или ответов оказалось меньше порога выдачи отчета.`,
    `Возврат ${rub(i.amountRub)} на карту оплаты запущен автоматически - писать в поддержку не нужно. Отдельным письмом сообщим, когда касса подтвердит возврат; срок зачисления зависит от вашего банка (обычно 1-5 рабочих дней).`,
    `Заказ можно оформить заново в любой момент. Статус этого заказа:`,
  ];
  return { subject, text: [subject, "", ...paragraphs, i.statusUrl].join("\n"), html: wrap(subject, paragraphs, i.statusUrl) };
}

/** Касса подтвердила возврат (status=refunded). */
export function refundedEmail(i: PackageOrderMailInput): MailContent {
  const subject = `Аудит Старт: возврат ${rub(i.amountRub)} выполнен`;
  const paragraphs = [
    `Касса подтвердила возврат ${rub(i.amountRub)} по заказу "Аудит Старт"${pair(i) ? ` (${pair(i)})` : ""}. Возврат был запущен автоматически после того, как замер не выполнился.`,
    `Деньги вернутся на карту, с которой была оплата; срок зачисления зависит от вашего банка (обычно 1-5 рабочих дней).`,
    `Если захотите повторить замер позже - заказ оформляется заново с той же страницы. Статус этого заказа:`,
  ];
  return { subject, text: [subject, "", ...paragraphs, i.statusUrl].join("\n"), html: wrap(subject, paragraphs, i.statusUrl) };
}
