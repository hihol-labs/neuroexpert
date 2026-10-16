"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, UserRound } from "lucide-react";
import { useState } from "react";

type Audience = "business" | "expert";

const scenarios = {
  business: {
    label: "Бизнес",
    eyebrow: "Контур локальных продаж",
    source: "Карты · отзывы · сайт · звонки",
    signal: "17 обращений без ответа",
    decision: "Вернуть звонки до 11:00",
    result: "+6 продаж / мес",
    href: "/for-business",
    cta: "Сценарий для бизнеса",
  },
  expert: {
    label: "Эксперт",
    eyebrow: "Контур экспертного спроса",
    source: "Поиск · вопросы · AI-ответы",
    signal: "840 запросов в месяц",
    decision: "Записать ответ на вопрос",
    result: "Страница → запись",
    href: "/audit",
    cta: "Получить карту спроса",
  },
} as const;

export function SystemProtocol() {
  const [audience, setAudience] = useState<Audience>("business");
  const scene = scenarios[audience];

  return (
    <section className="hiw-hero">
      <div className="hiw-hero-copy">
        <div className="sr-index"><span>NE / SYSTEM</span><span>PROTOCOL 01</span></div>
        <p className="sr-eyebrow">Как работает НейроЭксперт</p>
        <h1>Сигнал входит. Решение выходит.</h1>
        <p className="hiw-lede">Система связывает разрозненные данные, находит разрыв и переводит его в одно действие, которое можно выполнить и измерить.</p>
        <AudienceTabs audience={audience} onChange={setAudience} />
        <Link href={scene.href} className="hiw-context-link">{scene.cta}<ArrowRight /></Link>
      </div>
      <EngineScene audience={audience} />
    </section>
  );
}

function AudienceTabs({ audience, onChange }: { audience: Audience; onChange: (value: Audience) => void }) {
  return (
    <div className="hiw-tabs" role="group" aria-label="Сценарий системы">
      {(["business", "expert"] as const).map((value) => {
        const Icon = value === "business" ? BriefcaseBusiness : UserRound;
        return <button key={value} type="button" aria-pressed={audience === value} onClick={() => onChange(value)}><Icon />{scenarios[value].label}</button>;
      })}
    </div>
  );
}

function EngineScene({ audience }: { audience: Audience }) {
  const scene = scenarios[audience];
  return (
    <div className="hiw-engine" key={audience}>
      <div className="hiw-engine-head"><span><i /> SYSTEM CUTAWAY / LIVE</span><span>{scene.eyebrow}</span></div>
      <div className="hiw-engine-body">
        <EngineBlock index="01" title="Вход" value={scene.source} className="hiw-input" />
        <div className="hiw-core" aria-hidden="true"><i /><i /><i /><span>NE</span><b /></div>
        <EngineBlock index="02" title="Сигнал" value={scene.signal} className="hiw-signal" />
        <EngineBlock index="03" title="Решение" value={scene.decision} className="hiw-decision" />
        <EngineBlock index="04" title="Результат" value={scene.result} className="hiw-result" />
        <div className="hiw-flow-line"><i /></div>
      </div>
      <div className="hiw-engine-foot"><span>OBSERVE</span><span>CONNECT</span><span>DECIDE</span><span>LEARN</span></div>
    </div>
  );
}

function EngineBlock({ index, title, value, className }: { index: string; title: string; value: string; className: string }) {
  return <div className={`hiw-engine-block ${className}`}><span>{index} / {title}</span><strong>{value}</strong></div>;
}
