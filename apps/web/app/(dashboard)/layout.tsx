"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, ClipboardList, FileText, Inbox, Users, Key, UserCircle } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/orders", label: "Заказы", icon: ClipboardList },
  { href: "/content", label: "Контент", icon: FileText },
  { href: "/leads", label: "Заявки", icon: Inbox },
  { href: "/team", label: "Команда", icon: Users },
  { href: "/api-keys", label: "API", icon: Key },
  { href: "/profile", label: "Профиль", icon: UserCircle },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <header className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <Link href="/dashboard" className="font-bold text-gray-900">НейроЭксперт</Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Меню" aria-expanded={sidebarOpen}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </header>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside role="navigation" aria-label="Навигация" className={`fixed top-0 left-0 z-40 h-full w-64 bg-white border-r transform transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6">
          <Link href="/dashboard" className="text-xl font-bold text-gray-900">НейроЭксперт</Link>
        </div>
        <nav className="px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <Link href="/content/new" className="block w-full text-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            Записать ответ
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
