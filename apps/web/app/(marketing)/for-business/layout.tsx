import type { Metadata } from "next";

const TITLE = "НейроЭксперт для клиник, юрфирм и консалтинга";
const DESCRIPTION =
  "Сделайте экспертов компании видимыми для AI. Business 24 990 ₽/мес: до 5 экспертов, 10 ниш, 0% комиссия с заявок, персональный менеджер.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/for-business" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/for-business" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
