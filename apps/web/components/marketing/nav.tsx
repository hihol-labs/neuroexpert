"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";

// Две первые ссылки — точки входа воронки (бесплатный замер и карта спроса).
// Они обязаны быть в шапке и в подвале каждого лендинга: клиент должен видеть
// первый шаг, не считывая структуру сайта. Проверяется scripts/verify-funnel.mjs.
const NAV_LINKS = [
  { href: "/scan", label: "Замер в ИИ" },
  { href: "/audit", label: "Карта спроса" },
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
          {/* Вход для действующих клиентов — навигация, а не CTA воронки:
              размечен data-funnel-exempt, чтобы исключение было видно в коде. */}
          <Link href="/login" data-funnel-exempt="auth-nav">Войти</Link>
          <Link href="/scan" className="sr-nav-cta">Бесплатный замер <ArrowUpRight /></Link>
        </div>

        <button className="sr-menu-button" onClick={() => setOpen((value) => !value)} aria-label="Меню" aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {open && (
        <div className="sr-mobile-menu">
          {NAV_LINKS.map((link) => <Link href={link.href} key={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}
          <Link href="/login" data-funnel-exempt="auth-nav" onClick={() => setOpen(false)}>Войти</Link>
          <Link href="/scan" className="sr-mobile-cta" onClick={() => setOpen(false)}>Бесплатный замер в ИИ</Link>
        </div>
      )}
    </header>
  );
}

/**
 * Живой канал связи в теле страницы (не внутри <footer>): клиент, который
 * дочитал лендинг, должен иметь возможность написать или позвонить сразу, а не
 * искать контакты в подвале. Рендерится на каждом маркетинговом маршруте.
 */
export function FunnelContactBand() {
  return (
    <section className="sr-contact-band" id="funnel-contact">
      <div className="sr-contact-copy">
        <p className="sr-eyebrow"><span /> Следующий шаг</p>
        <h2>Начните с бесплатного замера — или спросите нас напрямую.</h2>
        <p>Покажем, называют ли вас нейросети по запросам ваших клиентов, и кого называют вместо вас.</p>
      </div>
      <div className="sr-contact-actions">
        <Link href="/scan" className="sr-button sr-button-primary">Бесплатный замер <ArrowUpRight /></Link>
        <a href="https://t.me/neuroexpertise" target="_blank" rel="noopener noreferrer">Написать в Telegram</a>
        <a href="tel:+79051238877">+7 905 123-88-77</a>
      </div>
    </section>
  );
}

export function MarketingFooter() {
  return (
    <>
      <FunnelContactBand />
    <footer className="sr-footer">
      <div className="sr-footer-top">
        <div className="sr-footer-brand">
          <div className="sr-logo"><LogoMark /><span>НейроЭксперт<small>Local Sales OS</small></span></div>
          <p>Система, которая превращает локальный спрос в понятные действия команды.</p>
        </div>
        <FooterColumn title="Продукт" links={[["Замер в ИИ", "/scan"], ["Карта спроса", "/audit"], ["Как работает", "/how-it-works"], ["Для бизнеса", "/for-business"], ["Запуск", "/launch"], ["Тарифы", "/pricing"]]} />
        <FooterColumn title="Компания" links={[["Экспертам", "/for-experts"], ["Агентствам", "/for-agencies"], ["Документация API", "/api/v1/docs"], ["Реквизиты", "/requisites"]]} />
        <div className="sr-footer-column">
          <span>Контакт</span>
          <a href="tel:+79051238877">+7 905 123-88-77</a>
          <a href="mailto:info@neuroexpertise.ru">info@neuroexpertise.ru</a>
          <a href="https://t.me/neuroexpertise" target="_blank" rel="noopener noreferrer">Telegram</a>
        </div>
      </div>
      <div className="sr-footer-bottom">
        <span>© {new Date().getFullYear()} НейроЭксперт</span>
        <div><Link href="/privacy">Конфиденциальность</Link><Link href="/terms">Оферта</Link></div>
      </div>
    </footer>
    </>
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
