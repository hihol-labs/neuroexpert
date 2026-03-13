import type { LLMOptions, LLMProvider } from "./index.js";

const YANDEXGPT_API = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";

export class YandexGPTLLMProvider implements LLMProvider {
  readonly name = "yandexgpt";
  private apiKey: string;
  private folderId: string;

  constructor() {
    this.apiKey = process.env.YANDEX_API_KEY || "";
    this.folderId = process.env.YANDEX_FOLDER_ID || "";
  }

  async generateText(prompt: string, options?: LLMOptions): Promise<string> {
    const model = options?.model || `gpt://${this.folderId}/yandexgpt/latest`;

    const messages = [];
    if (options?.systemPrompt) {
      messages.push({ role: "system", text: options.systemPrompt });
    }
    messages.push({ role: "user", text: prompt });

    const response = await fetch(YANDEXGPT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Api-Key ${this.apiKey}`,
        "x-folder-id": this.folderId,
      },
      body: JSON.stringify({
        modelUri: model,
        completionOptions: {
          maxTokens: options?.maxTokens || 2048,
          temperature: options?.temperature ?? 0.3,
        },
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`YandexGPT error ${response.status}: ${error}`);
    }

    const data = await response.json() as {
      result: { alternatives: Array<{ message: { text: string } }> };
    };
    return data.result.alternatives[0]?.message?.text || "";
  }

  async generateJSON<T = unknown>(prompt: string, options?: LLMOptions): Promise<T> {
    const jsonPrompt = `${prompt}\n\nОтветь ТОЛЬКО валидным JSON, без markdown-обёртки.`;
    const text = await this.generateText(jsonPrompt, options);

    const cleaned = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
    return JSON.parse(cleaned) as T;
  }
}
