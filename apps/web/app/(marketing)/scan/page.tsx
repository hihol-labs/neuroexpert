"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowRight, Crosshair, Radio, RotateCcw } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/nav";
import { OfferBlock } from "@/components/marketing/offer";

type Step = "form" | "loading" | "error";

// Названия платформ в радаре и прогрессе — обещание клиенту, а не декорация:
// адаптеры в app/api/scan/route.ts возвращают null без ключа, поэтому имена
// неподключённых движков рисовать нельзя (находка раунда 23). Здесь остаются
// нейтральные подписи стадий; фактический состав платформ виден в результате.
const PLATFORMS = [
  { id: "01", name: "Запрос", position: "sc-node-one" },
  { id: "02", name: "Ответы ИИ", position: "sc-node-two" },
  { id: "03", name: "Сравнение", position: "sc-node-three" },
];

export default function ScanPage() {
  const [query, setQuery] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const queryInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError("Введите минимум 2 символа");
      return;
    }

    setStep("loading");
    setError("");

    try {
      const competitorTrimmed = competitor.trim();
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, competitor: competitorTrimmed || undefined }),
      });

      if (response.status === 429) {
        setError("Лимит проверок: 3 в час. Попробуйте позже.");
        setStep("error");
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Не удалось получить ответ платформ");
        setStep("error");
        return;
      }

      const data = await response.json();
      router.push(`/scan/${data.slug}`);
    } catch {
      setError("Сеть не ответила. Попробуйте ещё раз.");
      setStep("error");
    }
  }

  function retry() {
    setError("");
    setStep("form");
    requestAnimationFrame(() => queryInputRef.current?.focus());
  }

  return (
    <div className="sr-site sc-site">
      <MarketingHeader />
      <main>
        <section className="sc-hero" id="scan-probe">
          <ScanIntro />
          <ProbeConsole step={step} query={query} competitor={competitor} error={error} inputRef={queryInputRef} onQuery={setQuery} onCompetitor={setCompetitor} onSubmit={handleSubmit} onRetry={retry} />
        </section>
        <OfferBlock
          artifact="Страница результата замера по постоянной ссылке"
          price="Бесплатно"
          term="Сразу"
          cta={{ href: "#scan-probe", label: "Запустить замер" }}
        />
        <ScanReadout />
      </main>
      <MarketingFooter />
    </div>
  );
}

function ScanIntro() {
  return (
    <div className="sc-copy">
      <div className="sr-index"><span>01</span><span>AI Visibility Probe</span></div>
      <p className="sr-eyebrow"><span /> Live diagnostic</p>
      <h1>Кому нейросети <em>отдают ваш спрос?</em></h1>
      <p className="sc-lede">Один запрос проходит через подключённые ИИ-платформы. Вы видите не абстрактную «видимость», а кому достаётся внимание клиента прямо сейчас.</p>
      <div className="sc-spec"><div><span>Режим</span><b>LIVE</b></div><div><span>Время</span><b>10–40 сек</b></div><div><span>Отчёт</span><b>ССЫЛКА</b></div></div>
    </div>
  );
}

function ProbeConsole({ step, query, competitor, error, inputRef, onQuery, onCompetitor, onSubmit, onRetry }: {
  step: Step; query: string; competitor: string; error: string; inputRef: React.RefObject<HTMLInputElement>;
  onQuery: (value: string) => void; onCompetitor: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void; onRetry: () => void;
}) {
  return (
    <section className="sc-console" aria-label="Проверка видимости в нейросетях">
      <header><span>PROBE / NEW</span><span className={step === "loading" ? "is-live" : ""}><i /> {step === "loading" ? "SCANNING" : "READY"}</span></header>
      {step === "form" && <><ProbeRadar /><form className="sc-form" onSubmit={onSubmit} noValidate>
        <label><span>01 / Вы или ваша компания</span><input ref={inputRef} type="text" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Иван Петров, психолог" maxLength={200} required autoComplete="organization" /></label>
        <label><span>02 / Контрольная точка · необязательно</span><input type="text" value={competitor} onChange={(event) => onCompetitor(event.target.value)} placeholder="Конкурент или альтернатива" maxLength={200} /></label>
        {error && <p className="sc-form-error" role="alert">{error}</p>}
        <button type="submit">Запустить проверку <ArrowRight aria-hidden="true" /></button>
      </form></>}
      {step === "loading" && <ScanningState query={query} competitor={competitor} />}
      {step === "error" && <div className="sc-error" role="alert"><Radio aria-hidden="true" /><span>SIGNAL LOST</span><h2>Ответ не собран.</h2><p>{error}</p><button type="button" onClick={onRetry}><RotateCcw aria-hidden="true" /> Повторить проверку</button></div>}
    </section>
  );
}

function ScanReadout() {
  return (
    <>
      <section className="sc-readout"><header><p className="sr-eyebrow sr-eyebrow-dark"><span /> Readout</p><h2>Ответы платформ.<br />Одна картина спроса.</h2></header><div className="sc-readout-list">
        <article><span>01</span><h3>Присутствие</h3><p>Появляетесь ли вы в ответе и в каком контексте.</p><b>FIND</b></article>
        <article><span>02</span><h3>Сравнение</h3><p>Кому платформа отдаёт приоритет: вам или альтернативе.</p><b>COMPARE</b></article>
        <article><span>03</span><h3>Следующий ход</h3><p>Какую точку входа запустить, чтобы забрать потерянный спрос.</p><b>ACT</b></article>
      </div></section>
      <section className="sc-audit-cta"><div><p>Нужна карта по всей нише?</p><h2>Добавьте вопросы клиентов и сравнение ответов.</h2></div><Link className="sr-button sr-button-light" href="/audit">Открыть карту спроса <ArrowRight aria-hidden="true" /></Link></section>
    </>
  );
}

function ProbeRadar() {
  return (
    <div className="sc-radar" aria-hidden="true">
      <div className="sc-orbits"><i /><i /><i /><b /></div>
      <div className="sc-radar-core"><Crosshair /><span>YOUR SIGNAL</span></div>
      {PLATFORMS.map((platform) => <div className={`sc-node ${platform.position}`} key={platform.name}><span>{platform.id}</span><b>{platform.name}</b><i /></div>)}
      <div className="sc-sweep" />
    </div>
  );
}

function ScanningState({ query, competitor }: { query: string; competitor: string }) {
  return (
    <div className="sc-scanning" role="status" aria-live="polite">
      <div className="sc-scan-field" aria-hidden="true"><div className="sc-scan-ring"><Crosshair /></div><i /></div>
      <span>QUERY LOCKED</span>
      <h2>{query}</h2>
      {competitor && <p>Контрольная точка: {competitor}</p>}
      <div className="sc-progress">
        {PLATFORMS.map((platform, index) => <div key={platform.name} style={{ animationDelay: `${index * 1.2}s` }}><span>{platform.id}</span><b>{platform.name}</b><i /></div>)}
      </div>
      <small>Собираем ответы и сравниваем позиции. Не закрывайте страницу.</small>
    </div>
  );
}
