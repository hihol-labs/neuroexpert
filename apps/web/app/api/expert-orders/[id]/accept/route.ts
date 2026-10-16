import type { NextRequest } from "next/server";
import { handleExpertOrderSelection } from "@/lib/expert-orders";

export const dynamic = "force-dynamic";

/** POST /api/expert-orders/[id]/accept - эксперт берёт тему в работу (R-06, только владелец, только pending). */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return handleExpertOrderSelection(request, params.id, "accept");
}
