import { supabase } from "../supabase.js";
import { EXPERT_NOTIFY_KINDS, type ExpertNotifyFields, type ExpertNotifyKind, type NotifyExpert } from "shared";
import { createWorkerExpertNotifier } from "../services/expert-notify.js";

/**
 * R-08: job notify_expert {kind, ref_id, expert_id, needs_review?}. Ставят: validate-content
 * (черновик готов), web publish-service (опубликовано), web /api/leads (заявка), /api/bookings (запись).
 * Поля сообщения читаются из БД по ref_id (а не из payload) и сверяются с expert_id - чужая строка
 * не уходит эксперту. Неуспех обоих каналов - исключение: worker повторит job, дедуп снят ядром.
 */
let notifier: NotifyExpert | null = null;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadFields(kind: ExpertNotifyKind, refId: string, expertId: string, needsReview: boolean): Promise<ExpertNotifyFields | null> {
  if (kind === "draft_ready" || kind === "published") {
    const { data } = await supabase.from("content_packages").select("id, expert_id, title, published_url").eq("id", refId).maybeSingle();
    if (!data || data.expert_id !== expertId) return null;
    return kind === "draft_ready"
      ? { title: data.title, content_id: data.id, needs_review: needsReview }
      : { title: data.title, url: data.published_url };
  }
  if (kind === "lead") {
    const { data } = await supabase.from("leads").select("id, expert_id, client_name, client_contact, client_message").eq("id", refId).maybeSingle();
    if (!data || data.expert_id !== expertId) return null;
    return { lead_id: data.id, client_name: data.client_name, client_contact: data.client_contact, client_message: data.client_message };
  }
  const { data } = await supabase.from("bookings").select("id, expert_id, client_name, client_contact, client_message, booking_date, booking_time").eq("id", refId).maybeSingle();
  if (!data || data.expert_id !== expertId) return null;
  return { booking_id: data.id, client_name: data.client_name, client_contact: data.client_contact, client_message: data.client_message,
    date: String(data.booking_date ?? ""), time: String(data.booking_time ?? "").slice(0, 5) };
}

export async function handleNotifyExpert(payload: Record<string, unknown>): Promise<{ outcome: string }> {
  const kind = payload.kind as ExpertNotifyKind, refId = String(payload.ref_id ?? ""), expertId = String(payload.expert_id ?? "");
  if (!EXPERT_NOTIFY_KINDS.includes(kind) || !UUID.test(refId) || !UUID.test(expertId)) throw new Error("notify_expert: invalid payload");

  const { data: expert, error } = await supabase.from("profiles").select("id, email, telegram_id, full_name").eq("id", expertId).maybeSingle();
  if (error) throw new Error(`notify_expert: profile: ${error.message}`);
  if (!expert) { console.error(`[notify_expert] expert ${expertId} not found, skipped`); return { outcome: "skipped" }; }

  const fields = await loadFields(kind, refId, expertId, payload.needs_review === true);
  if (!fields) { console.error(`[notify_expert] ${kind}:${refId} not found or belongs to another expert, skipped`); return { outcome: "skipped" }; }

  notifier ??= createWorkerExpertNotifier({ admin: supabase });
  const result = await notifier(kind, refId, expert, fields);
  console.log(`[notify_expert] ${kind}:${refId} -> ${result.outcome} (telegram=${result.telegram}, email=${result.email})`);
  if (result.outcome === "failed") throw new Error(`notify_expert: no channel delivered (${kind}:${refId})`);
  return { outcome: result.outcome };
}
