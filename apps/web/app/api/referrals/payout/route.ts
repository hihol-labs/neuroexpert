import { NextResponse } from "next/server";

// Stub endpoint — will be implemented when CPA is activated (Step 5.1)
export async function POST() {
  return NextResponse.json(
    { error: "Payout functionality is not yet implemented" },
    { status: 501 },
  );
}
