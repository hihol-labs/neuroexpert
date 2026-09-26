"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function ProfilePage() {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  );
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [tgLink, setTgLink] = useState<string | null>(null);
  const [tgBusy, setTgBusy] = useState(false);

  // R-08: подписанная одноразовая ссылка на бота (POST /api/telegram/link); отвязка - DELETE.
  async function linkTelegram() {
    setTgBusy(true);
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.url === "string") setTgLink(data.url);
      else toast(typeof data.error === "string" && res.status !== 401 ? data.error : "Не удалось получить ссылку", "error");
    } catch {
      toast("Сеть недоступна, попробуйте ещё раз.", "error");
    } finally {
      setTgBusy(false);
    }
  }
  async function unlinkTelegram() {
    setTgBusy(true);
    try {
      const res = await fetch("/api/telegram/link", { method: "DELETE" });
      if (res.ok) { setProfile((p) => (p ? { ...p, telegram_id: null } : p)); setTgLink(null); toast("Telegram отключён", "success"); }
      else toast("Не удалось отключить Telegram", "error");
    } catch {
      toast("Сеть недоступна, попробуйте ещё раз.", "error");
    } finally {
      setTgBusy(false);
    }
  }
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [knowsInput, setKnowsInput] = useState("");

  // Form fields
  const [fullName, setFullName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [qualification, setQualification] = useState("");
  const [city, setCity] = useState("");
  const [consultationPrice, setConsultationPrice] = useState("");
  const [consultationUrl, setConsultationUrl] = useState("");
  const [alumniOf, setAlumniOf] = useState("");
  const [worksFor, setWorksFor] = useState("");
  const [knowsAbout, setKnowsAbout] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [proofSummary, setProofSummary] = useState("");
  const [proofLinks, setProofLinks] = useState("");
  const [serviceSla, setServiceSla] = useState("");
  const [practiceLimitations, setPracticeLimitations] = useState("");
  const [proofAssets, setProofAssets] = useState<Array<Record<string, unknown>>>([]);
  const [assetType, setAssetType] = useState("certificate");
  const [assetTitle, setAssetTitle] = useState("");
  const [assetUrl, setAssetUrl] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data);
        setFullName((data.full_name as string) ?? "");
        setSlug((data.slug as string) ?? "");
        setBio((data.bio as string) ?? "");
        setQualification((data.qualification as string) ?? "");
        setCity((data.city as string) ?? "");
        setConsultationPrice(String((data.consultation_price as number) ?? ""));
        setConsultationUrl((data.consultation_url as string) ?? "");
        setAlumniOf((data.alumni_of as string) ?? "");
        setWorksFor((data.works_for as string) ?? "");
        setKnowsAbout((data.knows_about as string[]) ?? []);
        setYearsExperience(String((data.years_experience as number) ?? ""));
        setIsPublished((data.is_published as boolean) ?? false);
        const proof =
          typeof data.proof_of_human === "object" && data.proof_of_human !== null
            ? (data.proof_of_human as Record<string, unknown>)
            : {};
        const machineProfile =
          typeof data.machine_profile === "object" && data.machine_profile !== null
            ? (data.machine_profile as Record<string, unknown>)
            : {};
        setProofSummary((proof.summary as string) ?? "");
        setProofLinks(Array.isArray(proof.links) ? proof.links.join("\n") : "");
        setServiceSla((machineProfile.sla as string) ?? "");
        setPracticeLimitations(
          Array.isArray(data.practice_limitations)
            ? (data.practice_limitations as string[]).join("\n")
            : "",
        );
      }
    });
    fetch("/api/proof-of-human")
      .then((res) => res.json())
      .then((data) => setProofAssets(data.assets ?? []))
      .catch(() => setProofAssets([]));
  }, [supabase]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    const currentMachineProfile =
      typeof profile.machine_profile === "object" &&
      profile.machine_profile !== null &&
      !Array.isArray(profile.machine_profile)
        ? (profile.machine_profile as Record<string, unknown>)
        : {};
    const links = proofLinks
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const limitations = practiceLimitations
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        slug,
        bio: bio || null,
        qualification: qualification || null,
        city: city || null,
        consultation_price: consultationPrice ? Number(consultationPrice) : null,
        consultation_url: consultationUrl || null,
        alumni_of: alumniOf || null,
        works_for: worksFor || null,
        knows_about: knowsAbout.length ? knowsAbout : null,
        years_experience: yearsExperience ? Number(yearsExperience) : null,
        is_published: isPublished,
        proof_of_human: {
          summary: proofSummary || null,
          links,
          updated_at: new Date().toISOString(),
        },
        practice_limitations: limitations,
        machine_profile: {
          ...currentMachineProfile,
          sla: serviceSla || null,
          services: knowsAbout,
          booking_url: consultationUrl || null,
          price_from: consultationPrice ? Number(consultationPrice) : null,
          updated_at: new Date().toISOString(),
        },
      })
      .eq("id", profile.id as string);

    setSaving(false);
    toast(error ? `Ошибка: ${error.message}` : "Профиль сохранён", error ? "error" : "success");
  };

  const addKnows = () => {
    const val = knowsInput.trim();
    if (val && !knowsAbout.includes(val)) {
      setKnowsAbout([...knowsAbout, val]);
      setKnowsInput("");
    }
  };

  const removeKnows = (tag: string) => {
    setKnowsAbout(knowsAbout.filter((t) => t !== tag));
  };

  const addProofAsset = async () => {
    if (!assetTitle.trim()) return;
    const res = await fetch("/api/proof-of-human", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asset_type: assetType,
        title: assetTitle.trim(),
        evidence_url: assetUrl.trim() || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Ошибка добавления доказательства", "error");
      return;
    }
    setProofAssets([data.data, ...proofAssets]);
    setAssetTitle("");
    setAssetUrl("");
    toast("Доказательство добавлено на проверку", "success");
  };

  if (!profile) return <div className="py-12 text-center text-gray-500">Загрузка...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Профиль</h1>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>{saving ? "..." : "Сохранить"}</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Basic info */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Основная информация</h2>
          <Input label="Имя" id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="URL (slug)" id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Textarea label="О себе (bio)" id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          <Input label="Квалификация" id="qual" value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="Клинический психолог, КПТ-терапевт" />
          <Input label="Город" id="city" value={city} onChange={(e) => setCity(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Цена консультации (руб)" id="price" type="number" value={consultationPrice} onChange={(e) => setConsultationPrice(e.target.value)} />
            <Input label="Ссылка на запись" id="url" value={consultationUrl} onChange={(e) => setConsultationUrl(e.target.value)} placeholder="https://..." />
          </div>

          {/* Published toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm text-gray-700">Показывать в каталоге экспертов</span>
          </label>
        </div>

        {/* E-E-A-T */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">E-E-A-T (для Schema.org и блока &laquo;Об авторе&raquo;)</h2>
          <Input label="Образование (alumni_of)" id="alumni" value={alumniOf} onChange={(e) => setAlumniOf(e.target.value)} placeholder="МГУ, факультет психологии" />
          <Input label="Место работы (works_for)" id="works" value={worksFor} onChange={(e) => setWorksFor(e.target.value)} placeholder='Клиника "Альянс"' />
          <Input label="Стаж (лет)" id="exp" type="number" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} />

          {/* Knows about tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Области экспертизы (knows_about)</label>
            <div className="flex gap-2 mb-2">
              <input
                value={knowsInput}
                onChange={(e) => setKnowsInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKnows())}
                placeholder="Введите и нажмите Enter"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <Button variant="secondary" onClick={addKnows} type="button">+</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {knowsAbout.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-sm">
                  {tag}
                  <button onClick={() => removeKnows(tag)} className="text-blue-400 hover:text-blue-600">&times;</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Proof + machine profile */}
        <div className="bg-white rounded-xl border p-6 lg:col-span-2 space-y-4">
          <h2 className="font-semibold text-gray-900">Proof-of-Human и machine profile</h2>
          <Textarea
            label="Краткие доказательства опыта"
            id="proof-summary"
            rows={3}
            value={proofSummary}
            onChange={(e) => setProofSummary(e.target.value)}
            placeholder="Стаж, дипломы, кейсы, лицензии, публикации, подтверждённые отзывы"
          />
          <Textarea
            label="Ссылки на подтверждения"
            id="proof-links"
            rows={3}
            value={proofLinks}
            onChange={(e) => setProofLinks(e.target.value)}
            placeholder="Одна ссылка на строку"
          />
          <Input
            label="SLA / формат работы"
            id="service-sla"
            value={serviceSla}
            onChange={(e) => setServiceSla(e.target.value)}
            placeholder="Например: первичный ответ в течение 24 часов"
          />
          <Textarea
            label="Ограничения практики"
            id="practice-limitations"
            rows={3}
            value={practiceLimitations}
            onChange={(e) => setPracticeLimitations(e.target.value)}
            placeholder="Одна строка = одно честное ограничение: с чем не работаете, когда направляете к врачу, какие гарантии не даёте"
          />
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-900">Доказательства на проверку</h3>
            <div className="grid gap-3 md:grid-cols-[160px_1fr_1fr_auto]">
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {["identity", "diploma", "certificate", "case", "review", "voice", "video", "publication", "license"].map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <input
                value={assetTitle}
                onChange={(e) => setAssetTitle(e.target.value)}
                placeholder="Название"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={assetUrl}
                onChange={(e) => setAssetUrl(e.target.value)}
                placeholder="Ссылка"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <Button variant="secondary" type="button" onClick={addProofAsset}>
                Добавить
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {proofAssets.length === 0 ? (
                <p className="text-sm text-gray-500">Доказательства ещё не добавлены.</p>
              ) : (
                proofAssets.map((asset) => (
                  <div key={String(asset.id)} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    <span className="text-gray-700">{String(asset.title)} · {String(asset.asset_type)}</span>
                    <span className="text-xs text-gray-500">{String(asset.status)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Telegram */}
        <div className="bg-white rounded-xl border p-6 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-2">Telegram</h2>
          {/* R-08: привязка по подписанной ссылке из кабинета; письма приходят всегда, Telegram - дополнительно. */}
          {profile.telegram_id ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-green-600">Привязан (ID: {String(profile.telegram_id)})</p>
              <Button variant="secondary" onClick={unlinkTelegram} disabled={tgBusy}>Отключить</Button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Telegram не привязан. Уведомления приходят на e-mail; с Telegram — ещё и в бот, а черновики можно публиковать кнопкой.
              </p>
              {tgLink ? (
                <p className="text-sm">
                  <a href={tgLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Открыть бота и подтвердить привязку</a>
                  <span className="text-gray-500"> — ссылка действует 15 минут и срабатывает один раз. После привязки обновите страницу.</span>
                </p>
              ) : (
                <Button onClick={linkTelegram} disabled={tgBusy}>{tgBusy ? "..." : "Подключить Telegram"}</Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
