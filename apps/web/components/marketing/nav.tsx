"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/for-business", label: "Бизнесу" },
  { href: "/launch", label: "Запуск" },
  { href: "/for-experts", label: "Экспертам" },
  { href: "/how-it-works", label: "Как работает" },
  { href: "/pricing", label: "Тарифы" },
  { href: "/audit", label: "Аудит" },
];

function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <div className={`${className} relative flex shrink-0 items-center justify-center bg-[var(--nx-ink)] text-xs font-bold tracking-tight text-white`}>
      Н
      <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 bg-[var(--nx-accent)]" />
    </div>
  );
}

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--nx-line)] bg-[var(--nx-paper)]/95 backdrop-blur-md">
      <nav className="mx-auto flex max-w-[90rem] items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:px-12 lg:py-4">
        <Link href="/" className="nx-focus-ring flex min-w-0 items-center gap-3 text-lg font-bold text-[var(--nx-ink)] sm:text-xl">
          <LogoMark />
          <div className="flex min-w-0 flex-col">
            <span className="truncate">НейроЭксперт</span>
            <span className="-mt-0.5 hidden text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--nx-ink-soft)] sm:block">
              Local Sales OS
            </span>
          </div>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="nx-focus-ring border-b border-transparent px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-[var(--nx-ink-soft)] transition-colors hover:border-[var(--nx-ink)] hover:text-[var(--nx-ink)]"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <Link
          href="/login"
          className="nx-focus-ring hidden min-h-10 items-center bg-[var(--nx-ink)] px-5 text-xs font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[var(--nx-cobalt)] lg:inline-flex"
        >
          Войти
        </Link>

        <button
          className="nx-focus-ring inline-flex h-11 w-11 shrink-0 items-center justify-center border border-[var(--nx-ink)] text-[var(--nx-ink)] transition-colors hover:bg-[var(--nx-accent)] lg:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Меню"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-[var(--nx-line)] bg-[var(--nx-paper)] shadow-2xl lg:hidden">
          <div className="max-h-[calc(100dvh-69px)] space-y-1 overflow-y-auto px-4 py-4 sm:px-6">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="nx-focus-ring block border-b border-[var(--nx-line)] px-1 py-3 text-sm font-bold text-[var(--nx-ink)] transition-colors hover:bg-[var(--nx-accent)]"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="nx-focus-ring mt-3 block bg-[var(--nx-ink)] px-4 py-3 text-center text-sm font-semibold text-white"
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
    <footer className="border-t border-white/15 bg-[var(--nx-ink)] pb-7 pt-14 text-white">
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <LogoMark className="h-7 w-7" />
              <span className="text-base font-semibold text-white">НейроЭксперт</span>
            </div>
            <p className="text-sm leading-relaxed text-white/55">
              Local Sales OS: спрос → точка входа → действие клиента →
              заявка, запись или продажа.
            </p>
            <Link
              href="/for-business"
              className="nx-focus-ring mt-2 inline-flex w-fit items-center bg-[var(--nx-accent)] px-5 py-2.5 text-sm font-bold text-[var(--nx-ink)] transition-colors hover:bg-white"
            >
              Получить аудит
            </Link>
          </div>

          <FooterLinks title="Возможности" links={FOOTER_PRODUCT_LINKS} />
          <FooterLinks title="Партнёрам" links={FOOTER_PARTNER_LINKS} />
          <FooterLinks title="Информация" links={FOOTER_INFO_LINKS} />

          <div className="flex flex-col gap-3">
            <span className="nx-kicker text-white/40">Контакты</span>
            <a href="mailto:info@neuroexpertise.ru" className="text-sm text-white/55 transition-colors hover:text-white">
              info@neuroexpertise.ru
            </a>
            <a href="https://t.me/neuroexpertise" target="_blank" rel="noopener noreferrer" className="text-sm text-white/55 transition-colors hover:text-white">
              Telegram-канал
            </a>
            <a href="https://t.me/neuroexpertise_bot" target="_blank" rel="noopener noreferrer" className="text-sm text-white/55 transition-colors hover:text-white">
              Telegram-бот
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/15 pt-6 sm:flex-row">
          <span className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} НейроЭксперт. Все права защищены.
          </span>
        </div>
      </div>
    </footer>
  );
}

const FOOTER_PRODUCT_LINKS = [
  ["Как это работает", "/how-it-works"],
  ["Запуск", "/launch"],
  ["Бизнесу", "/for-business"],
  ["Проверка спроса", "/scan"],
  ["Экспертам", "/for-experts"],
] as const;

const FOOTER_PARTNER_LINKS = [
  ["Агентствам", "/for-agencies"],
  ["API спроса", "/for-agencies"],
  ["OpenAPI docs", "/api/v1/docs"],
] as const;

const FOOTER_INFO_LINKS = [
  ["Тарифы", "/pricing"],
  ["Политика конфиденциальности", "/privacy"],
  ["Публичная оферта", "/terms"],
  ["Реквизиты", "/requisites"],
] as const;

function FooterLinks({ title, links }: { title: string; links: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="nx-kicker text-white/40">{title}</span>
      {links.map(([label, href]) => (
        <Link key={`${href}-${label}`} href={href} className="text-sm text-white/55 transition-colors hover:text-white">
          {label}
        </Link>
      ))}
    </div>
  );
}
