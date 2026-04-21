import OpenAI from "openai";
import type { LLMOptions, LLMProvider } from "./index.js";

export class OpenAILLMProvider implements LLMProvider {
  readonly name = "openai";
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

  async generateText(prompt: string, options?: LLMOptions): Promise<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (options?.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await this.client.chat.completions.create({
      model: options?.model || "gpt-4o-mini",
      max_tokens: options?.maxTokens || 2048,
      temperature: options?.temperature ?? 0.3,
      messages,
    });

    return response.choices[0]?.message?.content || "";
  }

  async generateJSON<T = unknown>(prompt: string, options?: LLMOptions): Promise<T> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (options?.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await this.client.chat.completions.create({
      model: options?.model || "gpt-4o-mini",
      max_tokens: options?.maxTokens || 2048,
      temperature: options?.temperature ?? 0.3,
      messages,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content || "{}";
    return JSON.parse(text) as T;
  }
}
