"use client";

import Link from "next/link";
import { ArrowUpRight, LockKeyhole } from "lucide-react";

type AuthFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  alternateHref: string;
  alternateLabel: string;
  children: React.ReactNode;
};

const SIGNALS = ["identity", "access", "context", "handoff"];

export function AuthFrame({ eyebrow, title, description, alternateHref, alternateLabel, children }: AuthFrameProps) {
  return (
    <div className="id-site">
      <header className="id-header">
        <Link href="/" className="id-brand" aria-label="НейроЭксперт — главная">
          <span className="id-brand-mark">N<i /></span>
          <span>НейроЭксперт<small>Local Sales OS</small></span>
        </Link>
        <div className="id-header-meta"><span>Signal Room / Identity</span><Link href={alternateHref}>{alternateLabel}<ArrowUpRight /></Link></div>
      </header>

      <main className="id-layout">
        <section className="id-copy">
          <div className="id-index"><span>AUTH / 01</span><span>Private workspace</span></div>
          <p className="id-eyebrow"><span />{eyebrow}</p>
          <h1>{title}</h1>
          <p className="id-description">{description}</p>
          <div className="id-signals" aria-label="Слои доступа">
            {SIGNALS.map((signal, index) => <div key={signal}><span>0{index + 1}</span><b>{signal}</b><i /></div>)}
          </div>
          <p className="id-footnote"><LockKeyhole /> Данные остаются в вашем рабочем контуре.</p>
        </section>

        <section className="id-panel">
          <div className="id-panel-header"><span>AUTHENTICATION / NODE 01</span><span><i /> SECURE</span></div>
          <div className="id-signal-field" aria-hidden="true">
            <div className="id-signal-orbit id-signal-orbit-one" />
            <div className="id-signal-orbit id-signal-orbit-two" />
            <div className="id-signal-core">N<span>01</span></div>
            <b className="id-signal-sweep" />
            {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 140}ms` }} />)}
          </div>
          <div className="id-form-shell">{children}</div>
          <div className="id-panel-footer"><span>encrypted / session ready</span><span>v2.4.0</span></div>
        </section>
      </main>

      <footer className="id-footer"><span>© {new Date().getFullYear()} НейроЭксперт</span><span>Signal Room is a private operating layer.</span></footer>
    </div>
  );
}
