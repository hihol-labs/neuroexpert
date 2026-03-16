"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/for-experts", label: "Зачем эксперту" },
  { href: "/how-it-works", label: "Как это работает" },
  { href: "/pricing", label: "Тарифы" },
  { href: "/audit", label: "Бесплатный аудит" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-50 border-b border-white/5">
      <div className="absolute inset-0 bg-[#0a0e1a]/80 backdrop-blur-xl" />
      <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-black text-white">
            N
          </span>
          НейроЭксперт
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="ml-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-medium text-white hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/10"
          >
            Войти
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-gray-400 hover:text-white transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Меню"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="relative md:hidden border-t border-white/5">
          <div className="absolute inset-0 bg-[#0a0e1a]/95 backdrop-blur-xl" />
          <div className="relative px-6 py-4 space-y-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block rounded-lg px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="mt-2 block rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white"
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
    <footer className="border-t border-white/5 bg-[#040714]/60 backdrop-blur-xl py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-black text-white">
              N
            </span>
            <span className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} НейроЭксперт
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/for-experts" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Зачем эксперту
            </Link>
            <Link href="/how-it-works" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Как это работает
            </Link>
            <Link href="/pricing" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Тарифы
            </Link>
            <Link href="/audit" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Аудит
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
