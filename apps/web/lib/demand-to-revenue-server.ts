import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type JsonRecord = Record<string, unknown>;

export function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function getUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export async function getAccessibleBusinessIds(userId: string): Promise<string[]> {
  const admin = getAdmin();
  const [{ data: owned }, { data: memberships }] = await Promise.all([
    admin.from("business_accounts").select("id").eq("owner_id", userId),
    admin.from("business_members").select("business_id").eq("user_id", userId),
  ]);

  return Array.from(
    new Set([
      ...((owned ?? []).map((item) => item.id) as string[]),
      ...((memberships ?? []).map((item) => item.business_id) as string[]),
    ]),
  );
}

export async function assertBusinessAccess(businessId: string, userId: string) {
  const admin = getAdmin();
  const { data: account } = await admin
    .from("business_accounts")
    .select("*")
    .eq("id", businessId)
    .single();

  if (!account) return null;
  if (account.owner_id === userId) return account as JsonRecord;

  const { data: membership } = await admin
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .single();

  return membership ? (account as JsonRecord) : null;
}

export async function enqueueJob(type: string, payload: JsonRecord, priority = 5) {
  const admin = getAdmin();
  return admin
    .from("jobs")
    .insert({
      type,
      payload,
      status: "pending",
      priority,
      scheduled_at: new Date().toISOString(),
    })
    .select("id")
    .single();
}
