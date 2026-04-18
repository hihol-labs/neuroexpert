import type { Metadata } from "next";

const TITLE = "Карта слепых зон AI — Knowledge API для SEO/GEO-агентств | НейроЭксперт";
const DESCRIPTION =
  "JSON-эндпоинты с реальными данными: какие вопросы в нише клиента нейросети отвечают плохо. gap_score, monthly_volume, 4 AI-платформы. Read free / Pro $99/мес / Enterprise.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/for-agencies" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/for-agencies" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
