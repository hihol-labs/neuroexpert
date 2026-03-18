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

  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "Email обязателен" }, { status: 400 });
  }

  const admin = getAdmin();

  // Verify user owns a team
  const { data: team } = await admin
    .from("teams")
    .select("id, max_experts")
    .eq("owner_id", user.id)
    .single();

  if (!team) {
    return NextResponse.json(
      { error: "У вас нет команды. Оформите тариф Business." },
      { status: 403 },
    );
  }

  // Check member count
  const { count } = await admin
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", team.id);

  if ((count ?? 0) >= team.max_experts) {
    return NextResponse.json(
      { error: `Достигнут лимит ${team.max_experts} экспертов` },
      { status: 400 },
    );
  }

  // Find expert by email
  const { data: expert } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (!expert) {
    return NextResponse.json(
      { error: "Эксперт с таким email не найден на платформе" },
      { status: 404 },
    );
  }

  // Check if already a member
  const { data: existing } = await admin
    .from("team_members")
    .select("id")
    .eq("team_id", team.id)
    .eq("expert_id", expert.id)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Эксперт уже в команде" },
      { status: 400 },
    );
  }

  // Add to team
  const { error } = await admin.from("team_members").insert({
    team_id: team.id,
    expert_id: expert.id,
    role: "member",
  });

  if (error) {
    console.error("[team/invite] Error:", error);
    return NextResponse.json(
      { error: "Ошибка добавления" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
