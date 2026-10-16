/**
 * R-09: единственный источник лимитов тарифа (E-AUTO-14/15). Таблица - SUBSCRIPTION_TIERS
 * (constants.ts); здесь только чистые проверки и один счётчик пакетов за месяц. Цены и состав
 * тарифов не меняются (заморозка 2026-03-19); неизвестный тариф считается бесплатным (fail-closed).
 */
import { SUBSCRIPTION_TIERS, type ContentFormat, type SubscriptionTier } from "../constants.js";

export const FREE_TIER_ID = "free";

/** Строка таблицы тарифов по идентификатору; только собственные ключи (constructor/toString - не тариф). */
export function findTier(tier: string | null | undefined): SubscriptionTier | undefined {
  return typeof tier === "string" && Object.hasOwn(SUBSCRIPTION_TIERS, tier) ? SUBSCRIPTION_TIERS[tier] : undefined;
}

/** Тариф по идентификатору; пусто / неизвестно -> free. */
export function resolveTier(tier: string | null | undefined): SubscriptionTier {
  return findTier(tier) ?? SUBSCRIPTION_TIERS[FREE_TIER_ID]!;
}

/**
 * Срок подписки после оплаты: календарный месяц от текущего срока, если он ещё не истёк (досрочное
 * продление не теряет остаток), иначе от момента оплаты; день месяца обрезается по длине месяца
 * (31 января -> 28/29 февраля, а не 3 марта).
 */
export function nextSubscriptionExpiry(now: Date, currentExpiresAt: string | Date | null | undefined): Date {
  const current = currentExpiresAt ? new Date(currentExpiresAt) : null;
  const base = current && !Number.isNaN(current.getTime()) && current.getTime() > now.getTime() ? current : now;
  const y = base.getUTCFullYear(), m = base.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(base.getUTCDate(), lastDay), base.getUTCHours(), base.getUTCMinutes(), base.getUTCSeconds(), base.getUTCMilliseconds()));
}

/** Начало календарного месяца по UTC (ISO): окно лимита «пакетов в месяц». */
export function monthStartUtc(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export interface LimitCheck { allowed: boolean; limit: number; used: number; remaining: number }

/** Лимит контент-пакетов в месяц: free - 3, платные - без лимита. */
export function checkPackageLimit(tier: string | null | undefined, currentMonthPackages: number): LimitCheck {
  const limit = resolveTier(tier).packagesPerMonth;
  const used = Math.max(0, Math.floor(currentMonthPackages));
  return { allowed: used < limit, limit, used, remaining: Number.isFinite(limit) ? Math.max(0, limit - used) : Infinity };
}

/** Форматы, которые генерируются по тарифу (free - Telegram-пост и SEO-статья). */
export function getAllowedFormats(tier: string | null | undefined): ContentFormat[] {
  return [...resolveTier(tier).formats];
}

export function isFormatAllowed(tier: string | null | undefined, format: ContentFormat): boolean {
  return resolveTier(tier).formats.includes(format);
}

export function getMaxNiches(tier: string | null | undefined): number {
  return resolveTier(tier).maxNiches;
}

/** Лимит ниш по тарифу (free - 1). */
export function checkNicheLimit(tier: string | null | undefined, currentNiches: number): LimitCheck {
  const limit = getMaxNiches(tier);
  const used = Math.max(0, Math.floor(currentNiches));
  return { allowed: used < limit, limit, used, remaining: Math.max(0, limit - used) };
}

export type SubscriptionAmountCheck =
  | { ok: true; tier: SubscriptionTier; expected: number }
  | { ok: false; reason: "unknown_tier" | "free_tier" | "currency" | "amount_mismatch"; expected: number | null };

export const SUBSCRIPTION_CURRENCY = "RUB";

/**
 * Webhook ЮKassa выдаёт тариф только если тариф платный и известный, валюта - рубли, а подтверждённая
 * кассой сумма равна цене тарифа точно (без округления копеек). Иначе платёж сохраняется, тариф не
 * меняется, причина в логе и алерте.
 */
export function checkSubscriptionAmount(tier: string | null | undefined, amountRub: number, currency: string = SUBSCRIPTION_CURRENCY): SubscriptionAmountCheck {
  const found = findTier(tier);
  if (!found) return { ok: false, reason: "unknown_tier", expected: null };
  if (found.price <= 0) return { ok: false, reason: "free_tier", expected: found.price };
  if (currency !== SUBSCRIPTION_CURRENCY) return { ok: false, reason: "currency", expected: found.price };
  if (!Number.isFinite(amountRub) || Math.abs(amountRub - found.price) > 1e-6) return { ok: false, reason: "amount_mismatch", expected: found.price };
  return { ok: true, tier: found, expected: found.price };
}

/** Текст отказа по лимиту пакетов (сайт и бот показывают один и тот же). */
export function packageLimitMessage(check: LimitCheck, billingUrl: string): string {
  return `Лимит бесплатного тарифа: ${check.limit} ${check.limit === 1 ? "пакет" : check.limit < 5 ? "пакета" : "пакетов"} контента в месяц (использовано ${check.used}). `
    + `Новые темы и записи откроются с 1-го числа следующего месяца или на платном тарифе: ${billingUrl}`;
}

/**
 * Минимальный контракт клиента Supabase для счётчика (service role; web/bot/worker передают свой).
 * Структурно только `from(table)`: точная типизация PostgREST-цепочки у типизированных клиентов
 * уходит в бесконечную инстанциацию (TS2589), а форма ответа count-запроса проверяется тестом.
 */
export interface PackageCountClient { from(table: string): unknown }
interface CountQuery {
  select(columns: string, options: { count: "exact"; head: true }): CountQuery;
  eq(column: string, value: string): CountQuery;
  gte(column: string, value: string): PromiseLike<{ count: number | null; error: { message: string } | null }>;
}

/** Таблица-леджер (миграция 035): строка на каждый созданный пакет, переживает удаление, пишет только триггер. */
export const PACKAGE_LEDGER_TABLE = "expert_package_ledger";

/**
 * Разрешение на новый пакет: считает записи леджера эксперта с начала месяца (UTC). Не content_packages:
 * владелец может удалять свои пакеты и менять их поля по RLS 002 - счётчик обнулялся бы.
 * Ошибка чтения - отказ (fail-closed): лимит нельзя обойти сбоем БД.
 */
export async function packageAllowance(db: PackageCountClient, tier: string | null | undefined, expertId: string, now: Date = new Date()): Promise<LimitCheck & { error?: string }> {
  const limit = resolveTier(tier).packagesPerMonth;
  if (!Number.isFinite(limit)) return { allowed: true, limit, used: 0, remaining: Infinity };
  const { count, error } = await (db.from(PACKAGE_LEDGER_TABLE) as CountQuery)
    .select("id", { count: "exact", head: true })
    .eq("expert_id", expertId)
    .gte("created_at", monthStartUtc(now));
  if (error) return { allowed: false, limit, used: 0, remaining: 0, error: error.message };
  return checkPackageLimit(tier, count ?? 0);
}
