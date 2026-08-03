"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Mail } from "lucide-react";
import { AuthFrame } from "@/components/auth/auth-frame";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const wasSent = useRef(false);

  useEffect(() => {
    if (wasSent.current && !sent) emailRef.current?.focus();
    wasSent.current = sent;
  }, [sent]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Не удалось отправить ссылку для входа. Попробуйте ещё раз через минуту.");
        return;
      }
      setSent(true);
    } catch {
      setError("Не удалось связаться с сервисом входа. Проверьте подключение и попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      eyebrow="Вход в рабочий контур"
      title="Вернитесь к сигналам."
      description="Вход по magic link — без паролей, лишних экранов и компромиссов по безопасности."
      alternateHref="/register"
      alternateLabel="Создать аккаунт"
    >
      <div className="id-form-card">
        <div className="id-form-heading"><span>ACCESS / 01</span><Mail /></div>
        {sent ? (
          <div className="id-state" role="status" aria-live="polite">
            <div className="id-state-icon"><Check /></div>
            <span className="id-state-kicker">LINK SENT</span>
            <h2>Проверьте почту.</h2>
            <p>Ссылка для входа отправлена на <strong>{email}</strong>.</p>
            <button type="button" className="id-text-button" onClick={() => setSent(false)}>Отправить снова <ArrowRight /></button>
          </div>
        ) : (
          <>
            <h2>Получить ссылку для входа.</h2>
            <p className="id-form-lede">Укажите рабочий email. Мы отправим одноразовую ссылку.</p>
            <form onSubmit={handleSubmit} className="id-form" aria-busy={loading}>
              <label><span>Email</span><input ref={emailRef} name="email" id="login-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.ru" /></label>
              {error && <p className="id-form-error" role="alert" aria-live="assertive">{error}</p>}
              <button type="submit" disabled={loading}>{loading ? "Отправляем..." : "Получить ссылку"}<ArrowRight /></button>
            </form>
            <p className="id-form-switch">Нет аккаунта? <Link href="/register">Зарегистрироваться</Link></p>
          </>
        )}
      </div>
    </AuthFrame>
  );
}
