import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { member_id } = await request.json();
  if (!member_id) {
    return NextResponse.json(
      { error: "member_id обязателен" },
      { status: 400 },
    );
  }

  const admin = getAdmin();

  // Verify user owns the team containing this member
  const { data: member } = await admin
    .from("team_members")
    .select("id, team_id, role")
    .eq("id", member_id)
    .single();

  if (!member) {
    return NextResponse.json(
      { error: "Участник не найден" },
      { status: 404 },
    );
  }

  if (member.role === "owner") {
    return NextResponse.json(
      { error: "Нельзя удалить владельца команды" },
      { status: 400 },
    );
  }

  const { data: team } = await admin
    .from("teams")
    .select("id")
    .eq("id", member.team_id)
    .eq("owner_id", user.id)
    .single();

  if (!team) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { error } = await admin
    .from("team_members")
    .delete()
    .eq("id", member_id);

  if (error) {
    console.error("[team/remove] Error:", error);
    return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
