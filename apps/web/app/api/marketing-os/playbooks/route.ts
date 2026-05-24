import { NextRequest, NextResponse } from "next/server";
import { getAdmin, getUser, type JsonRecord } from "@/lib/demand-to-revenue-server";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdmin();
  const { data } = await admin
    .from("marketing_playbooks")
    .select("*, marketing_playbook_versions(*)")
    .order("category")
    .order("key");

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: JsonRecord;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const key = String(body.key || "").trim();
  const title = String(body.title || "").trim();
  if (!key || !title) return NextResponse.json({ error: "key and title are required" }, { status: 400 });

  const admin = getAdmin();
  const { data: playbook, error } = await admin
    .from("marketing_playbooks")
    .upsert(
      {
        key,
        title,
        category: body.category || "local_sales",
        description: body.description || null,
        human_review_required: body.human_review_required ?? true,
        status: body.status || "active",
      },
      { onConflict: "key" },
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to save playbook" }, { status: 500 });

  if (body.version) {
    await admin.from("marketing_playbook_versions").upsert(
      {
        playbook_id: playbook.id,
        version: body.version,
        methodology: body.methodology || {},
        expected_output: body.expected_output || {},
        result_summary: body.result_summary || {},
        status: body.version_status || "draft",
        created_by: user.id,
      },
      { onConflict: "playbook_id,version" },
    );
  }

  return NextResponse.json({ ok: true, data: playbook });
}
