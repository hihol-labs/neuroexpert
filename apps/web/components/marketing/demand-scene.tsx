"use client";

import { useEffect, useRef, useState } from "react";

const SOURCES = [
  { x: 0.14, y: 0.28, label: "Карты", value: "742" },
  { x: 0.24, y: 0.72, label: "Поиск", value: "518" },
  { x: 0.76, y: 0.18, label: "Отзывы", value: "207" },
  { x: 0.84, y: 0.66, label: "AI-ответы", value: "96" },
] as const;

const PHASES = ["Обнаруживаем спрос", "Связываем сигналы", "Оцениваем потери", "Формируем действие"];

export function DemandScene() {
  const [canvasRef, phase] = useDemandField();

  return (
    <div className="sr-scene" aria-label="Живая карта локального спроса">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="sr-scene-top">
        <span className="flex items-center gap-2"><span className="sr-live-dot" />LIVE SIGNAL FIELD</span>
        <span>56.8389° N · 60.6057° E</span>
      </div>
      <div className="sr-phase" aria-live="polite"><span>0{phase + 1}</span>{PHASES[phase]}</div>
      <SourceLabels />
      <div className="sr-loss-counter">
        <span>Потеря спроса / 30 дней</span><strong>₽ 428 000</strong><small>расчётный потенциал</small>
      </div>
      <div className="sr-action-card">
        <span>Действие № 01</span><strong>Вернуть 9 обращений без ответа</strong>
        <div><i /> Готово к запуску</div>
      </div>
    </div>
  );
}

function SourceLabels() {
  return (
    <>
      <div className="sr-source-label sr-source-a"><span>Карты</span><strong>742</strong></div>
      <div className="sr-source-label sr-source-b"><span>Поиск</span><strong>518</strong></div>
      <div className="sr-source-label sr-source-c"><span>Отзывы</span><strong>207</strong></div>
      <div className="sr-source-label sr-source-d"><span>AI-ответы</span><strong>96</strong></div>
    </>
  );
}

function useDemandField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let startedAt = performance.now();
    let previousPhase = -1;

    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(rect.height * ratio)) {
        canvas.width = Math.round(rect.width * ratio);
        canvas.height = Math.round(rect.height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);

      const elapsed = reduceMotion.matches ? 11500 : (now - startedAt) % 12000;
      const nextPhase = Math.min(3, Math.floor(elapsed / 3000));
      if (nextPhase !== previousPhase) {
        previousPhase = nextPhase;
        setPhase(nextPhase);
      }

      drawField(context, rect.width, rect.height, elapsed, reduceMotion.matches);
      if (!reduceMotion.matches) frameRef.current = requestAnimationFrame(draw);
    };

    const restart = () => {
      cancelAnimationFrame(frameRef.current || 0);
      startedAt = performance.now();
      draw(startedAt);
    };
    reduceMotion.addEventListener("change", restart);
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      reduceMotion.removeEventListener("change", restart);
      cancelAnimationFrame(frameRef.current || 0);
    };
  }, []);

  return [canvasRef, phase] as const;
}

function drawField(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
  reduced: boolean,
) {
  const accent = "#ff4f2e";
  const steel = "rgba(197, 202, 209, 0.16)";
  const center = { x: width * 0.56, y: height * 0.49 };

  context.lineWidth = 1;
  context.strokeStyle = "rgba(255,255,255,0.055)";
  const grid = width < 600 ? 36 : 52;
  for (let x = 0; x <= width; x += grid) {
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
  }
  for (let y = 0; y <= height; y += grid) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
  }

  context.strokeStyle = steel;
  context.lineWidth = 1.2;
  for (let index = 0; index < 7; index += 1) {
    const offset = (index - 3) * height * 0.105;
    context.beginPath();
    context.moveTo(-20, center.y + offset);
    context.bezierCurveTo(width * 0.25, center.y + offset * 0.3, width * 0.64, center.y + offset * 1.5, width + 20, center.y - offset * 0.4);
    context.stroke();
  }

  const connectProgress = reduced ? 1 : Math.max(0, Math.min(1, (elapsed - 2500) / 3000));
  SOURCES.forEach((source, index) => {
    const point = { x: source.x * width, y: source.y * height };
    const pulse = reduced ? 1 : 1 + Math.sin(elapsed / 380 + index) * 0.25;
    context.fillStyle = accent;
    context.beginPath(); context.arc(point.x, point.y, 3.5, 0, Math.PI * 2); context.fill();
    context.strokeStyle = `rgba(255,79,46,${0.18 + (pulse - 0.75) * 0.4})`;
    context.lineWidth = 1;
    context.beginPath(); context.arc(point.x, point.y, 11 * pulse, 0, Math.PI * 2); context.stroke();

    if (connectProgress > 0) {
      const controlX = point.x + (center.x - point.x) * 0.55;
      const controlY = point.y - (center.y - point.y) * 0.2;
      context.strokeStyle = `rgba(255,79,46,${0.32 + connectProgress * 0.5})`;
      context.lineWidth = 1.5;
      context.setLineDash([4, 7]);
      context.lineDashOffset = reduced ? 0 : -elapsed / 65;
      context.beginPath();
      context.moveTo(point.x, point.y);
      context.quadraticCurveTo(controlX, controlY, point.x + (center.x - point.x) * connectProgress, point.y + (center.y - point.y) * connectProgress);
      context.stroke();
      context.setLineDash([]);
    }
  });

  const centerPulse = reduced ? 1 : 1 + Math.sin(elapsed / 520) * 0.08;
  context.fillStyle = "#f2f0e9";
  context.beginPath(); context.arc(center.x, center.y, 5, 0, Math.PI * 2); context.fill();
  context.strokeStyle = accent;
  context.lineWidth = 1.5;
  context.beginPath(); context.arc(center.x, center.y, 24 * centerPulse, 0, Math.PI * 2); context.stroke();
  context.strokeStyle = "rgba(255,79,46,0.2)";
  context.beginPath(); context.arc(center.x, center.y, 50 * centerPulse, 0, Math.PI * 2); context.stroke();
}
