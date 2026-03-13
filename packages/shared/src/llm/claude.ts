import Anthropic from "@anthropic-ai/sdk";
import type { LLMOptions, LLMProvider } from "./index.js";

export class ClaudeLLMProvider implements LLMProvider {
  readonly name = "claude";
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateText(prompt: string, options?: LLMOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: options?.model || "claude-sonnet-4-20250514",
      max_tokens: options?.maxTokens || 2048,
      temperature: options?.temperature ?? 0.3,
      system: options?.systemPrompt || "",
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    if (block.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }
    return block.text;
  }

  async generateJSON<T = unknown>(prompt: string, options?: LLMOptions): Promise<T> {
    const jsonPrompt = `${prompt}\n\nОтветь ТОЛЬКО валидным JSON, без markdown-обёртки.`;
    const text = await this.generateText(jsonPrompt, options);

    const cleaned = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
    return JSON.parse(cleaned) as T;
  }
}
