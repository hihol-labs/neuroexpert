import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const EVENTS = new Set(["view", "cta_view", "cta_click", "lead"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const contentId = body.content_id as string | undefined;
    const eventType = body.event_type as string | undefined;

    if (!contentId || !eventType || !EVENTS.has(eventType)) {
      return NextResponse.json(
        { error: "content_id and valid event_type are required" },
        { status: 400 },
      );
    }

    const admin = getAdmin();
    const { error } = await admin.rpc("increment_page_metric", {
      p_content_id: contentId,
      p_event_type: eventType,
    });

    if (error) {
      console.error("[page-events] RPC error:", error);
      return NextResponse.json(
        { error: "Failed to record page event" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[page-events] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
