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
        <Link href="/" className="flex items-center gap-2.5 text-xl font-bold text-white">
          <svg viewBox="0 0 36 36" fill="none" className="h-9 w-9 shrink-0" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="navLogo" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22D3EE"/>
                <stop offset="50%" stopColor="#3B82F6"/>
                <stop offset="100%" stopColor="#A855F7"/>
              </linearGradient>
            </defs>
            <g transform="translate(0, -4)">
              {/* Связи */}
              <line x1="10" y1="7" x2="18" y2="16" stroke="#22D3EE" strokeWidth="0.8" opacity="0.5"/>
              <line x1="26" y1="9" x2="18" y2="16" stroke="#3B82F6" strokeWidth="0.8" opacity="0.45"/>
              <line x1="18" y1="16" x2="12" y2="25" stroke="#8B5CF6" strokeWidth="0.8" opacity="0.5"/>
              <line x1="18" y1="16" x2="26" y2="24" stroke="#A855F7" strokeWidth="0.8" opacity="0.45"/>
              <line x1="12" y1="25" x2="26" y2="24" stroke="#8B5CF6" strokeWidth="0.7" opacity="0.35"/>
              <line x1="7" y1="16" x2="12" y2="25" stroke="#22D3EE" strokeWidth="0.7" opacity="0.35"/>
              <line x1="30" y1="18" x2="26" y2="24" stroke="#3B82F6" strokeWidth="0.7" opacity="0.35"/>
              <line x1="10" y1="7" x2="7" y2="16" stroke="#22D3EE" strokeWidth="0.7" opacity="0.35"/>
              <line x1="26" y1="9" x2="30" y2="18" stroke="#3B82F6" strokeWidth="0.7" opacity="0.35"/>
              <line x1="12" y1="25" x2="16" y2="32" stroke="#8B5CF6" strokeWidth="0.7" opacity="0.35"/>
              <line x1="26" y1="24" x2="28" y2="31" stroke="#A855F7" strokeWidth="0.7" opacity="0.35"/>
              <path d="M10 7 Q15 3, 26 9" stroke="#22D3EE" strokeWidth="0.5" opacity="0.2" fill="none"/>
              <path d="M7 16 Q5 22, 12 25" stroke="#22D3EE" strokeWidth="0.5" opacity="0.2" fill="none"/>
              <path d="M16 32 Q22 34, 28 31" stroke="#A855F7" strokeWidth="0.5" opacity="0.2" fill="none"/>
              {/* Центральный узел */}
              <circle cx="18" cy="16" r="3.2" fill="url(#navLogo)"/>
              <circle cx="18" cy="16" r="1.8" fill="#FFFFFF" opacity="0.9"/>
              {/* Крупные узлы */}
              <circle cx="10" cy="7" r="2" fill="#22D3EE"/>
              <circle cx="26" cy="9" r="2" fill="#3B82F6"/>
              <circle cx="12" cy="25" r="2.2" fill="#8B5CF6"/>
              <circle cx="26" cy="24" r="2" fill="#A855F7"/>
              <circle cx="7" cy="16" r="1.8" fill="#22D3EE"/>
              <circle cx="30" cy="18" r="1.8" fill="#3B82F6"/>
              {/* Мелкие узлы */}
              <circle cx="16" cy="32" r="1.5" fill="#8B5CF6"/>
              <circle cx="28" cy="31" r="1.5" fill="#A855F7"/>
              <circle cx="5" cy="8" r="1" fill="#22D3EE" opacity="0.6"/>
              <circle cx="32" cy="28" r="1" fill="#A855F7" opacity="0.6"/>
              <circle cx="18" cy="5" r="0.8" fill="#22D3EE" opacity="0.5"/>
            </g>
          </svg>
          <div className="flex flex-col">
            <span>НейроЭксперт</span>
            <span className="text-[10px] font-normal text-gray-500 tracking-wide -mt-0.5">Экспертиза, которую цитируют</span>
          </div>
        </Link>

        {/* Desktop — nav links centered */}
        <div className="hidden md:flex flex-1 justify-center items-center gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <Link
          href="/login"
          className="hidden md:inline-flex rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-medium text-white hover:from-cyan-400 hover:to-blue-500 transition-all"
        >
          Войти
        </Link>

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
        {/* Top row: logo + nav + social */}
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 36 36" fill="none" className="h-6 w-6 shrink-0" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="footLogo" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22D3EE"/>
                  <stop offset="50%" stopColor="#3B82F6"/>
                  <stop offset="100%" stopColor="#A855F7"/>
                </linearGradient>
              </defs>
              <line x1="10" y1="7" x2="18" y2="16" stroke="#22D3EE" strokeWidth="0.8" opacity="0.5"/>
              <line x1="26" y1="9" x2="18" y2="16" stroke="#3B82F6" strokeWidth="0.8" opacity="0.45"/>
              <line x1="18" y1="16" x2="12" y2="25" stroke="#8B5CF6" strokeWidth="0.8" opacity="0.5"/>
              <line x1="18" y1="16" x2="26" y2="24" stroke="#A855F7" strokeWidth="0.8" opacity="0.45"/>
              <line x1="12" y1="25" x2="26" y2="24" stroke="#8B5CF6" strokeWidth="0.7" opacity="0.35"/>
              <circle cx="18" cy="16" r="3.2" fill="url(#footLogo)"/>
              <circle cx="18" cy="16" r="1.8" fill="#FFFFFF" opacity="0.9"/>
              <circle cx="10" cy="7" r="2" fill="#22D3EE"/>
              <circle cx="26" cy="9" r="2" fill="#3B82F6"/>
              <circle cx="12" cy="25" r="2.2" fill="#8B5CF6"/>
              <circle cx="26" cy="24" r="2" fill="#A855F7"/>
            </svg>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">НейроЭксперт</span>
              <span className="text-[10px] text-gray-500">Экспертиза, которую цитируют</span>
            </div>
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

        {/* Divider */}
        <div className="mt-8 border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} НейроЭксперт. Все права защищены.
          </span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Политика конфиденциальности
            </Link>
            <Link href="/terms" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Условия использования
            </Link>
            <a href="mailto:info@neuroexpertise.ru" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Контакты
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
