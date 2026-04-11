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
      }
    });
  }, []);

  const save = async () => {
    if (!profile) return;
    setSaving(true);

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

        {/* Telegram */}
        <div className="bg-white rounded-xl border p-6 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-2">Telegram</h2>
          {profile.telegram_id ? (
            <p className="text-sm text-green-600">Привязан (ID: {String(profile.telegram_id)})</p>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-2">Telegram не привязан. Напишите боту @neuroexpert_bot команду /start</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
