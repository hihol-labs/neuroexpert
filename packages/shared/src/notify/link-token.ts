/**
 * R-08 (E-AUTO-2): подписанная ссылка привязки Telegram к профилю.
 * Токен = id профиля (16 байт) + одноразовый номер (8 байт) + срок в секундах (4 байта) +
 * 12 байт HMAC-SHA256 от первых 28 байт. base64url + префикс «l_» = 56 символов: укладывается в
 * параметр /start Telegram (до 64 символов, алфавит A-Za-z0-9_-). Номер хранится в профиле и
 * гасится при использовании - перехваченную ссылку нельзя применить второй раз.
 * Только для сервера (node:crypto): импорт через subpath «shared/notify/link-token».
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const LINK_TOKEN_TTL_MS = 15 * 60 * 1000;
export const LINK_TOKEN_PREFIX = "l_";
const MAC_BYTES = 12;
const MIN_SECRET_LENGTH = 32;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NONCE_RE = /^[0-9a-f]{16}$/;

export type LinkTokenResult =
  | { ok: true; profileId: string; nonce: string; expiresAt: number }
  | { ok: false; code: "no_secret" | "bad_format" | "bad_signature" | "expired" };

export function newLinkNonce(): string {
  return randomBytes(8).toString("hex");
}

/**
 * В profiles хранится не номер, а его SHA-256: опубликованные профили читаются anon-ключом
 * (RLS 002), и сам номер не должен быть виден даже там, где подпись без секрета всё равно не собрать.
 */
export function hashLinkNonce(nonce: string): string {
  return createHash("sha256").update(`telegram-link:${nonce}`).digest("hex");
}

function mac(secret: string, body: Buffer): Buffer {
  return createHmac("sha256", secret).update(body).digest().subarray(0, MAC_BYTES);
}

export function signTelegramLinkToken(profileId: string, nonce: string, nowMs: number, secret: string): string {
  if (!secret || secret.length < MIN_SECRET_LENGTH) throw new Error("TELEGRAM_LINK_SECRET is missing or too short");
  if (!UUID_RE.test(profileId) || !NONCE_RE.test(nonce)) throw new Error("invalid profile id or nonce");
  const exp = Buffer.alloc(4);
  exp.writeUInt32BE(Math.floor((nowMs + LINK_TOKEN_TTL_MS) / 1000));
  const body = Buffer.concat([Buffer.from(profileId.replace(/-/g, ""), "hex"), Buffer.from(nonce, "hex"), exp]);
  return LINK_TOKEN_PREFIX + Buffer.concat([body, mac(secret, body)]).toString("base64url");
}

export function verifyTelegramLinkToken(token: string, secret: string | undefined, nowMs: number): LinkTokenResult {
  if (!secret || secret.length < MIN_SECRET_LENGTH) return { ok: false, code: "no_secret" };
  if (typeof token !== "string" || !token.startsWith(LINK_TOKEN_PREFIX) || !/^[A-Za-z0-9_-]+$/.test(token.slice(LINK_TOKEN_PREFIX.length))) return { ok: false, code: "bad_format" };
  const encoded = token.slice(LINK_TOKEN_PREFIX.length);
  const raw = Buffer.from(encoded, "base64url");
  if (raw.length !== 28 + MAC_BYTES) return { ok: false, code: "bad_format" };
  // Каноничность: у последнего символа base64url есть «хвостовые» биты, декодер их игнорирует, и
  // одной подписи соответствовало бы несколько строк. Принимаем только каноническую запись.
  if (raw.toString("base64url") !== encoded) return { ok: false, code: "bad_format" };
  const body = raw.subarray(0, 28), given = raw.subarray(28);
  if (!timingSafeEqual(mac(secret, body), given)) return { ok: false, code: "bad_signature" };
  const expiresAt = body.readUInt32BE(24) * 1000;
  if (nowMs >= expiresAt) return { ok: false, code: "expired" };
  const hex = body.subarray(0, 16).toString("hex");
  const profileId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return { ok: true, profileId, nonce: body.subarray(16, 24).toString("hex"), expiresAt };
}
