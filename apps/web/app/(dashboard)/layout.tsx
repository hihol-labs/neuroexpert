"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, ClipboardList, FileText, Inbox, Key, Layers3, LayoutDashboard, Menu, Mic, UserCircle, Users, Workflow, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Дашборд", section: "Overview", icon: LayoutDashboard },
  { href: "/today", label: "Сегодня", section: "Overview", icon: Mic },
  { href: "/orders", label: "Возможности спроса", section: "Growth", icon: ClipboardList },
  { href: "/content", label: "Контент", section: "Growth", icon: FileText },
  { href: "/leads", label: "Заявки", section: "Growth", icon: Inbox },
  { href: "/local-sales", label: "Local Sales", section: "Growth", icon: BriefcaseBusiness },
  { href: "/marketing-os", label: "Marketing OS", section: "Operations", icon: Workflow },
  { href: "/agency", label: "Agencies", section: "Operations", icon: Layers3 },
  { href: "/team", label: "Команда", section: "Operations", icon: Users },
  { href: "/api-keys", label: "API", section: "System", icon: Key },
  { href: "/profile", label: "Профиль", section: "System", icon: UserCircle },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  let currentSection = "";

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (sidebarRef.current) sidebarRef.current.inert = isMobile && !sidebarOpen;
  }, [isMobile, sidebarOpen]);

  return (
    <div className="nx-shell">
      <header className="nx-mobilebar">
        <Link href="/dashboard" className="nx-brand" aria-label="НейроЭксперт — дашборд"><span className="nx-brand-mark">N<i /></span><span>НейроЭксперт<small>Signal Room</small></span></Link>
        <button type="button" onClick={() => setSidebarOpen((value) => !value)} className="nx-menu-button" aria-label="Меню" aria-expanded={sidebarOpen}>{sidebarOpen ? <X /> : <Menu />}</button>
      </header>

      {sidebarOpen && <button type="button" className="nx-overlay" aria-label="Закрыть меню" onClick={() => setSidebarOpen(false)} />}

      <aside ref={sidebarRef} className={`nx-sidebar ${sidebarOpen ? "is-open" : ""}`} aria-hidden={isMobile && !sidebarOpen ? true : undefined}>
        <div className="nx-sidebar-head"><Link href="/dashboard" className="nx-brand" aria-label="НейроЭксперт — дашборд"><span className="nx-brand-mark">N<i /></span><span>НейроЭксперт<small>Signal Room</small></span></Link><span className="nx-sidebar-code">WORKSPACE / 01</span></div>
        <nav className="nx-nav" aria-label="Навигация">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const showSection = currentSection !== item.section;
            currentSection = item.section;
            return <div key={item.href}>{showSection && <span className="nx-nav-section">{item.section}</span>}<Link href={item.href} onClick={() => setSidebarOpen(false)} aria-current={active ? "page" : undefined} className={`nx-nav-link ${active ? "is-active" : ""}`}><item.icon /><span>{item.label}</span>{active && <i />}</Link></div>;
          })}
        </nav>
        <div className="nx-sidebar-foot"><div><span className="nx-live-dot" />Signal Room online</div><Link href="/content/new" className="nx-compose">Записать ответ <ArrowUpRight /></Link></div>
      </aside>

      <main className="nx-main"><div className="nx-page">{children}</div></main>
    </div>
  );
}
