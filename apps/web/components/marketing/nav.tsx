"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/for-business", label: "Бизнесу" },
  { href: "/how-it-works", label: "Система" },
  { href: "/launch", label: "Запуск" },
  { href: "/pricing", label: "Тарифы" },
] as const;

function LogoMark() {
  return <span className="sr-logo-mark">N<span /></span>;
}

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sr-header">
      <nav>
        <Link href="/" className="sr-logo" aria-label="НейроЭксперт — главная">
          <LogoMark />
          <span>НейроЭксперт<small>Local Sales OS</small></span>
        </Link>

        <div className="sr-nav-links">
          {NAV_LINKS.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
        </div>

        <div className="sr-nav-actions">
          <Link href="/login">Войти</Link>
          <Link href="/for-business" className="sr-nav-cta">Диагностика <ArrowUpRight /></Link>
        </div>

        <button className="sr-menu-button" onClick={() => setOpen((value) => !value)} aria-label="Меню" aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {open && (
        <div className="sr-mobile-menu">
          {NAV_LINKS.map((link) => <Link href={link.href} key={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}
          <Link href="/login" onClick={() => setOpen(false)}>Войти</Link>
          <Link href="/for-business" className="sr-mobile-cta" onClick={() => setOpen(false)}>Получить диагностику</Link>
        </div>
      )}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="sr-footer">
      <div className="sr-footer-top">
        <div className="sr-footer-brand">
          <div className="sr-logo"><LogoMark /><span>НейроЭксперт<small>Local Sales OS</small></span></div>
          <p>Система, которая превращает локальный спрос в понятные действия команды.</p>
        </div>
        <FooterColumn title="Продукт" links={[["Как работает", "/how-it-works"], ["Для бизнеса", "/for-business"], ["Запуск", "/launch"], ["Тарифы", "/pricing"]]} />
        <FooterColumn title="Компания" links={[["Экспертам", "/for-experts"], ["Агентствам", "/for-agencies"], ["Документация API", "/api/v1/docs"], ["Реквизиты", "/requisites"]]} />
        <div className="sr-footer-column">
          <span>Контакт</span>
          <a href="mailto:info@neuroexpertise.ru">info@neuroexpertise.ru</a>
          <a href="https://t.me/neuroexpertise" target="_blank" rel="noopener noreferrer">Telegram</a>
        </div>
      </div>
      <div className="sr-footer-bottom">
        <span>© {new Date().getFullYear()} НейроЭксперт</span>
        <div><Link href="/privacy">Конфиденциальность</Link><Link href="/terms">Оферта</Link></div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div className="sr-footer-column">
      <span>{title}</span>
      {links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
    </div>
  );
}
