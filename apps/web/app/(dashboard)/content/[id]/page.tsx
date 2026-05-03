"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
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
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // Editable fields
  const [telegramPost, setTelegramPost] = useState("");
  const [seoArticle, setSeoArticle] = useState("");
  const [cardsJson, setCardsJson] = useState("");
  const [reelsScript, setReelsScript] = useState("");
  const [faqJson, setFaqJson] = useState("");
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
          setFaqJson(JSON.stringify(data.format_faq ?? [], null, 2));
          setMetaTitle((data.meta_title as string) ?? "");
          setMetaDesc((data.meta_description as string) ?? "");
        }
      });
  }, [params.id, supabase]);

  if (!pkg) return <div className="py-12 text-center text-gray-500">Загрузка...</div>;

  const save = async () => {
    setSaving(true);
    let cards, faq;
    try { cards = JSON.parse(cardsJson); } catch { cards = pkg.format_cards; }
    try { faq = JSON.parse(faqJson); } catch { faq = pkg.format_faq; }

    const { error } = await supabase
      .from("content_packages")
      .update({
        format_telegram_post: telegramPost,
        format_seo_article: seoArticle,
        format_cards: cards,
        format_reels_script: reelsScript,
        format_faq: faq,
        meta_title: metaTitle,
        meta_description: metaDesc,
        word_count: seoArticle.split(/\s+/).filter(Boolean).length,
      })
      .eq("id", params.id);

    setSaving(false);
    toast(error ? "Ошибка сохранения" : "Контент сохранён", error ? "error" : "success");
  };

  const publish = async () => {
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content_id: params.id }),
    });
    const data = await res.json();
    if (data.ok) {
      toast("Контент опубликован!", "success");
      setPkg({ ...pkg, status: "published", published_url: data.url });
    } else {
      toast(data.error || "Ошибка публикации", "error");
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
          {pkg.status !== "published" && <Button variant="secondary" onClick={publish}>Опубликовать</Button>}
          <Button variant="danger" onClick={del}>Удалить</Button>
        </div>
      </div>

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
          <Textarea rows={15} value={faqJson} onChange={(e) => setFaqJson(e.target.value)} className="font-mono text-xs" placeholder='[{"question": "...", "answer": "..."}]' />
        )}
      </div>
    </div>
  );
}
