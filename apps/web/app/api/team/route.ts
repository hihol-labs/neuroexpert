import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdmin();

  // Check if user owns a team
  const { data: team } = await admin
    .from("teams")
    .select("id, name, max_experts, subscription_tier")
    .eq("owner_id", user.id)
    .single();

  if (!team) {
    // Check if user is a member of any team
    const { data: membership } = await admin
      .from("team_members")
      .select("team_id, role, teams(id, name, max_experts, subscription_tier)")
      .eq("expert_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ team: null });
    }

    // Return team info with members (read-only for non-owners)
    const teamData = membership.teams as unknown as {
      id: string;
      name: string;
      max_experts: number;
      subscription_tier: string;
    };
    const members = await getTeamMembers(admin, teamData.id);

    return NextResponse.json({
      team: { ...teamData, members },
      role: membership.role,
    });
  }

  // Owner: return full team data with members
  const members = await getTeamMembers(admin, team.id);

  return NextResponse.json({ team: { ...team, members }, role: "owner" });
}

async function getTeamMembers(admin: ReturnType<typeof getAdmin>, teamId: string) {
  const { data: members } = await admin
    .from("team_members")
    .select(
      "id, expert_id, role, joined_at, profiles!team_members_expert_id_fkey(full_name, slug, qualification, trust_score, is_published, avg_rating, review_count)",
    )
    .eq("team_id", teamId)
    .order("joined_at");

  if (!members?.length) return [];

  // Get stats for each member
  const expertIds = members.map((m) => m.expert_id);

  const { data: articleCounts } = await admin
    .from("content_packages")
    .select("expert_id")
    .in("expert_id", expertIds)
    .eq("status", "published");

  const { data: leadCounts } = await admin
    .from("leads")
    .select("expert_id")
    .in("expert_id", expertIds);

  const articleMap: Record<string, number> = {};
  const leadMap: Record<string, number> = {};
  for (const a of articleCounts ?? []) {
    articleMap[a.expert_id] = (articleMap[a.expert_id] || 0) + 1;
  }
  for (const l of leadCounts ?? []) {
    leadMap[l.expert_id] = (leadMap[l.expert_id] || 0) + 1;
  }

  return members.map((m) => ({
    id: m.id,
    expert_id: m.expert_id,
    role: m.role,
    joined_at: m.joined_at,
    profile: m.profiles as unknown as {
      full_name: string;
      slug: string;
      qualification: string | null;
      trust_score: number;
      is_published: boolean;
      avg_rating: number;
      review_count: number;
    },
    stats: {
      articles: articleMap[m.expert_id] || 0,
      leads: leadMap[m.expert_id] || 0,
    },
  }));
}
