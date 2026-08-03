"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NICHES } from "shared/constants";
import { slugifyLatin } from "shared/utils/slug";
import { AuthFrame } from "@/components/auth/auth-frame";

function getFriendlyAuthError(message: string): string {
  if (/email/i.test(message) && /rate|frequency|limit/i.test(message)) return "Слишком много попыток. Попробуйте ещё раз через минуту.";
  if (/smtp|mail|email/i.test(message)) return "Не удалось отправить письмо. Проверьте email и попробуйте ещё раз через минуту.";
  if (/already|registered|exists/i.test(message)) return "Аккаунт с таким email уже есть. Попробуйте войти.";
  return "Не удалось создать аккаунт. Проверьте данные и попробуйте ещё раз.";
}

function RegisterForm() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [nicheId, setNicheId] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const wasSent = useRef(false);
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  useEffect(() => {
    if (wasSent.current && !sent) fullNameRef.current?.focus();
    wasSent.current = sent;
  }, [sent]);

  useEffect(() => {
    if (ref) localStorage.setItem("neuroexpert_ref", ref);
    if (!ref) {
      const cookieRef = document.cookie.split("; ").find((item) => item.startsWith("ref="))?.split("=")[1];
      if (cookieRef && !localStorage.getItem("neuroexpert_ref")) localStorage.setItem("neuroexpert_ref", cookieRef);
    }
  }, [ref]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const referrerSlug = ref || localStorage.getItem("neuroexpert_ref") || undefined;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFullName = fullName.trim();
    const slugBase = slugifyLatin(normalizedFullName);
    const slug = slugBase ? `${slugBase}-${crypto.randomUUID().slice(0, 8)}` : undefined;
    try {
      const { error: authError } = await createClient().auth.signUp({
        email: normalizedEmail,
        password: crypto.randomUUID(),
        options: {
          data: { full_name: normalizedFullName, slug, niche_id: nicheId || undefined, referrer_slug: referrerSlug },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (authError) { setError(getFriendlyAuthError(authError.message)); return; }
      setEmail(normalizedEmail);
      setFullName(normalizedFullName);
      setSent(true);
    } catch {
      setError("Не удалось связаться с сервисом регистрации. Проверьте подключение и попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return <div className="id-form-card" role="status" aria-live="polite"><div className="id-form-heading"><span>ACCESS / 02</span><Check /></div><div className="id-state"><div className="id-state-icon"><Check /></div><span className="id-state-kicker">CONFIRMATION SENT</span><h2>Почти готово.</h2><p>Проверьте почту <strong>{email}</strong> и перейдите по ссылке для подтверждения.</p><p className="id-form-switch">Нужно изменить данные? <button type="button" className="id-inline-button" onClick={() => setSent(false)}>Вернуться к форме</button></p></div></div>;
  }

  return (
    <div className="id-form-card">
      <div className="id-form-heading"><span>ACCESS / 02</span><UserRound /></div>
      <h2>Создать рабочий контур.</h2>
      <p className="id-form-lede">Бесплатный старт для эксперта. Данные и заявки остаются у вас.</p>
      <div className="id-terms"><span>01</span><span>0₽ / месяц</span><span>1 ниша</span><span>15% комиссия</span></div>
      <form onSubmit={handleSubmit} className="id-form" aria-busy={loading}>
        <label><span>Имя и фамилия</span><input ref={fullNameRef} name="fullName" id="register-full-name" type="text" required autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Иван Иванов" /></label>
        <label><span>Email</span><input name="email" id="register-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
        <label><span>Ниша</span><select name="niche" id="register-niche" value={nicheId} onChange={(event) => setNicheId(event.target.value)}><option value="">Выберите нишу...</option>{NICHES.map((niche) => <option key={niche.id} value={niche.id}>{niche.name}</option>)}</select></label>
        {error && <p className="id-form-error" role="alert" aria-live="assertive">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? "Создаём контур..." : "Зарегистрироваться"}<ArrowRight /></button>
      </form>
      <p className="id-form-switch">Уже есть аккаунт? <Link href="/login">Войти</Link></p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <AuthFrame eyebrow="Новый рабочий контур" title="Соберите свою точку опоры." description="Профиль эксперта, сигналы спроса и поток заявок — в одном спокойном интерфейсе." alternateHref="/login" alternateLabel="Войти">
      <Suspense fallback={<div className="id-form-card id-suspense"><span>ЗАГРУЖАЕМ КОНТУР</span><i /></div>}><RegisterForm /></Suspense>
    </AuthFrame>
  );
}
