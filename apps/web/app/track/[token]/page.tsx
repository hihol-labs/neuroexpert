import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export const metadata: Metadata = {
  title: "Статус заявки | НейроЭксперт",
  robots: "noindex, nofollow",
};

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "Новая", color: "bg-yellow-100 text-yellow-800" },
  notified: {
    label: "Эксперт уведомлён",
    color: "bg-blue-100 text-blue-800",
  },
  accepted: { label: "Принята", color: "bg-green-100 text-green-800" },
  rejected: { label: "Отклонена", color: "bg-red-100 text-red-800" },
  completed: { label: "Завершена", color: "bg-gray-100 text-gray-800" },
};

interface Props {
  params: { token: string };
}

export default async function TrackLeadPage({ params }: Props) {
  const supabase = getAdmin();

  const { data: lead } = await supabase
    .from("leads")
    .select(
      "id, client_name, status, created_at, expert_id, profiles!leads_expert_id_fkey(full_name, slug, qualification)",
    )
    .eq("tracking_token", params.token)
    .single();

  if (!lead) notFound();

  const expert = lead.profiles as unknown as {
    full_name: string;
    slug: string;
    qualification: string | null;
  } | null;

  const status = STATUS_LABELS[lead.status] || STATUS_LABELS.new;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Статус вашей заявки
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Заявка от{" "}
              {new Date(lead.created_at).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Status badge */}
          <div className="text-center">
            <span
              className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${status.color}`}
            >
              {status.label}
            </span>
          </div>

          {/* Status timeline */}
          <div className="space-y-3">
            {["new", "notified", "accepted", "completed"].map(
              (step, index) => {
                const stepInfo = STATUS_LABELS[step];
                const steps = [
                  "new",
                  "notified",
                  "accepted",
                  "completed",
                ];
                const currentIndex = steps.indexOf(lead.status);
                const isCompleted = index <= currentIndex;
                const isRejected =
                  lead.status === "rejected" && step === "accepted";

                return (
                  <div key={step} className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                        isRejected
                          ? "bg-red-100 text-red-600"
                          : isCompleted
                            ? "bg-green-100 text-green-600"
                            : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {isRejected ? "✗" : isCompleted ? "✓" : index + 1}
                    </div>
                    <span
                      className={`text-sm ${isCompleted ? "text-gray-900 font-medium" : "text-gray-400"}`}
                    >
                      {stepInfo.label}
                    </span>
                  </div>
                );
              },
            )}
          </div>

          {/* Expert info */}
          {expert && (
            <div className="border-t pt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Эксперт
              </p>
              <Link
                href={`/experts/${expert.slug}`}
                className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600">
                  {expert.full_name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {expert.full_name}
                  </p>
                  {expert.qualification && (
                    <p className="text-xs text-gray-500">
                      {expert.qualification}
                    </p>
                  )}
                </div>
              </Link>
            </div>
          )}

          {/* Info for accepted status */}
          {lead.status === "accepted" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              Эксперт принял вашу заявку! Ожидайте контакта.
            </div>
          )}

          {lead.status === "rejected" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              К сожалению, эксперт не может принять заявку в данный момент.
              Попробуйте обратиться к другому эксперту.
            </div>
          )}

          <div className="text-center pt-2">
            <Link
              href="/experts"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Посмотреть других экспертов
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Сохраните эту ссылку для отслеживания статуса
        </p>
      </div>
    </div>
  );
}
