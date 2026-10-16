/**
 * Server-authoritative реестр платных пакетов (G-018).
 *
 * Клиент никогда не присылает цену: сумма платежа и состав берутся ТОЛЬКО отсюда.
 * Цены заморожены до gate AF-1-COMM (ADR-002/ADR-003) — менять значения здесь
 * без решения владельца нельзя; оракул стратегии сверяет их с ADR-003.
 */

export type PackageId = "audit_start";

export interface PackageDefinition {
  id: PackageId;
  title: string;
  amountRub: number;
  /** Вопросов реального спроса в платном отчёте (контракт Audit Start v1, §2). */
  questionCount: number;
  /** SLA (контракт §5): цель p95 и жёсткая граница, минуты после оплаты. */
  slaTargetMinutes: number;
  slaHardLimitMinutes: number;
}

export const PACKAGE_REGISTRY: Readonly<Record<PackageId, PackageDefinition>> = Object.freeze({
  audit_start: Object.freeze({
    id: "audit_start",
    title: "Аудит Старт",
    amountRub: 7900,
    questionCount: 10,
    slaTargetMinutes: 15,
    slaHardLimitMinutes: 60,
  }),
});

export function isPackageId(value: unknown): value is PackageId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PACKAGE_REGISTRY, value);
}

export function getPackage(id: unknown): PackageDefinition | null {
  return isPackageId(id) ? PACKAGE_REGISTRY[id] : null;
}
