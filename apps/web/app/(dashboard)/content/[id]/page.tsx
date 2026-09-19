"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
// Subpath: клиентский компонент не тянет серверные зависимости корневого входа shared.
import { faqProblems } from "shared/content/publish";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

const TABS = [
  { key: "telegram", label: "Telegram" },
  { key: "seo", label: "SEO-статья" },
  { key: "cards", label: "Карточки" },
  { key: "reels", label: "Reels" },
  { key: "faq", label: "FAQ" },
] as const;

type TabKey = (typeof TABS)[number]["key"];
// k - стабильный ключ строки формы (только на клиенте, в БД не сохраняется).
type FaqPair = { question: string; answer: string; k?: number };

// R-07 (E-AUTO-17): отказы /api/publish приходят кодом - показываем по-русски.
const PUBLISH_ERRORS: Record<string, string> = {
  not_found: "Материал не найден.",
  already_published: "Материал уже опубликован.",
  bad_status: "Материал ещё не готов к публикации (идёт генерация или он отклонён).",
  conflict: "Материал уже опубликован или изменён — обновите страницу.",
  no_slug: "У материала нет адреса страницы — напишите в поддержку.",
  faq_required: "Перед публикацией дополните FAQ (вкладка «FAQ») и сохраните.",
  error: "Не удалось опубликовать, попробуйте ещё раз.",
};

function toFaqPairs(value: unknown): FaqPair[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, k) => {
    const pair = item && typeof item === "object" ? (item as { question?: unknown; answer?: unknown }) : {};
    return {
      question: typeof pair.question === "string" ? pair.question : "",
      answer: typeof pair.answer === "string" ? pair.answer : "",
      k,
    };
  });
}

export default function ContentDetailPage({ params }: { params: { id: string } }) {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  );
  const [pkg, setPkg] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState<TabKey>("seo");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // Editable fields
  const [telegramPost, setTelegramPost] = useState("");
  const [seoArticle, setSeoArticle] = useState("");
  const [cardsJson, setCardsJson] = useState("");
  const [reelsScript, setReelsScript] = useState("");
  // FAQ - список пар «вопрос - ответ» (раньше сырой JSON с молчаливым откатом при ошибке разбора).
  const [faq, setFaq] = useState<FaqPair[]>([]);
  // Публикуется то, что сохранено в БД: гейт считается и по сохранённой версии.
  const [savedFaq, setSavedFaq] = useState<FaqPair[]>([]);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");

  useEffect(() => {
    supabase
      .from("content_packages")
      .select("*")
      .eq("id", params.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setPkg(data);
          setTelegramPost((data.format_telegram_post as string) ?? "");
          setSeoArticle((data.format_seo_article as string) ?? "");
          setCardsJson(JSON.stringify(data.format_cards ?? [], null, 2));
          setReelsScript((data.format_reels_script as string) ?? "");
          setFaq(toFaqPairs(data.format_faq));
          setSavedFaq(toFaqPairs(data.format_faq));
          setMetaTitle((data.meta_title as string) ?? "");
          setMetaDesc((data.meta_description as string) ?? "");
        }
      });
  }, [params.id, supabase]);

  if (!pkg) return <div className="py-12 text-center text-gray-500">Загрузка...</div>;

  const cleanFaq = (pairs: FaqPair[]) =>
    pairs.map((f) => ({ question: f.question.trim(), answer: f.answer.trim() })).filter((f) => f.question || f.answer);
  const faqDirty = JSON.stringify(cleanFaq(faq)) !== JSON.stringify(cleanFaq(savedFaq));
  // Проблемы считаются по тому, что видит эксперт; несохранённые правки - отдельная причина.
  const faqIssues = [
    ...faqProblems(cleanFaq(faq)),
    ...(faqDirty ? ["FAQ изменён, но не сохранён — нажмите «Сохранить»."] : []),
  ];

  const save = async () => {
    setSaving(true);
    let cards;
    try { cards = JSON.parse(cardsJson); } catch { cards = pkg.format_cards; }
    const faqToSave = cleanFaq(faq);

    const { error } = await supabase
      .from("content_packages")
      .update({
        format_telegram_post: telegramPost,
        format_seo_article: seoArticle,
        format_cards: cards,
        format_reels_script: reelsScript,
        format_faq: faqToSave,
        meta_title: metaTitle,
        meta_description: metaDesc,
        word_count: seoArticle.split(/\s+/).filter(Boolean).length,
      })
      .eq("id", params.id);

    setSaving(false);
    // Форму не пересоздаём (строки сохраняют ключи k); убираем только полностью пустые пары.
    if (!error) { setFaq(faq.filter((f) => f.question.trim() || f.answer.trim())); setSavedFaq(faqToSave); }
    toast(error ? "Ошибка сохранения" : "Контент сохранён", error ? "error" : "success");
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: params.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        if (data.profile_visible === false) {
          toast("Статья опубликована, но профиль не удалось сделать публичным — включите «Опубликовать профиль» в настройках профиля, иначе статья недоступна.", "error");
        } else {
          toast(data.profile_published_now ? "Опубликовано! Ваш профиль стал публичным." : "Контент опубликован!", "success");
        }
        setPkg({ ...pkg, status: "published", published_url: data.url });
      } else {
        const problems = Array.isArray(data.problems) && data.problems.length > 0 ? ` ${data.problems.join(" ")}` : "";
        toast((PUBLISH_ERRORS[data.code as string] ?? PUBLISH_ERRORS.error) + problems, "error");
      }
    } catch {
      toast("Сеть недоступна, попробуйте ещё раз.", "error");
    } finally {
      setPublishing(false);
    }
  };

  const del = async () => {
    const ok = await confirm({
      title: "Удалить контент-пакет?",
      message: "Это действие нельзя отменить. Все данные пакета будут удалены.",
      confirmText: "Удалить",
      variant: "danger",
    });
    if (!ok) return;
    await supabase.from("content_packages").delete().eq("id", params.id);
    toast("Контент-пакет удалён", "success");
    window.location.href = "/content";
  };

  const setPair = (i: number, patch: Partial<FaqPair>) => setFaq(faq.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <div>
      <Breadcrumbs items={[
        { label: "Контент", href: "/content" },
        { label: (pkg.title as string) || "Без заголовка" },
      ]} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 truncate">{(pkg.title as string) || "Без заголовка"}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge status={pkg.status as string} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>{saving ? "..." : "Сохранить"}</Button>
          {pkg.status !== "published" && (
            <Button variant="secondary" onClick={publish} disabled={faqIssues.length > 0 || publishing}>
              {publishing ? "Публикуем…" : "Опубликовать"}
            </Button>
          )}
          <Button variant="danger" onClick={del}>Удалить</Button>
        </div>
      </div>

      {/* R-07: предупреждение ДО нажатия - раньше эксперт узнавал о FAQ-гейте из ответа 422. */}
      {pkg.status !== "published" && faqIssues.length > 0 && (
        <div data-faq-warning className="mb-6 px-4 py-3 rounded-lg text-sm border bg-amber-50 border-amber-200 text-amber-800">
          <p className="font-medium">Чтобы опубликовать, дополните FAQ — страница отдаёт его поисковикам и нейросетям:</p>
          <ul className="mt-1 list-disc pl-5">
            {faqIssues.map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
          <button type="button" className="mt-2 underline" onClick={() => setTab("faq")}>Открыть вкладку «FAQ»</button>
        </div>
      )}
      {pkg.status !== "published" && faqIssues.length === 0 && (
        <p className="mb-6 text-xs text-gray-500">После публикации статья и ваш профиль эксперта станут видны всем. Скрыть профиль можно в настройках профиля.</p>
      )}

      {/* Meta */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Input label="Meta Title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
        <Input label="Meta Description" value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border p-4">
        {tab === "telegram" && (
          <Textarea rows={12} value={telegramPost} onChange={(e) => setTelegramPost(e.target.value)} placeholder="Telegram пост..." />
        )}
        {tab === "seo" && (
          <Textarea rows={30} value={seoArticle} onChange={(e) => setSeoArticle(e.target.value)} className="font-mono text-xs" placeholder="SEO-статья в Markdown..." />
        )}
        {tab === "cards" && (
          <Textarea rows={15} value={cardsJson} onChange={(e) => setCardsJson(e.target.value)} className="font-mono text-xs" placeholder='[{"title": "...", "text": "..."}]' />
        )}
        {tab === "reels" && (
          <Textarea rows={15} value={reelsScript} onChange={(e) => setReelsScript(e.target.value)} placeholder="Сценарий Reels..." />
        )}
        {tab === "faq" && (
          <div data-faq-form className="space-y-4">
            <p className="text-sm text-gray-500">Не меньше 3 пар. Вопрос — как его задал бы клиент, ответ — 1–3 предложения по делу.</p>
            {faq.map((f, i) => (
              <div key={f.k ?? i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Пара {i + 1}</span>
                  <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => setFaq(faq.filter((_, j) => j !== i))}>Удалить</button>
                </div>
                <Input label="Вопрос" value={f.question} onChange={(e) => setPair(i, { question: e.target.value })} />
                <Textarea rows={3} value={f.answer} onChange={(e) => setPair(i, { answer: e.target.value })} placeholder="Ответ..." />
              </div>
            ))}
            <Button variant="secondary" onClick={() => setFaq([...faq, { question: "", answer: "", k: Date.now() }])}>Добавить пару</Button>
          </div>
        )}
      </div>
    </div>
  );
}
