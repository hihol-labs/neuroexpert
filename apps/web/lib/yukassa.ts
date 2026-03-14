// ЮKassa Payment API client

const SHOP_ID = process.env.YUKASSA_SHOP_ID || "";
const SECRET_KEY = process.env.YUKASSA_SECRET_KEY || "";
const API_URL = "https://api.yookassa.ru/v3";

function authHeader(): string {
  return "Basic " + Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString("base64");
}

function idempotencyKey(): string {
  return crypto.randomUUID();
}

export interface CreatePaymentParams {
  amount: number;
  currency?: string;
  description: string;
  returnUrl: string;
  metadata?: Record<string, string>;
  savePaymentMethod?: boolean;
  paymentMethodId?: string;
}

export interface YukassaPayment {
  id: string;
  status: string;
  amount: { value: string; currency: string };
  confirmation?: { type: string; confirmation_url: string };
  payment_method?: { id: string; saved: boolean };
  metadata?: Record<string, string>;
}

export async function createPayment(params: CreatePaymentParams): Promise<YukassaPayment> {
  const body: Record<string, unknown> = {
    amount: { value: params.amount.toFixed(2), currency: params.currency || "RUB" },
    description: params.description,
    confirmation: { type: "redirect", return_url: params.returnUrl },
    capture: true,
    metadata: params.metadata || {},
  };

  if (params.savePaymentMethod) {
    body.save_payment_method = true;
  }

  if (params.paymentMethodId) {
    body.payment_method_id = params.paymentMethodId;
    delete body.confirmation;
  }

  const res = await fetch(`${API_URL}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      "Idempotence-Key": idempotencyKey(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YuKassa API error ${res.status}: ${err}`);
  }

  return res.json();
}

export async function getPayment(paymentId: string): Promise<YukassaPayment> {
  const res = await fetch(`${API_URL}/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
  });

  if (!res.ok) throw new Error(`YuKassa get payment error: ${res.status}`);
  return res.json();
}
