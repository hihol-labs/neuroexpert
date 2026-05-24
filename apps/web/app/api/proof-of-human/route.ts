import { NextRequest, NextResponse } from "next/server";
import {
  getAdmin,
  getUser,
  toStringArray,
  type JsonRecord,
} from "@/lib/demand-to-revenue-server";

const ASSET_TYPES = new Set([
  "identity",
  "diploma",
  "certificate",
  "case",
  "review",
  "voice",
  "video",
  "publication",
  "license",
]);

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdmin();
  const [{ data: profile }, { data: assets }] = await Promise.all([
    admin
      .from("profiles")
      .select("proof_of_human, machine_profile, trust_components, verification_status, practice_limitations, verified_at")
      .eq("id", user.id)
      .single(),
    admin
      .from("proof_of_human_assets")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    profile: profile ?? {},
    assets: assets ?? [],
    required_assets: [
      "identity",
      "diploma",
      "case",
      "voice",
      "review",
    ],
  });
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

  const assetType = String(body.asset_type || "").trim();
  const title = String(body.title || "").trim();

  if (!ASSET_TYPES.has(assetType)) {
    return NextResponse.json({ error: "Invalid asset_type" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const admin = getAdmin();
  const { data, error } = await admin
    .from("proof_of_human_assets")
    .insert({
      profile_id: user.id,
      asset_type: assetType,
      title,
      issuer: body.issuer || null,
      evidence_url: body.evidence_url || null,
      status: "needs_review",
      source: body.source || "manual",
      confidence: body.confidence || 0.7,
      limitations: toStringArray(body.limitations),
      expires_at: body.expires_at || null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[proof-of-human] create error:", error);
    return NextResponse.json({ error: "Failed to create proof asset" }, { status: 500 });
  }

  await Promise.all([
    admin.from("profiles").update({ verification_status: "needs_review" }).eq("id", user.id),
    admin.from("marketing_review_queue").insert({
      owner_id: user.id,
      entity_type: "proof_of_human_asset",
      entity_id: data.id,
      title: `Proof review: ${title}`,
      summary: `Проверить доказательство типа ${assetType}`,
      risk_level: assetType === "license" || assetType === "identity" ? "high" : "medium",
      status: "pending",
      ai_output: { asset: data },
      source: "proof-of-human",
    }),
  ]);

  return NextResponse.json({ ok: true, data });
}

export async function PATCH(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: JsonRecord;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const patch: JsonRecord = {
    updated_at: new Date().toISOString(),
  };
  for (const key of ["title", "issuer", "evidence_url", "expires_at", "rejection_reason"]) {
    if (key in body) patch[key] = body[key] || null;
  }
  if ("limitations" in body) patch.limitations = toStringArray(body.limitations);
  if ("status" in body) {
    patch.status = body.status === "archived" ? "archived" : "needs_review";
  }

  const admin = getAdmin();
  const { data, error } = await admin
    .from("proof_of_human_assets")
    .update(patch)
    .eq("id", id)
    .eq("profile_id", user.id)
    .select("*")
    .single();

  if (error) {
    console.error("[proof-of-human] update error:", error);
    return NextResponse.json({ error: "Failed to update proof asset" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
