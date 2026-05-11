"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/for-business", label: "Бизнесу" },
  { href: "/for-experts", label: "Экспертам" },
  { href: "/launch", label: "Запуск" },
  { href: "/for-agencies", label: "Агентствам" },
  { href: "/how-it-works", label: "Как работает" },
  { href: "/pricing", label: "Тарифы" },
  { href: "/audit", label: "Аудит" },
];

function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <div className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold tracking-tight text-white`}>
      НЭ
    </div>
  );
}

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3 text-xl font-bold text-slate-950">
          <LogoMark />
          <div className="flex flex-col">
            <span>НейроЭксперт</span>
            <span className="-mt-0.5 text-[10px] font-medium tracking-wide text-slate-500">
              Контроль клиентского потока
            </span>
          </div>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <Link
          href="/login"
          className="hidden rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 md:inline-flex"
        >
          Войти
        </Link>

        <button
          className="rounded-md border border-slate-200 p-2 text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Меню"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="space-y-1 px-6 py-4">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="mt-2 block rounded-md bg-slate-950 px-4 py-2.5 text-center text-sm font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Войти
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white pb-6 pt-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <LogoMark className="h-7 w-7" />
              <span className="text-base font-semibold text-slate-950">НейроЭксперт</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              SaaS-платформа контроля клиентского потока: спрос, видимость,
              задачи, отзывы, конкуренты и потерянные обращения.
            </p>
            <Link
              href="/for-business"
              className="mt-2 inline-flex w-fit items-center rounded-md bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Получить аудит
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-slate-950">Возможности</span>
            <Link href="/how-it-works" className="text-sm text-slate-600 transition-colors hover:text-slate-950">
              Как это работает
            </Link>
            <Link href="/launch" className="text-sm text-slate-600 transition-colors hover:text-slate-950">
              Запуск
            </Link>
            <Link href="/for-business" className="text-sm text-slate-600 transition-colors hover:text-slate-950">
              Бизнесу
            </Link>
            <Link href="/scan" className="text-sm text-slate-600 transition-colors hover:text-slate-950">
              Проверка спроса
            </Link>
            <Link href="/for-experts" className="text-sm text-slate-600 transition-colors hover:text-slate-950">
              Экспертам
            </Link>
            <Link href="/for-agencies" className="text-sm text-slate-600 transition-colors hover:text-slate-950">
              Агентствам
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-slate-950">Информация</span>
            <Link href="/pricing" className="text-sm text-slate-600 transition-colors hover:text-slate-950">
              Тарифы
            </Link>
            <Link href="/for-agencies" className="text-sm text-slate-600 transition-colors hover:text-slate-950">
              API спроса
            </Link>
            <Link href="/privacy" className="text-sm text-slate-600 transition-colors hover:text-slate-950">
              Политика конфиденциальности
            </Link>
            <Link href="/terms" className="text-sm text-slate-600 transition-colors hover:text-slate-950">
              Публичная оферта
            </Link>
            <Link href="/requisites" className="text-sm text-slate-600 transition-colors hover:text-slate-950">
              Реквизиты
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-slate-950">Контакты</span>
            <a href="mailto:info@neuroexpertise.ru" className="text-sm text-slate-600 transition-colors hover:text-slate-950">
              info@neuroexpertise.ru
            </a>
            <a href="https://t.me/neuroexpertise" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-600 transition-colors hover:text-slate-950">
              Telegram-канал
            </a>
            <a href="https://t.me/neuroexpertise_bot" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-600 transition-colors hover:text-slate-950">
              Telegram-бот
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row">
          <span className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} НейроЭксперт. Все права защищены.
          </span>
        </div>
      </div>
    </footer>
  );
}
