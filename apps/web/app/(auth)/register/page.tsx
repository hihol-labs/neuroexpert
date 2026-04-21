"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NICHES } from "shared/constants";
import { slugifyLatin } from "shared/utils/slug";
import { NeuralBackground } from "@/components/marketing/neural-bg";

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

    const slugBase = slugifyLatin(fullName);
    const slug = slugBase ? `${slugBase}-${crypto.randomUUID().slice(0, 8)}` : undefined;

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password: crypto.randomUUID(),
      options: {
        data: {
          full_name: fullName,
          slug,
          niche_id: nicheId || undefined,
          referrer_slug: referrerSlug,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
          <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white">Почти готово!</h2>
        <p className="mt-2 text-gray-300">
          Проверьте почту <strong className="text-white">{email}</strong> и перейдите по ссылке для подтверждения.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white">Регистрация</h1>
        <p className="mt-2 text-gray-300">
          Начните бесплатно — платите только когда зарабатываете
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs">
          <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded-full">0₽ / мес</span>
          <span className="bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-full">1 ниша</span>
          <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">15% комиссия с клиентов</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-300">
            Имя и фамилия
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Иван Иванов"
            className="mt-1 block w-full rounded-lg border border-cyan-400/40 bg-white/10 px-4 py-3 text-white placeholder-gray-400 shadow-[0_0_8px_rgba(34,211,238,0.15)] focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:shadow-[0_0_12px_rgba(34,211,238,0.3)]"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="expert@example.com"
            className="mt-1 block w-full rounded-lg border border-cyan-400/40 bg-white/10 px-4 py-3 text-white placeholder-gray-400 shadow-[0_0_8px_rgba(34,211,238,0.15)] focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:shadow-[0_0_12px_rgba(34,211,238,0.3)]"
          />
        </div>

        <div>
          <label htmlFor="niche" className="block text-sm font-medium text-gray-300">
            Ваша ниша
          </label>
          <select
            id="niche"
            value={nicheId}
            onChange={(e) => setNicheId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-cyan-400/40 bg-white/10 px-4 py-3 text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          >
            <option value="" className="bg-gray-900">Выберите нишу...</option>
            {NICHES.map((niche) => (
              <option key={niche.id} value={niche.id} className="bg-gray-900">
                {niche.icon} {niche.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-medium text-white hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#040714] disabled:opacity-50 transition-all"
        >
          {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
          Войти
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#040714] px-4">
      <div className="fixed inset-0 z-0">
        <NeuralBackground className="opacity-40" nodeCount={100} hubCount={6} />
      </div>
      <div className="relative z-10">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-500" />
            </div>
          }
        >
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
