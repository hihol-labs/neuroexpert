import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/api-auth";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// GET: list user's API keys
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdmin();
  const { data: keys } = await admin
    .from("api_keys")
    .select(
      "id, name, key_prefix, rate_limit_per_hour, is_active, last_used_at, created_at",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: keys ?? [] });
}

// POST: create new API key
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await request.json();
  if (!name) {
    return NextResponse.json(
      { error: "Название обязательно" },
      { status: 400 },
    );
  }

  const admin = getAdmin();

  // Check limit: max 5 keys per user
  const { count } = await admin
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if ((count ?? 0) >= 5) {
    return NextResponse.json(
      { error: "Максимум 5 API-ключей" },
      { status: 400 },
    );
  }

  const { key, prefix, hash } = generateApiKey();

  const { error } = await admin.from("api_keys").insert({
    owner_id: user.id,
    key_hash: hash,
    key_prefix: prefix,
    name: name.slice(0, 100),
    permissions: ["read"],
    rate_limit_per_hour: 100,
  });

  if (error) {
    console.error("[api-keys] Create error:", error);
    return NextResponse.json({ error: "Ошибка создания" }, { status: 500 });
  }

  // Return the actual key only once
  return NextResponse.json({ ok: true, key, prefix });
}

// PATCH: toggle active status
export async function PATCH(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, is_active } = await request.json();
  const admin = getAdmin();

  const { error } = await admin
    .from("api_keys")
    .update({ is_active })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE: remove API key
export async function DELETE(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();
  const admin = getAdmin();

  const { error } = await admin
    .from("api_keys")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
