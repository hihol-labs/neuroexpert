import OpenAI from "openai";
import type { STTOptions, STTProvider } from "./index.js";

export class WhisperSTTProvider implements STTProvider {
  readonly name = "whisper";
  private client: OpenAI;

  constructor() {
    const proxyUrl = process.env.OPENAI_PROXY_URL;
    const clientOptions: ConstructorParameters<typeof OpenAI>[0] = {
      apiKey: process.env.OPENAI_API_KEY,
    };

    if (proxyUrl) {
      const { ProxyAgent, fetch: undiciFetch } = require("undici") as typeof import("undici");
      const dispatcher = new ProxyAgent(proxyUrl);
      clientOptions.fetch = ((url: string, init?: RequestInit) =>
        undiciFetch(url, { ...(init as Parameters<typeof undiciFetch>[1]), dispatcher })) as unknown as typeof fetch;
    }

    this.client = new OpenAI(clientOptions);
  }

  async transcribe(audio: Buffer, options?: STTOptions): Promise<string> {
    const file = new File([new Uint8Array(audio)], "audio.webm", { type: "audio/webm" });

    const response = await this.client.audio.transcriptions.create({
      file,
      model: options?.model || "whisper-1",
      language: options?.language || "ru",
      response_format: "text",
    });

    return response as unknown as string;
  }
}
