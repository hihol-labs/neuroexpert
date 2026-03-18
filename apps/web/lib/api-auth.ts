import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

interface AuthResult {
  valid: boolean;
  error?: string;
  status: number;
  ownerId?: string;
  permissions?: string[];
}

// Rate limit per API key
const keyRateLimits = new Map<string, number[]>();

function checkKeyRateLimit(keyHash: string, maxPerHour: number): boolean {
  const now = Date.now();
  const window = 3600_000;
  const timestamps =
    keyRateLimits.get(keyHash)?.filter((t) => now - t < window) ?? [];
  if (timestamps.length >= maxPerHour) return false;
  timestamps.push(now);
  keyRateLimits.set(keyHash, timestamps);
  return true;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const key = `ne_${Buffer.from(bytes).toString("base64url")}`;
  const prefix = key.slice(0, 10);
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}

export async function validateApiKey(
  request: NextRequest,
): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization");
  const apiKeyParam = request.nextUrl.searchParams.get("api_key");

  const rawKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : apiKeyParam;

  if (!rawKey) {
    return {
      valid: false,
      error:
        "API key required. Pass as Authorization: Bearer <key> or ?api_key=<key>",
      status: 401,
    };
  }

  const keyHash = hashApiKey(rawKey);
  const admin = getAdmin();

  const { data: apiKey } = await admin
    .from("api_keys")
    .select("id, owner_id, permissions, rate_limit_per_hour, is_active")
    .eq("key_hash", keyHash)
    .single();

  if (!apiKey) {
    return { valid: false, error: "Invalid API key", status: 401 };
  }

  if (!apiKey.is_active) {
    return { valid: false, error: "API key is disabled", status: 403 };
  }

  // Rate limit check
  if (!checkKeyRateLimit(keyHash, apiKey.rate_limit_per_hour)) {
    return {
      valid: false,
      error: `Rate limit exceeded (${apiKey.rate_limit_per_hour}/hour)`,
      status: 429,
    };
  }

  // Update last_used_at (fire and forget)
  admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then(() => {});

  return {
    valid: true,
    status: 200,
    ownerId: apiKey.owner_id,
    permissions: apiKey.permissions,
  };
}
