import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Release identity endpoint (ADR-002, фаза A).
 * «Задеплоено» = SHA здесь совпадает с локальным HEAD — см.
 * scripts/verify-canonical-release.mjs --require-head.
 */
export async function GET() {
  return NextResponse.json(
    {
      sha: process.env.GIT_SHA ?? "unknown",
      buildTime: process.env.BUILD_TIME ?? "unknown",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
