// Чтение платежа/возврата из API ЮKassa для сверки webhook-событий (SEC-1).
// Решение о смене статуса заказа принимается по ответу API, не по телу уведомления
// (правила сравнения — packages/shared/src/orders/reconcile.ts).
import { kassaShopsFromEnv, type KassaPayment, type KassaRefund, type KassaShop } from "shared";

const KASSA_API = "https://api.yookassa.ru/v3";
const KASSA_TIMEOUT_MS = 15_000;

/** API кассы недоступно или отвечает ошибкой: webhook отвечает 503, касса повторит. */
export class KassaUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KassaUnavailableError";
  }
}

export function kassaShops(): KassaShop[] {
  return kassaShopsFromEnv(process.env);
}

async function kassaGet<T>(shop: KassaShop, path: string): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${KASSA_API}/${path}`, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(KASSA_TIMEOUT_MS),
      headers: { Authorization: `Basic ${Buffer.from(`${shop.id}:${shop.key}`).toString("base64")}` },
    });
  } catch (err) {
    throw new KassaUnavailableError(`kassa transport: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new KassaUnavailableError(`kassa HTTP ${res.status}`);
  return (await res.json()) as T;
}

export function fetchKassaPayment(shop: KassaShop, paymentId: string): Promise<KassaPayment | null> {
  return kassaGet<KassaPayment>(shop, `payments/${encodeURIComponent(paymentId)}`);
}

export function fetchKassaRefund(shop: KassaShop, refundId: string): Promise<KassaRefund | null> {
  return kassaGet<KassaRefund>(shop, `refunds/${encodeURIComponent(refundId)}`);
}
