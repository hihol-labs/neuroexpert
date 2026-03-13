import type { LLMOptions, LLMProvider } from "./index.js";

const GIGACHAT_AUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const GIGACHAT_API_URL = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions";

export class GigaChatLLMProvider implements LLMProvider {
  readonly name = "gigachat";
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    this.clientId = process.env.GIGACHAT_CLIENT_ID || "";
    this.clientSecret = process.env.GIGACHAT_CLIENT_SECRET || "";
  }

  private async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const response = await fetch(GIGACHAT_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Basic ${credentials}`,
        RqUID: crypto.randomUUID(),
      },
      body: "scope=GIGACHAT_API_PERS",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GigaChat auth error ${response.status}: ${error}`);
    }

    const data = await response.json() as { access_token: string; expires_at: number };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = data.expires_at;

    return this.accessToken;
  }

  async generateText(prompt: string, options?: LLMOptions): Promise<string> {
    const token = await this.authenticate();

    const messages = [];
    if (options?.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch(GIGACHAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: options?.model || "GigaChat",
        max_tokens: options?.maxTokens || 2048,
        temperature: options?.temperature ?? 0.3,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GigaChat error ${response.status}: ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content || "";
  }

  async generateJSON<T = unknown>(prompt: string, options?: LLMOptions): Promise<T> {
    const jsonPrompt = `${prompt}\n\nОтветь ТОЛЬКО валидным JSON, без markdown-обёртки.`;
    const text = await this.generateText(jsonPrompt, options);

    const cleaned = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
    return JSON.parse(cleaned) as T;
  }
}
