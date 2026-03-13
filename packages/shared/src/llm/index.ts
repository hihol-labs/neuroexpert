// LLM Abstraction Layer

export interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface LLMProvider {
  readonly name: string;
  generateText(prompt: string, options?: LLMOptions): Promise<string>;
  generateJSON<T = unknown>(prompt: string, options?: LLMOptions): Promise<T>;
}

export type LLMProviderType = "claude" | "openai" | "yandexgpt" | "gigachat";

export function createLLMProvider(provider: LLMProviderType): LLMProvider {
  switch (provider) {
    case "claude": {
      const { ClaudeLLMProvider } = require("./claude.js") as typeof import("./claude.js");
      return new ClaudeLLMProvider();
    }
    case "openai": {
      const { OpenAILLMProvider } = require("./openai.js") as typeof import("./openai.js");
      return new OpenAILLMProvider();
    }
    case "yandexgpt": {
      const { YandexGPTLLMProvider } = require("./yandexgpt.js") as typeof import("./yandexgpt.js");
      return new YandexGPTLLMProvider();
    }
    case "gigachat": {
      const { GigaChatLLMProvider } = require("./gigachat.js") as typeof import("./gigachat.js");
      return new GigaChatLLMProvider();
    }
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

export function getLLM(): { primary: LLMProvider; fallback: LLMProvider } {
  const primaryType = (process.env.LLM_PRIMARY_PROVIDER || "claude") as LLMProviderType;
  const fallbackType = (process.env.LLM_FALLBACK_PROVIDER || "openai") as LLMProviderType;

  return {
    primary: createLLMProvider(primaryType),
    fallback: createLLMProvider(fallbackType),
  };
}
