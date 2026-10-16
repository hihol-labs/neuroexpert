import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Mic2 } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/nav";
import { generateServiceSchema } from "@/lib/schema-org";
import { OfferBlock } from "@/components/marketing/offer";

const TITLE = "Новые клиенты для экспертов из поиска и нейросетей | НейроЭксперт";
const DESCRIPTION = "НейроЭксперт находит реальные вопросы клиентов и помогает эксперту пройти путь: спрос → точка входа → действие клиента → заявка или запись.";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/for-experts" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/for-experts" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

const FRICTIONS = [
  ["01", "Не знаю, о чём говорить", "Карта спроса находит вопросы, где клиент уже близок к выбору."],
  ["02", "Нет времени писать", "Вы отвечаете голосом 3–10 минут. Система собирает структуру."],
  ["03", "Пишу, но меня не находят", "Ответ становится индексируемой страницей под конкретный запрос."],
  ["04", "Не понимаю, что работает", "Просмотры, клики по записи и заявки связаны с каждой темой."],
  ["05", "Мой опыт теряется в AI-тексте", "Цитаты, кейсы и ограничения остаются авторскими и проверяемыми."],
  ["06", "Нейросети отвечают неточно", "Сильный экспертный материал закрывает пробел в текущем ответе."],
];

const STAGES = [
  ["01", "Сигнал", "Находим реальный вопрос, спрос и слабость текущих ответов."],
  ["02", "Голос", "Фиксируем ваш опыт, кейсы, оговорки и естественную манеру ответа."],
  ["03", "Страница", "Собираем понятный материал с профилем, FAQ и действием клиента."],
  ["04", "Дистрибуция", "Отправляем в поиск, связываем с нишей и готовим форматы для каналов."],
  ["05", "Результат", "Считаем путь от темы до клика, записи и заявки."],
];

const GUARDS = [
  "Нейросеть не придумывает опыт, цифры и кейсы",
  "Авторские цитаты сохраняются без переписывания",
  "Эксперт подтверждает материал до публикации",
  "Ограничения и противопоказания остаются в тексте",
];

export default function ForExpertsPage() {
  const schema = generateServiceSchema({
    name: "НейроЭксперт для экспертов",
    description: DESCRIPTION,
    url: `${APP_URL}/for-experts`,
    serviceType: "Expert visibility and demand generation SaaS",
    offers: [
      { name: "Free", price: "0", url: `${APP_URL}/pricing` },
      { name: "Starter", price: "1490", url: `${APP_URL}/pricing` },
      { name: "Pro", price: "2990", url: `${APP_URL}/pricing` },
      { name: "Expert", price: "4990", url: `${APP_URL}/pricing` },
    ],
  });

  return (
    <div className="sr-site ex-site">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <MarketingHeader />
      <main>
        <section className="ex-hero">
          <div className="ex-hero-copy">
            <div className="sr-index"><span>01</span><span>Voiceprint Studio</span></div>
            <p className="sr-eyebrow"><span /> For independent experts</p>
            <h1>Ваш голос становится <em>точкой входа.</em></h1>
            <p>Не генерируем контент вместо вас. Находим вопрос клиента, фиксируем ваш ответ и превращаем его в страницу, которая ведёт к записи.</p>
            <div className="ex-actions"><Link className="sr-button sr-button-primary" href="/audit">Найти свой спрос <ArrowRight /></Link><Link href="/pricing">Посмотреть тарифы</Link></div>
          </div>
          <VoiceScene />
        </section>

        <OfferBlock
          artifact="Страница эксперта и публикации на площадке"
          price="0 / 1 490 / 2 990 / 4 990 ₽ в месяц"
          term="Страница открывается сразу после регистрации"
          cta={{ href: "/pricing?for=expert#experts", label: "Выбрать тариф эксперта" }}
          note="Площадку, страницу и публикацию даём мы. Экспертизу и ответы приносите вы."
        />
        <section className="ex-proof">
          <article><span>INPUT</span><b>Реальный вопрос</b><small>не тема из контент-плана</small></article>
          <article><span>SOURCE</span><b>Ваш голос</b><small>не синтетический эксперт</small></article>
          <article><span>OUTPUT</span><b>Запись клиента</b><small>не охват ради охвата</small></article>
        </section>

        <section className="ex-frictions">
          <header><p className="sr-eyebrow sr-eyebrow-dark"><span /> Friction / resolution</p><h2>Экспертиза уже есть. Теряется маршрут до клиента.</h2></header>
          <div className="ex-friction-list">{FRICTIONS.map(([number, title, solution]) => <article key={number}><span>{number}</span><h3>{title}</h3><ArrowRight /><p>{solution}</p></article>)}</div>
        </section>

        <section className="ex-pipeline">
          <header><p className="sr-eyebrow"><span /> Voice to demand</p><h2>Пять переходов.<br />Ни одного обезличивания.</h2><p>Система автоматизирует упаковку и измерение, но источник материала остаётся человеческим.</p></header>
          <div className="ex-stage-list">{STAGES.map(([number, title, description], index) => <article key={number}><span>{number}</span><div className="ex-stage-wave" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ height: `${18 + ((i * 17 + index * 13) % 68)}%` }} />)}</div><h3>{title}</h3><p>{description}</p><b>{index === 4 ? "MEASURE" : "PASS"}</b></article>)}</div>
        </section>

        <section className="ex-guards">
          <div><p className="sr-eyebrow sr-eyebrow-dark"><span /> Authenticity guard</p><h2>AI структурирует. Эксперт отвечает.</h2><p>Авторство — не декоративная подпись под сгенерированным текстом, а источник каждого содержательного утверждения.</p></div>
          <ol>{GUARDS.map((guard, index) => <li key={guard}><span>0{index + 1}</span><Check />{guard}</li>)}</ol>
        </section>

        <section className="ex-path">
          <div className="ex-path-copy"><p className="sr-eyebrow sr-eyebrow-dark"><span /> Client path</p><h2>От вопроса — к доверию. От доверия — к записи.</h2></div>
          <div className="ex-path-line"><article><span>01</span><b>Человек формулирует боль</b></article><article><span>02</span><b>Находит ваш точный ответ</b></article><article><span>03</span><b>Видит опыт и границы</b></article><article><span>04</span><b>Переходит к записи</b></article></div>
        </section>

        <section className="ex-cta"><div><p>Первый сигнал / бесплатно</p><h2>Проверьте спрос до того, как писать.</h2></div><Link className="sr-button sr-button-light" href="/audit">Открыть карту спроса <ArrowRight /></Link></section>
      </main>
      <MarketingFooter />
    </div>
  );
}

function VoiceScene() {
  return (
    <div className="ex-voice" aria-hidden="true">
      <header><span>VOICEPRINT / LIVE</span><span><i /> HUMAN SOURCE</span></header>
      <div className="ex-waveform">{Array.from({ length: 48 }, (_, index) => <i key={index} style={{ height: `${16 + ((index * 29) % 78)}%`, animationDelay: `${index * 35}ms` }} />)}</div>
      <div className="ex-record"><Mic2 /><span>REC</span><b>03:42</b></div>
      <div className="ex-transcript"><span>00:18 — AUTHOR QUOTE</span><p>«Клиенту важно понять не только что делать, но и где заканчиваются границы самостоятельной помощи»</p><div><i /> voice preserved</div></div>
      <div className="ex-voice-foot"><span>signal</span><b>locked</b><span>authorship</span><b>verified</b><span>next</span><b>publish</b></div>
    </div>
  );
}
