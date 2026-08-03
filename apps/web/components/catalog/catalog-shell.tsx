"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";

type CatalogSection = "experts" | "questions" | "niches" | "articles";

const LINKS = [
  { href: "/experts", label: "Эксперты", key: "experts" as const },
  { href: "/questions", label: "Вопросы", key: "questions" as const },
  { href: "/niches/psychology", label: "Ниши", key: "niches" as const },
  { href: "/audit", label: "Проверить видимость", key: null },
];

function CatalogMark() {
  return <span className="cat-logo-mark" aria-hidden="true">N<span /></span>;
}

export function CatalogHeader({ active }: { active?: CatalogSection }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="cat-header">
      <nav className="cat-header-nav" aria-label="Основная навигация">
        <Link href="/" className="cat-logo" aria-label="НейроЭксперт — главная">
          <CatalogMark />
          <span>НейроЭксперт<small>public signal index</small></span>
        </Link>
        <div className="cat-nav-links">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={active && link.key === active ? "is-active" : undefined}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className="cat-nav-actions">
          <Link href="/login">Войти</Link>
          <Link href="/register" className="cat-nav-cta">Стать экспертом <ArrowUpRight aria-hidden="true" /></Link>
        </div>
        <button
          type="button"
          className="cat-menu-button"
          onClick={() => setOpen((value) => !value)}
          aria-label="Открыть меню"
          aria-expanded={open}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </nav>
      {open && (
        <div className="cat-mobile-menu">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>Войти</Link>
          <Link href="/register" className="cat-mobile-cta" onClick={() => setOpen(false)}>Стать экспертом <ArrowUpRight aria-hidden="true" /></Link>
        </div>
      )}
    </header>
  );
}

export function CatalogFooter() {
  return (
    <footer className="cat-footer">
      <div className="cat-footer-grid">
        <div>
          <div className="cat-logo"><CatalogMark /><span>НейроЭксперт<small>public signal index</small></span></div>
          <p className="cat-footer-note">Проверяем, где живёт экспертный спрос, и соединяем его с людьми.</p>
        </div>
        <div className="cat-footer-column"><span>Каталог</span><Link href="/experts">Эксперты</Link><Link href="/questions">Вопросы</Link><Link href="/niches/psychology">Ниши</Link></div>
        <div className="cat-footer-column"><span>Система</span><Link href="/audit">Аудит видимости</Link><Link href="/for-business">Для бизнеса</Link><Link href="/for-experts">Экспертам</Link></div>
        <div className="cat-footer-column"><span>Контакт</span><a href="mailto:info@neuroexpertise.ru">info@neuroexpertise.ru</a><a href="https://t.me/neuroexpertise" target="_blank" rel="noopener noreferrer">Telegram</a></div>
      </div>
      <div className="cat-footer-bottom"><span>© {new Date().getFullYear()} НейроЭксперт</span><span>Данные обновляются по мере публикации</span></div>
    </footer>
  );
}
