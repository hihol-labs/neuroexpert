import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EXPERT_ORDER_UUID, expertOrdersAdmin } from "@/lib/expert-orders";

export const dynamic = "force-dynamic";

/**
 * GET /api/expert-orders/[id] - тема для страницы записи (R-06): текст вопроса и статус.
 * Только владелец; чужой и несуществующий заказ неразличимы (404).
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!EXPERT_ORDER_UUID.test(params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: order } = await expertOrdersAdmin()
    .from("orders")
    .select("id, status, questions(question_text)")
    .eq("id", params.id)
    .eq("expert_id", user.id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const question = order.questions as unknown as { question_text?: string } | null;
  return NextResponse.json(
    { id: order.id, status: order.status, question_text: question?.question_text ?? "" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
