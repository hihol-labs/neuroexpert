import { ProxyAgent, fetch as undiciFetch } from "undici";

let cachedDispatcher: ProxyAgent | undefined;
let cachedUrl: string | undefined;
let warnedMissing = false;
let infoedFallback = false;

function getDispatcher(): ProxyAgent | undefined {
  const tgUrl = process.env.TG_PROXY_URL;
  const url = tgUrl || process.env.OPENAI_PROXY_URL;
  if (!url) {
    if (!warnedMissing) {
      console.warn("[tgFetch] TG_PROXY_URL not set — Telegram calls go direct (may fail in RU datacenters that block api.telegram.org)");
      warnedMissing = true;
    }
    return undefined;
  }
  if (!tgUrl && !infoedFallback) {
    console.info("[tgFetch] TG_PROXY_URL not set — reusing OPENAI_PROXY_URL for Telegram. Set TG_PROXY_URL if you need a separate proxy.");
    infoedFallback = true;
  }
  // Invalidate cache when env var changes (matters for Next.js dev HMR).
  if (url !== cachedUrl) {
    cachedDispatcher = new ProxyAgent(url);
    cachedUrl = url;
  }
  return cachedDispatcher;
}

export async function tgFetch(input: string, init?: RequestInit): Promise<Response> {
  const dispatcher = getDispatcher();
  if (!dispatcher) return fetch(input, init);
  // `init as any`: undici RequestInit ≠ DOM RequestInit at the type level but runtime-compatible.
  return undiciFetch(input, { ...(init as any), dispatcher }) as unknown as Response;
}
