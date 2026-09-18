/**
 * R-05b «Деньги в отчёте»: оценка потерь в клиентах и рублях из неизменяемого снимка замера и цифр,
 * которые клиент ввёл сам. Граница честности (SELF_SERVE_PLAN п.148): частотность и факт «клиента
 * называют» измеряем мы, конверсия и чек - только цифры клиента. Нет цифр клиента или нечем опознать
 * клиента в ответах - блока нет (null), подставных значений не бывает.
 */
import type { ReportSnapshot } from "./index.js";

export type MoneySource = "wordstat" | "measured" | "client";
export interface MoneyMultiplier {
  key: "volume" | "unnamed" | "conversion" | "avg_check";
  label: string; display: string; source: MoneySource; source_label: string;
}
export interface MoneyBlock {
  questions_measured: number; questions_unnamed: number;
  questions_without_volume: number; questions_unanswered: number;
  volume_measured: number; volume_unnamed: number;
  conversion_pct: number; avg_check_rub: number;
  lost_clients: number; lost_rub: number;
  identified_by: string[]; multipliers: MoneyMultiplier[];
}
export interface MoneyDetails { website?: unknown; brand?: unknown; avg_check?: unknown; conversion?: unknown }

export const AVG_CHECK_MAX = 100_000_000;
const ru = (n: number) => n.toLocaleString("ru-RU");

/** Строка или число -> число; не больше двух знаков после запятой, без экспонент и знаков. */
function parseNumber(raw: unknown): number | null {
  if (typeof raw === "number" && !Number.isFinite(raw)) return null;
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const cleaned = String(raw).replace(/[\s ₽%]/g, "").replace(",", ".");
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
/** Средний чек: целые рубли, 1…100 000 000. */
export function parseAvgCheck(raw: unknown): number | null {
  const n = parseNumber(raw);
  return n !== null && Number.isInteger(n) && n >= 1 && n <= AVG_CHECK_MAX ? n : null;
}
/** Конверсия в процентах: 0 < x <= 100, не больше двух знаков после запятой. */
export function parseConversion(raw: unknown): number | null {
  const n = parseNumber(raw);
  return n !== null && n > 0 && n <= 100 ? n : null;
}
/** Домен клиента из поля «Сайт» - та же нормализация, что у продюсера пометок в /api/audit. */
export function clientHost(website: unknown): string | null {
  if (typeof website !== "string" || !website.trim()) return null;
  const w = website.trim();
  try {
    const host = new URL(w.includes("://") ? w : `https://${w}`).hostname.replace(/^www\./, "").toLowerCase();
    return host.includes(".") ? host : null;
  } catch { return null; }
}
export function clientBrand(brand: unknown): string | null {
  if (typeof brand !== "string") return null;
  const b = brand.trim().toLowerCase().replace(/\s+/g, " ");
  // Минимум 3 символа - как у конкурентов в продюсере пометок: короче нельзя надёжно искать в тексте.
  return b.length >= 3 && b.length <= 100 ? b : null;
}
const WORD_CHAR = /[\p{L}\p{N}]/u;
/**
 * Вхождение токена целым словом: соседние символы не буква и не цифра (для домена слева допустима
 * точка поддомена, справа недопустим дефис). Простая подстрока дала бы ложное «называют»
 * («лор» в «хлорка», example.com в notexample.com) и занизила бы оценку потерь.
 */
export function mentionsToken(text: string, token: string): boolean {
  for (let i = text.indexOf(token); i >= 0; i = text.indexOf(token, i + 1)) {
    const before = i > 0 ? text[i - 1] : "", after = text[i + token.length] ?? "";
    const next = text[i + token.length + 1] ?? "";
    const glued = (c: string) => c !== "" && (WORD_CHAR.test(c) || c === "-");
    const longerDomain = after === "." && next !== "" && WORD_CHAR.test(next); // example.com.ru - другой домен
    if (!glued(before) && !glued(after) && !longerDomain) return true;
  }
  return false;
}

export function computeMoneyBlock(report: ReportSnapshot, details: MoneyDetails | null | undefined): MoneyBlock | null {
  if (!details || typeof details !== "object") return null;
  const avgCheck = parseAvgCheck(details.avg_check), conversion = parseConversion(details.conversion);
  if (avgCheck === null || conversion === null) return null;
  const host = clientHost(details.website), brand = clientBrand(details.brand);
  const tokens = [...new Set([host, brand].filter((t): t is string => t !== null))];
  if (tokens.length === 0) return null;

  const collectedDates: string[] = [];
  let measured = 0, unnamed = 0, withoutVolume = 0, unanswered = 0, volumeMeasured = 0, volumeUnnamed = 0;
  for (const gap of report.gaps) {
    const answers = gap.platforms.filter((p) => p.status === "answered");
    if (answers.length === 0) { unanswered++; continue; } // не измерено - в долю не входит
    if (gap.monthly_volume === null) { withoutVolume++; continue; } // частотность неизвестна - в сумму не входит
    measured++;
    volumeMeasured += gap.monthly_volume;
    collectedDates.push(gap.collected_at.slice(0, 10));
    const named = answers.some((p) => { const text = p.ai_response.toLowerCase().replace(/\s+/g, " "); return tokens.some((t) => mentionsToken(text, t)); });
    if (!named) { unnamed++; volumeUnnamed += gap.monthly_volume; }
  }
  if (measured === 0 || volumeMeasured <= 0) return null;

  const lostClientsRaw = volumeUnnamed * conversion / 100;
  const lostRub = Math.round(lostClientsRaw * avgCheck);
  if (!Number.isFinite(lostRub)) return null;
  // Дата частотности - дата сбора Wordstat (collected_at), а не дата замера ответов (ran_at).
  collectedDates.sort();
  const first = collectedDates[0], last = collectedDates[collectedDates.length - 1];
  const collected = first === last ? `сбор ${first}` : `сбор с ${first} по ${last}`;
  const ranAt = report.ran_at.slice(0, 10);
  return {
    questions_measured: measured, questions_unnamed: unnamed,
    questions_without_volume: withoutVolume, questions_unanswered: unanswered,
    volume_measured: volumeMeasured, volume_unnamed: volumeUnnamed,
    conversion_pct: conversion, avg_check_rub: avgCheck,
    lost_clients: Math.round(lostClientsRaw * 10) / 10, lost_rub: lostRub,
    identified_by: tokens,
    multipliers: [
      { key: "volume", label: "Спрос по вопросам, где вас не называют", display: `${ru(volumeUnnamed)} запросов/мес.`, source: "wordstat", source_label: `Wordstat, ${collected}` },
      { key: "unnamed", label: "Вопросы, где вас не называют", display: `${unnamed} из ${measured}`, source: "measured", source_label: `наш замер ответов платформ ${ranAt}: ищем целым словом «${tokens.join("», «")}»` },
      { key: "conversion", label: "Доля спрашивающих, которые становятся клиентами", display: `${ru(conversion)}%`, source: "client", source_label: "ваша оценка" },
      { key: "avg_check", label: "Средний чек", display: `${ru(avgCheck)} ₽`, source: "client", source_label: "ваша оценка" },
    ],
  };
}
