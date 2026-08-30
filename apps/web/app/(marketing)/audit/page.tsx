"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Minus, Radio, RotateCcw } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/nav";
import { OfferBlock } from "@/components/marketing/offer";

const NICHES = [
  ["a0000000-0000-0000-0000-000000000001", "Психология и психотерапия", true],
  ["a0000000-0000-0000-0000-000000000002", "Юриспруденция", true],
  ["a0000000-0000-0000-0000-000000000003", "Нутрициология", true],
  ["a0000000-0000-0000-0000-000000000004", "Финансы и инвестиции", true],
  ["a0000000-0000-0000-0000-000000000005", "Бизнес-консалтинг", true],
  ["a0000000-0000-0000-0000-000000000006", "Медицина и здоровье", false],
  ["a0000000-0000-0000-0000-000000000007", "Фитнес и спорт", false],
  ["a0000000-0000-0000-0000-000000000008", "Образование и репетиторство", false],
  ["a0000000-0000-0000-0000-000000000009", "Маркетинг и SMM", false],
  ["a0000000-0000-0000-0000-000000000010", "IT и программирование", false],
  ["a0000000-0000-0000-0000-000000000011", "Дизайн и архитектура", false],
  ["a0000000-0000-0000-0000-000000000012", "Недвижимость", false],
  ["a0000000-0000-0000-0000-000000000013", "Карьера и HR", false],
  ["a0000000-0000-0000-0000-000000000014", "Косметология и эстетика", false],
  ["a0000000-0000-0000-0000-000000000015", "Логопедия и дефектология", false],
  ["a0000000-0000-0000-0000-000000000016", "Коучинг и саморазвитие", false],
  ["a0000000-0000-0000-0000-000000000017", "Бухгалтерия и аудит", false],
  ["a0000000-0000-0000-0000-000000000018", "Ветеринария", false],
  ["a0000000-0000-0000-0000-000000000019", "Страхование", false],
  ["a0000000-0000-0000-0000-000000000020", "Туризм и путешествия", false],
] as const;

const MARKERS = [
  ["has_expert_name", "Имя эксперта"],
  ["has_specific_examples", "Примеры"],
  ["has_source_link", "Источник"],
  ["has_specific_numbers", "Цифры"],
] as const;

interface PlatformResult {
  platform: string;
  ai_response: string;
  gap_score: number;
  markers: Record<(typeof MARKERS)[number][0], boolean>;
  weakness: string;
}

interface Gap {
  id: string;
  question: string;
  search_intent?: string;
  avg_gap_score: number;
  estimated_monthly_volume?: number;
  platforms: PlatformResult[];
}

type Step = "select" | "loading" | "results" | "error";

export default function AuditPage() {
  const [step, setStep] = useState<Step>("select");
  const [nicheName, setNicheName] = useState("");
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [error, setError] = useState("");
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const firstNicheRef = useRef<HTMLButtonElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  async function selectNiche(nicheId: string, name: string) {
    setNicheName(name);
    setStep("loading");
    setError("");

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche_id: nicheId, type: "free" }),
      });

      if (response.status === 429) {
        setError("Слишком много запросов. Подождите минуту и попробуйте снова.");
        setStep("error");
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Не удалось собрать карту спроса");
        setStep("error");
        return;
      }

      const data = await response.json();
      setGaps(data.gaps);
      setStep("results");
      requestAnimationFrame(() => resultHeadingRef.current?.focus());
    } catch {
      setError("Сеть не ответила. Попробуйте ещё раз.");
      setStep("error");
    }
  }

  function reset() {
    setStep("select");
    setGaps([]);
    setError("");
    setExpandedPlatform(null);
    requestAnimationFrame(() => firstNicheRef.current?.focus());
  }

  return (
    <div className="sr-site dm-site">
      <MarketingHeader />
      <main>
        {step === "select" && <NicheIndex onSelect={selectNiche} firstRef={firstNicheRef} />}
        {step === "loading" && <DemandLoading niche={nicheName} />}
        {step === "results" && <DemandResults niche={nicheName} gaps={gaps} expanded={expandedPlatform} headingRef={resultHeadingRef} onToggle={(key) => setExpandedPlatform(expandedPlatform === key ? null : key)} onReset={reset} />}
        {step === "error" && <DemandError message={error} onRetry={reset} />}
        {/* Оффер идёт ПОСЛЕ степ-блока: единственный h1 страницы живёт внутри него,
            а h2 оффера выше h1 ломает переход скринридера по заголовкам. */}
        <OfferBlock
          artifact="Карта спроса с приоритетами по вашей нише"
          price="7 900 ₽"
          term="3–7 дней"
          cta={{ href: "/launch?package=audit_start", label: "Заказать карту спроса" }}
          note="Карта на этой странице — бесплатная. 7 900 ₽ — расширенный разбор пакета «Аудит Старт»."
        />
        {/* Шаг оплаты живёт в ПОСТОЯННОЙ части страницы: блок результатов
            рендерится только после выбора ниши, и ссылка внутри него не
            попадает в серверный HTML — воронка обрывалась бы там, где её
            проверяют. */}
        <p className="dm-pay-note">
          Объём работ уже согласован? <Link href="/pay">Счёт, оплата и документы</Link>
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}

function NicheIndex({ onSelect, firstRef }: { onSelect: (id: string, name: string) => void; firstRef: React.RefObject<HTMLButtonElement> }) {
  return (
    <section className="dm-index">
      <div className="dm-index-copy">
        <div className="sr-index"><span>01</span><span>Demand Map</span></div>
        <p className="sr-eyebrow"><span /> Free market scan</p>
        <h1>Найдите <em>незакрытый спрос</em> своей ниши.</h1>
        <p>Карта показывает вопросы, где клиент уже ищет решение, а ответы нейросетей остаются слабыми.</p>
        <div className="dm-index-legend"><span><i /> Высокая плотность данных</span><span><i /> Базовое покрытие</span></div>
      </div>
      <div className="dm-niches">
        <header><span>NICHE INDEX / 20</span><span>SELECT FIELD</span></header>
        <div className="dm-niche-grid">
          {NICHES.map(([id, name, focus], index) => (
            <button ref={index === 0 ? firstRef : undefined} type="button" key={id} onClick={() => onSelect(id, name)} className={focus ? "is-focus" : ""}>
              <span>{String(index + 1).padStart(2, "0")}</span><b>{name}</b><i>{focus ? "dense" : "open"}</i><ArrowRight aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function DemandLoading({ niche }: { niche: string }) {
  return (
    <section className="dm-loading" role="status" aria-live="polite">
      <div className="dm-loading-copy">
        <p className="sr-eyebrow"><span /> Field selected</p>
        <h1>{niche}</h1>
        <p>Собираем вопросы, читаем ответы подключённых ИИ-платформ и оцениваем коммерческую плотность сигнала.</p>
        <div><span>STATUS</span><b>BUILDING MAP</b></div>
      </div>
      <div className="dm-field" aria-hidden="true">
        <header><span>DEMAND FIELD</span><span>LIVE</span></header>
        <div className="dm-field-grid">{Array.from({ length: 40 }, (_, index) => <i key={index} style={{ animationDelay: `${(index % 8) * 120}ms` }} />)}<b /></div>
        <div className="dm-field-readout"><span>questions</span><b>collecting</b><span>platforms</span><b>polling</b><span>intent</span><b>mapping</b></div>
      </div>
    </section>
  );
}

function DemandError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="dm-error" role="alert">
      <Radio aria-hidden="true" /><span>FIELD INTERRUPTED</span><h1>Карта не собрана.</h1><p>{message}</p>
      <button type="button" onClick={onRetry}><RotateCcw aria-hidden="true" /> Выбрать нишу снова</button>
    </section>
  );
}

function DemandResults({ niche, gaps, expanded, headingRef, onToggle, onReset }: { niche: string; gaps: Gap[]; expanded: string | null; headingRef: React.RefObject<HTMLHeadingElement>; onToggle: (key: string) => void; onReset: () => void }) {
  const platformCount = gaps[0]?.platforms.length || 0;
  const totalVolume = gaps.reduce((sum, gap) => sum + (gap.estimated_monthly_volume || 0), 0);
  return (
    <>
      <section className="dm-result-head">
        <p className="sr-only" role="status" aria-live="polite">Карта спроса готова. Найдено вопросов: {gaps.length}.</p>
        <div><p className="sr-eyebrow"><span /> Demand map / ready</p><h1 ref={headingRef} tabIndex={-1}>{niche}</h1><p>Ранжируем не «идеи для контента», а места, где сильный экспертный ответ может стать точкой входа.</p></div>
        <div className="dm-result-summary"><article><span>Вопросы</span><b>{String(gaps.length).padStart(2, "0")}</b></article><article><span>Платформы</span><b>{String(platformCount).padStart(2, "0")}</b></article><article><span>Оценка спроса / мес</span><b>{totalVolume ? totalVolume.toLocaleString("ru-RU") : "—"}</b></article></div>
        <p className="dm-result-note">Оценка по типу запроса: точные частоты подставляются, когда доступны данные Wordstat.</p>
      </section>

      <section className="dm-gap-section">
        <header><span>№ / Opportunity</span><span>Intent</span><span>Volume</span><span>Gap</span></header>
        <div className="dm-gap-list">
          {gaps.map((gap, index) => <GapRow gap={gap} index={index} key={gap.id} expanded={expanded} onToggle={onToggle} />)}
        </div>
      </section>

      <section className="dm-result-cta">
        <div><p>Из вопроса — в точку входа</p><h2>Ответьте голосом. Систему соберём мы.</h2></div>
        <Link className="sr-button sr-button-light" href="/launch">Получить план запуска <ArrowRight aria-hidden="true" /></Link>
        <button type="button" onClick={onReset}>Выбрать другую нишу</button>
        <p className="dm-result-cta-note">Объём согласован? <Link href="/pay">Счёт, оплата и документы</Link></p>
      </section>
    </>
  );
}

function GapRow({ gap, index, expanded, onToggle }: { gap: Gap; index: number; expanded: string | null; onToggle: (key: string) => void }) {
  return (
    <article className="dm-gap">
      <div className="dm-gap-main"><span>{String(index + 1).padStart(2, "0")}</span><h2>{gap.question}</h2><IntentLabel intent={gap.search_intent} /><b>{gap.estimated_monthly_volume?.toLocaleString("ru-RU") || "—"}</b><Score value={gap.avg_gap_score} /></div>
      <div className="dm-platforms">
        {gap.platforms.map((platform) => {
          const key = `${gap.id}-${platform.platform}`;
          const isOpen = expanded === key;
          const detailId = `platform-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
          return (
            <div className="dm-platform" key={key}>
              <button type="button" aria-expanded={isOpen} aria-controls={detailId} onClick={() => onToggle(key)}>
                <span>{platform.platform}</span><b>{platform.weakness || "Ответ требует усиления"}</b>
                <span className="dm-marker-set">{MARKERS.map(([marker, label]) => <i key={marker} title={label} aria-label={`${label}: ${platform.markers[marker] ? "есть" : "нет"}`}>{platform.markers[marker] ? <Check /> : <Minus />}</i>)}</span>
                <Score value={platform.gap_score} /><ChevronDown aria-hidden="true" />
              </button>
              {isOpen && <div className="dm-platform-detail" id={detailId}><span>Ответ {platform.platform} / live</span><p>{platform.ai_response}</p></div>}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function Score({ value }: { value: number }) {
  const band = value >= 8 ? "high" : value >= 5 ? "medium" : "low";
  return <strong className={`dm-score dm-score-${band}`}><span>{value}</span><small>/10</small></strong>;
}

function IntentLabel({ intent }: { intent?: string }) {
  const label = intent === "commercial" ? "commercial" : intent === "transactional" ? "transaction" : "information";
  return <em>{label}</em>;
}
