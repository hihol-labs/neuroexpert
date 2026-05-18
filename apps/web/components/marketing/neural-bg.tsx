"use client";

import { useEffect, useRef, useCallback } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  opacity: number;
  pulseSpeed: number;
  pulsePhase: number;
  color: [number, number, number];
  isHub: boolean;
}

const COLORS: [number, number, number][] = [
  [37, 99, 235],
  [71, 85, 105],
  [14, 165, 233],
  [15, 23, 42],
  [100, 116, 139],
];

const CONNECTION_DIST = 160;
const CONNECTION_DIST_SQ = CONNECTION_DIST * CONNECTION_DIST;
const HUB_DIST = CONNECTION_DIST * 1.5;
const HUB_DIST_SQ = HUB_DIST * HUB_DIST;
const MOUSE_RADIUS = 200;
const MOUSE_RADIUS_SQ = MOUSE_RADIUS * MOUSE_RADIUS;

export function NeuralBackground({ className = "", nodeCount = 90, hubCount = 6 }: { className?: string; nodeCount?: number; hubCount?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });

  const initNodes = useCallback((w: number, h: number) => {
    // Adaptive node count: halve on mobile (≤767px) to cut O(n²) connection cost ~6x.
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
    const nc = isMobile ? Math.min(nodeCount, 60) : nodeCount;
    const hc = isMobile ? Math.min(hubCount, 4) : hubCount;

    const nodes: Node[] = [];
    for (let i = 0; i < hc; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: 4,
        baseRadius: 4,
        opacity: 0.45,
        pulseSpeed: Math.random() * 0.015 + 0.008,
        pulsePhase: Math.random() * Math.PI * 2,
        color: COLORS[i % COLORS.length],
        isHub: true,
      });
    }
    for (let i = 0; i < nc - hc; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 1.5 + 0.8,
        baseRadius: Math.random() * 1.5 + 0.8,
        opacity: Math.random() * 0.12 + 0.12,
        pulseSpeed: Math.random() * 0.025 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        isHub: false,
      });
    }
    nodesRef.current = nodes;
  }, [nodeCount, hubCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Pause animation when tab hidden — saves CPU and prevents Lighthouse TBT hit.
    let paused = false;

    function resize() {
      if (!canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
    }

    function animate() {
      if (!ctx || paused) return;
      const { w, h } = sizeRef.current;
      if (w === 0) return;

      const nodes = nodesRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.clearRect(0, 0, w, h);

      // Update positions
      for (const node of nodes) {
        node.pulsePhase += node.pulseSpeed;

        // Mouse attraction — compare squared distances first, sqrt only when node is in range.
        const dmx = mx - node.x;
        const dmy = my - node.y;
        const mouseDistSq = dmx * dmx + dmy * dmy;
        if (mouseDistSq < MOUSE_RADIUS_SQ && mouseDistSq > 1) {
          const mouseDist = Math.sqrt(mouseDistSq);
          const force = (1 - mouseDist / MOUSE_RADIUS) * 0.6;
          node.vx += (dmx / mouseDist) * force;
          node.vy += (dmy / mouseDist) * force;
          node.radius = node.baseRadius * (1 + force * 2);
        } else {
          node.radius += (node.baseRadius - node.radius) * 0.05;
        }

        // Ambient drift — slow organic movement even without mouse
        const driftAngle = node.pulsePhase * 0.7;
        const driftForce = node.isHub ? 0.0015 : 0.003;
        node.vx += Math.cos(driftAngle) * driftForce;
        node.vy += Math.sin(driftAngle) * driftForce;

        node.vx *= 0.985;
        node.vy *= 0.985;
        // Squared-speed compare; sqrt only when clamping needed.
        const speedSq = node.vx * node.vx + node.vy * node.vy;
        const maxSpeed = node.isHub ? 0.5 : 1.0;
        if (speedSq > maxSpeed * maxSpeed) {
          const speed = Math.sqrt(speedSq);
          node.vx = (node.vx / speed) * maxSpeed;
          node.vy = (node.vy / speed) * maxSpeed;
        }

        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0) { node.x = 0; node.vx *= -1; }
        if (node.x > w) { node.x = w; node.vx *= -1; }
        if (node.y < 0) { node.y = 0; node.vy *= -1; }
        if (node.y > h) { node.y = h; node.vy *= -1; }
      }

      // Connections — sqrt only for pairs that pass the squared-distance gate (~15% of pairs).
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distSq = dx * dx + dy * dy;
          const isHubPair = nodes[i].isHub || nodes[j].isHub;
          const maxDistSq = isHubPair ? HUB_DIST_SQ : CONNECTION_DIST_SQ;

          if (distSq < maxDistSq) {
            const maxDist = isHubPair ? HUB_DIST : CONNECTION_DIST;
            const dist = Math.sqrt(distSq);
            const opacity = (1 - dist / maxDist) * 0.16;
            const pulse = Math.sin(nodes[i].pulsePhase + nodes[j].pulsePhase) * 0.3 + 0.7;
            const [r, g, b] = nodes[i].isHub ? nodes[i].color : nodes[j].color;

            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(${r},${g},${b},${opacity * pulse})`;
            ctx.lineWidth = (nodes[i].isHub && nodes[j].isHub) ? 1.5 : 0.8;
            ctx.stroke();
          }
        }
      }

      // Nodes
      for (const node of nodes) {
        const pulse = Math.sin(node.pulsePhase) * 0.5 + 0.5;
        const [r, g, b] = node.color;

        if (node.isHub) {
          const glowSize = node.radius * (2.5 + pulse * 2);
          const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowSize);
          grad.addColorStop(0, `rgba(${r},${g},${b},${0.12 + pulse * 0.08})`);
          grad.addColorStop(0.4, `rgba(${r},${g},${b},${0.04 + pulse * 0.03})`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.beginPath();
          ctx.arc(node.x, node.y, glowSize, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * (1 + pulse * 0.3), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},0.55)`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * (2.5 + pulse * 1.5), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.04 + pulse * 0.04})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        } else {
          const glowSize = node.radius * (2 + pulse * 1.5);
          const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowSize);
          grad.addColorStop(0, `rgba(${r},${g},${b},${node.opacity * (0.35 + pulse * 0.2)})`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.beginPath();
          ctx.arc(node.x, node.y, glowSize, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${Math.min(r + 40, 255)},${Math.min(g + 40, 255)},${Math.min(b + 40, 255)},${node.opacity * (0.55 + pulse * 0.15)})`;
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    function onVisibilityChange() {
      if (document.hidden) {
        paused = true;
        cancelAnimationFrame(rafRef.current);
      } else if (paused) {
        paused = false;
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    // Mouse tracking on window (not canvas — canvas has pointer-events: none)
    function onMouseMove(e: MouseEvent) {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    }
    function onMouseLeave() {
      mouseRef.current = { x: -1000, y: -1000 };
    }

    function onResize() {
      resize();
      initNodes(sizeRef.current.w, sizeRef.current.h);
    }

    resize();
    initNodes(sizeRef.current.w, sizeRef.current.h);
    rafRef.current = requestAnimationFrame(animate);

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [initNodes]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 ${className}`}
      style={{ pointerEvents: "none" }}
    />
  );
}
