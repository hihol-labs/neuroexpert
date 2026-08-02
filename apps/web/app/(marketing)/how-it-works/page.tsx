import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/nav";
import { SystemProtocol } from "@/components/marketing/system-protocol";

export const metadata: Metadata = {
  title: "Как работает Local Sales OS | НейроЭксперт",
  description: "От сигнала спроса до измеримого действия: наблюдение, интерпретация, приоритет и обучение системы.",
  alternates: { canonical: "/how-it-works" },
};

const layers = [
  ["01", "Наблюдает", "Карты, поиск, отзывы, страницы, звонки и формы", "Собирает факты, а не ощущения"],
  ["02", "Связывает", "Спрос → точка входа → действие → исход", "Находит место разрыва"],
  ["03", "Решает", "Оценивает влияние, скорость и стоимость исправления", "Выдаёт один приоритет"],
  ["04", "Учится", "Сравнивает действие с кликами, обращениями и продажами", "Обновляет следующий шаг"],
] as const;

const guardrails = [
  ["Не генерирует работу ради работы", "Каждая задача связана с наблюдаемым сигналом и ожидаемым результатом."],
  ["Не прячет решение в дашборде", "Собственник видит приоритет, причину и способ проверить эффект."],
  ["Не масштабирует слабую страницу", "Без спроса, оффера, доказательств и метрик публикация не проходит gate."],
] as const;

const horizons = [
  ["07", "дней", "Первый разрыв найден", "есть список быстрых действий"],
  ["30", "дней", "Контур запущен", "источники и события связаны"],
  ["90", "дней", "Система учится", "видно, что масштабировать"],
] as const;

export default function HowItWorksPage() {
  return (
    <div className="sr-site hiw-site">
      <MarketingHeader />
      <main>
        <SystemProtocol />
        <ArchitectureSection />
        <GuardrailSection />
        <HorizonSection />
        <SystemCta />
      </main>
      <MarketingFooter />
    </div>
  );
}

function ArchitectureSection() {
  return (
    <section className="hiw-architecture">
      <div className="hiw-section-head"><p className="sr-eyebrow">01 / АРХИТЕКТУРА РЕШЕНИЯ</p><h2>Четыре слоя. Один непрерывный цикл.</h2><p>Данные не заканчиваются отчётом. Каждый слой передаёт следующему контекст, а результат возвращается в систему новым сигналом.</p></div>
      <div className="hiw-layer-list">
        <div className="hiw-layer-labels"><span>Слой</span><span>Что читает</span><span>Что отдаёт</span></div>
        {layers.map(([index, title, input, output]) => <article key={index}><span>{index}</span><h3>{title}</h3><p>{input}</p><div><ArrowRight /><strong>{output}</strong></div></article>)}
      </div>
    </section>
  );
}

function GuardrailSection() {
  return (
    <section className="hiw-guardrails">
      <div><p className="sr-eyebrow">02 / ОГРАНИЧЕНИЯ</p><h2>Сильная система знает, чего не делать.</h2></div>
      <div className="hiw-guardrail-list">
        {guardrails.map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><Minus /><div><h3>{title}</h3><p>{copy}</p></div></article>)}
      </div>
    </section>
  );
}

function HorizonSection() {
  return (
    <section className="hiw-horizons">
      <div className="hiw-section-head"><p className="sr-eyebrow">03 / ГОРИЗОНТ РЕЗУЛЬТАТА</p><h2>Сначала ясность. Затем система. Потом масштаб.</h2><p>Срок зависит от данных и скорости внедрения. Логика движения остаётся одинаковой.</p></div>
      <div className="hiw-horizon-line">
        {horizons.map(([value, unit, title, copy]) => <article key={value}><div><strong>{value}</strong><span>{unit}</span></div><i /><h3>{title}</h3><p>{copy}</p></article>)}
      </div>
    </section>
  );
}

function SystemCta() {
  return (
    <section className="hiw-cta">
      <div><p className="sr-eyebrow">Запустить первый цикл</p><h2>Начнём с сигнала, который уже есть у вашего бизнеса.</h2></div>
      <div><Link className="sr-button sr-button-light" href="/for-business">Получить диагностику <ArrowRight /></Link><span><Check /> без интеграций на первом этапе</span></div>
    </section>
  );
}
