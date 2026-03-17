"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { NeuralBackground } from "@/components/marketing/neural-bg";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
      <div className="relative flex min-h-screen items-center justify-center bg-[#040714] px-4">
        <div className="fixed inset-0 z-0">
          <NeuralBackground className="opacity-40" nodeCount={100} hubCount={6} />
        </div>
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/20">
            <svg className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Проверьте почту</h2>
          <p className="mt-2 text-gray-300">
            Мы отправили ссылку для входа на <strong className="text-white">{email}</strong>
          </p>
          <button
            onClick={() => setSent(false)}
            className="mt-6 text-sm text-cyan-400 hover:text-cyan-300"
          >
            Отправить снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#040714] px-4">
      <div className="fixed inset-0 z-0">
        <NeuralBackground className="opacity-40" nodeCount={100} hubCount={6} />
      </div>
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Вход в НейроЭксперт</h1>
          <p className="mt-2 text-gray-300">
            Введите email — мы отправим ссылку для входа
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-medium text-white hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#040714] disabled:opacity-50 transition-all"
          >
            {loading ? "Отправляем..." : "Получить ссылку для входа"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-medium">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
