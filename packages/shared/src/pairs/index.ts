/**
 * On-demand пара «вертикаль × город» (G-018b, спецификация локальных вертикалей v1).
 *
 * Чистые функции без БД и сети: идентификаторы пары, подстановка шаблонов,
 * pre-flight по паре («данные раньше денег», контракт Audit Start v1 §6 + §2
 * спецификации) и решение worker'а в режиме on_demand. Все константы —
 * решения владельца 2026-09-04 (.itd/DECISIONS.md):
 *   (б) порог открытия оплаты для пары = 10 (questionCount пакета);
 *   (д) id пары = UUID с первым hex «b» и остатком из md5("pair:<slug>");
 *   (а) on_demand-сбор не ставит find_gaps — хвост expand_query исключён.
 */

import { createHash } from "node:crypto";
import { slugifyLatin } from "../utils/slug.js";
import { PACKAGE_REGISTRY } from "../orders/packages.js";

export const LOCAL_VERTICAL_IDS = ["dental", "clinic", "autoservice"] as const;
export type LocalVerticalId = (typeof LOCAL_VERTICAL_IDS)[number];

export const CITY_PLACEHOLDER = "{город}";
export const PAIR_ID_PREFIX = "b";
export const CITY_MIN_LENGTH = 2;
export const CITY_MAX_LENGTH = 80;

/** Порог наполнения пары для открытия оплаты = состав платного отчёта (решение (б)). */
export const PAIR_MIN_QUESTIONS = 10;
// Инвариант: порог равен questionCount пакета; расхождение — ошибка конфигурации.
if (PAIR_MIN_QUESTIONS !== PACKAGE_REGISTRY.audit_start.questionCount) {
  throw new Error("PAIR_MIN_QUESTIONS обязан равняться questionCount пакета audit_start");
}

export const PAIR_DEMAND_STATUSES = ["queued", "running", "filled", "empty"] as const;
export type PairDemandStatus = (typeof PAIR_DEMAND_STATUSES)[number];

export function isLocalVerticalId(value: unknown): value is LocalVerticalId {
  return typeof value === "string" && (LOCAL_VERTICAL_IDS as readonly string[]).includes(value);
}

export function isPairDemandStatus(value: unknown): value is PairDemandStatus {
  return typeof value === "string" && (PAIR_DEMAND_STATUSES as readonly string[]).includes(value);
}

const CITY_ALLOWED = /^[a-zа-яё0-9][a-zа-яё0-9\s-]*$/i;

/**
 * Город: обрезка, схлопывание пробелов, заглавная первая буква каждого слова
 * («нижний  новгород » → «Нижний Новгород»). Возвращает null, если ввод не
 * похож на город (длина вне 2..80, посторонние символы).
 */
export function normalizeCity(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const collapsed = raw.trim().replace(/\s+/g, " ").replace(/\s*-\s*/g, "-");
  if (collapsed.length < CITY_MIN_LENGTH || collapsed.length > CITY_MAX_LENGTH) return null;
  if (!CITY_ALLOWED.test(collapsed)) return null;
  return collapsed
    .split(" ")
    .map((word) => word.split("-").map(capitalize).join("-"))
    .join(" ");
}

function capitalize(word: string): string {
  return word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word;
}

/** slug пары: `<vertical>-<city-slug>` (транслит как в миграции 019 / slugifyLatin). */
export function buildPairSlug(vertical: LocalVerticalId, city: string): string | null {
  const normalized = normalizeCity(city);
  if (!normalized) return null;
  const citySlug = slugifyLatin(normalized, 60);
  if (!citySlug) return null;
  return `${vertical}-${citySlug}`;
}

/**
 * Детерминированный id пары (решение (д)): первый hex «b» отличает пары от
 * экспертных ниш «a0000000-…»; остальные 31 hex — md5("pair:<slug>"). Одна и та
 * же пара в любом окружении получает один id; разные написания города, дающие
 * один slug, сходятся в одну пару.
 */
export function buildPairId(slug: string): string {
  const h = createHash("md5").update(`pair:${slug}`).digest("hex");
  return `${PAIR_ID_PREFIX}${h.slice(1, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export function isPairId(value: unknown): boolean {
  return typeof value === "string" && /^b[0-9a-f]{7}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
}

/** Имя строки niches (UNIQUE): «Стоматология · Тюмень». */
export function buildPairName(verticalName: string, city: string): string {
  return `${verticalName.trim()} · ${city.trim()}`;
}

/**
 * Подстановка города в 8 шаблонов вертикали (§4: шаблоны — данные). Бросает,
 * если шаблон не содержит плейсхолдер — такие данные не должны дойти до сбора.
 */
export function expandSeedTemplates(templates: readonly string[], city: string): string[] {
  const normalized = normalizeCity(city);
  if (!normalized) throw new Error("expandSeedTemplates: некорректный город");
  return templates.map((template) => {
    if (!template.includes(CITY_PLACEHOLDER)) {
      throw new Error(`expandSeedTemplates: шаблон без ${CITY_PLACEHOLDER}: «${template}»`);
    }
    return template.split(CITY_PLACEHOLDER).join(normalized).replace(/\s+/g, " ").trim();
  });
}

export type PairPreflightDecision =
  | { status: "ready" }
  | { status: "collecting"; enqueue: boolean; message: string }
  | { status: "empty"; enqueue: false; message: string };

export interface PairPreflightSignals {
  /** Активных questions по паре (после возможного сбора). */
  questionCount: number;
  /** niches.demand_status пары; null — сбор ещё не ставился. */
  demandStatus: PairDemandStatus | null;
}

/**
 * Pre-flight по паре (§2 спецификации): оплата открывается только при
 * наполнении ≥ PAIR_MIN_QUESTIONS. Иначе — «готовим замер» и постановка
 * сбора ровно один раз (enqueue только когда сбор ещё не ставился); после
 * честного «empty» повторная постановка не делается.
 */
export function decidePairPreflight(signals: PairPreflightSignals): PairPreflightDecision {
  if (signals.questionCount >= PAIR_MIN_QUESTIONS) return { status: "ready" };
  if (signals.demandStatus === "empty") {
    return {
      status: "empty",
      enqueue: false,
      message: "По этому городу в источниках спроса не нашлось достаточно вопросов. Замер не продаём — оплата не открыта.",
    };
  }
  return {
    status: "collecting",
    enqueue: signals.demandStatus === null,
    message: "Готовим замер по вашему городу — оставьте email, пришлём письмо, когда данные будут собраны. Оплата пока не открыта.",
  };
}

export type CollectDemandMode = "cron" | "on_demand";

export interface OnDemandOutcome {
  /** Новый niches.demand_status (null в cron-режиме — колонка пар не трогается). */
  demandStatus: PairDemandStatus | null;
  /** Слать письмо ожидающим (только on_demand и только при наполнении). */
  notify: boolean;
  /** Ставить find_gaps (только cron-режим; on_demand не растит хвост expand_query — решение (а)). */
  enqueueFindGaps: boolean;
}

/** Решение worker'а после upsert вопросов. questionCount — итого активных по нише. */
export function decideOnDemandOutcome(input: { mode: CollectDemandMode; questionCount: number }): OnDemandOutcome {
  if (input.mode !== "on_demand") return { demandStatus: null, notify: false, enqueueFindGaps: true };
  const filled = input.questionCount >= PAIR_MIN_QUESTIONS;
  return { demandStatus: filled ? "filled" : "empty", notify: filled, enqueueFindGaps: false };
}

/** Путь возврата по письму «данные готовы»: форма с prefill вертикали и города. */
export function buildPairReturnPath(vertical: LocalVerticalId, city: string): string {
  const params = new URLSearchParams({ vertical, city });
  return `/order/audit-start?${params.toString()}`;
}
