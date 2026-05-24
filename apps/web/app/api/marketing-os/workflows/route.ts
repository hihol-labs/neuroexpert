import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  MARKETING_OS_AGENT_ROLES,
  MARKETING_OS_TOOLS,
  getMarketingOsTool,
} from "shared";

type JsonRecord = Record<string, unknown>;

const STATUSES = new Set([
  "draft",
  "queued",
  "running",
  "needs_review",
  "approved",
  "completed",
  "failed",
]);

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

function normalizeStatus(status: unknown): string {
  const value = String(status || "needs_review");
  return STATUSES.has(value) ? value : "needs_review";
}

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const workflowKey = params.get("workflow_key");
  const status = params.get("status");
  const limit = Math.min(parseInt(params.get("limit") || "30", 10), 100);
  const offset = parseInt(params.get("offset") || "0", 10);

  const admin = getAdmin();
  let query = admin
    .from("marketing_workflow_runs")
    .select("*", { count: "exact" })
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (workflowKey) query = query.eq("workflow_key", workflowKey);
  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;
  if (error) {
    console.error("[marketing-os/workflows] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load workflow runs" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: data ?? [],
    tools: MARKETING_OS_TOOLS,
    agent_roles: MARKETING_OS_AGENT_ROLES,
    pagination: {
      total: count ?? 0,
      limit,
      offset,
      has_more: offset + limit < (count ?? 0),
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: JsonRecord;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workflowKey = String(body.workflow_key || "").trim();
  if (!workflowKey) {
    return NextResponse.json(
      { error: "workflow_key is required" },
      { status: 400 },
    );
  }

  let tool;
  try {
    tool = getMarketingOsTool(workflowKey as never);
  } catch {
    return NextResponse.json(
      {
        error: "Unknown workflow_key",
        supported_workflows: MARKETING_OS_TOOLS.map((item) => item.key),
      },
      { status: 400 },
    );
  }

  const admin = getAdmin();
  const { data, error } = await admin
    .from("marketing_workflow_runs")
    .insert({
      owner_id: user.id,
      workflow_key: workflowKey,
      agent_role: body.agent_role || null,
      entity_type: body.entity_type || null,
      entity_id: body.entity_id || null,
      status: normalizeStatus(body.status),
      input: body.input || {},
      output: body.output || {},
      evidence: body.evidence || [],
      human_review_required:
        body.human_review_required ?? tool.humanReviewRequired,
      source: body.source || "neuroexpert",
      error: body.error || null,
      completed_at:
        normalizeStatus(body.status) === "completed"
          ? new Date().toISOString()
          : null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[marketing-os/workflows] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create workflow run" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data });
}

export async function PATCH(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: JsonRecord;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = String(body.id || "");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const status = normalizeStatus(body.status);
  const patch: JsonRecord = {
    status,
    updated_at: new Date().toISOString(),
  };

  if ("output" in body) patch.output = body.output || {};
  if ("evidence" in body) patch.evidence = body.evidence || [];
  if ("error" in body) patch.error = body.error || null;
  if (status === "completed") patch.completed_at = new Date().toISOString();

  const admin = getAdmin();
  const { data, error } = await admin
    .from("marketing_workflow_runs")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("*")
    .single();

  if (error) {
    console.error("[marketing-os/workflows] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update workflow run" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data });
}
