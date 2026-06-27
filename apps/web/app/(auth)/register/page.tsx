"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NICHES } from "shared/constants";
import { slugifyLatin } from "shared/utils/slug";

function getFriendlyAuthError(message: string): string {
  if (/email/i.test(message) && /rate|frequency|limit/i.test(message)) {
    return "Слишком много попыток. Попробуйте ещё раз через минуту.";
  }
  if (/smtp|mail|email/i.test(message)) {
    return "Не удалось отправить письмо. Проверьте email и попробуйте ещё раз через минуту.";
  }
  if (/already|registered|exists/i.test(message)) {
    return "Аккаунт с таким email уже есть. Попробуйте войти.";
  }
  return "Не удалось создать аккаунт. Проверьте данные и попробуйте ещё раз.";
}

function RegisterForm() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [nicheId, setNicheId] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  useEffect(() => {
    if (ref) {
      localStorage.setItem("neuroexpert_ref", ref);
    }
    if (!ref) {
      const cookieRef = document.cookie
        .split("; ")
        .find((c) => c.startsWith("ref="))
        ?.split("=")[1];
      if (cookieRef && !localStorage.getItem("neuroexpert_ref")) {
        localStorage.setItem("neuroexpert_ref", cookieRef);
      }
    }
  }, [ref]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const referrerSlug = ref || localStorage.getItem("neuroexpert_ref") || undefined;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFullName = fullName.trim();

    const slugBase = slugifyLatin(normalizedFullName);
    const slug = slugBase ? `${slugBase}-${crypto.randomUUID().slice(0, 8)}` : undefined;

    const supabase = createClient();
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: crypto.randomUUID(),
        options: {
          data: {
            full_name: normalizedFullName,
            slug,
            niche_id: nicheId || undefined,
            referrer_slug: referrerSlug,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (authError) {
        setError(getFriendlyAuthError(authError.message));
        return;
      }
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
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-950">Почти готово!</h2>
        <p className="mt-2 text-slate-600">
          Проверьте почту <strong className="text-slate-950">{email}</strong> и перейдите по ссылке для подтверждения.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-950">Регистрация</h1>
        <p className="mt-2 text-slate-600">
          Начните бесплатно — платите только когда зарабатываете
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs">
          <span className="rounded-full bg-green-50 px-2 py-1 text-green-700">0₽ / мес</span>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">1 ниша</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">15% комиссия с клиентов</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
            Имя и фамилия
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Иван Иванов"
            className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="expert@example.com"
            className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="niche" className="block text-sm font-medium text-slate-700">
            Ваша ниша
          </label>
          <select
            id="niche"
            value={nicheId}
            onChange={(e) => setNicheId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Выберите нишу...</option>
            {NICHES.map((niche) => (
              <option key={niche.id} value={niche.id}>
                {niche.icon} {niche.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-slate-950 px-4 py-3 font-medium text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="font-medium text-blue-700 hover:text-blue-900">
          Войти
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            </div>
          }
        >
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
