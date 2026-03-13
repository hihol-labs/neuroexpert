// STT (Speech-to-Text) Abstraction Layer

export interface STTOptions {
  language?: string;
  model?: string;
}

export interface STTProvider {
  readonly name: string;
  transcribe(audio: Buffer, options?: STTOptions): Promise<string>;
}

export type STTProviderType = "whisper" | "yandex-stt";

export function createSTTProvider(provider: STTProviderType): STTProvider {
  switch (provider) {
    case "whisper": {
      const { WhisperSTTProvider } = require("./whisper.js") as typeof import("./whisper.js");
      return new WhisperSTTProvider();
    }
    case "yandex-stt": {
      const { YandexSTTProvider } = require("./yandex-stt.js") as typeof import("./yandex-stt.js");
      return new YandexSTTProvider();
    }
    default:
      throw new Error(`Unknown STT provider: ${provider}`);
  }
}

export function getSTT(): { primary: STTProvider; fallback: STTProvider } {
  const primaryType = (process.env.STT_PRIMARY_PROVIDER || "whisper") as STTProviderType;
  const fallbackType = (process.env.STT_FALLBACK_PROVIDER || "yandex-stt") as STTProviderType;

  return {
    primary: createSTTProvider(primaryType),
    fallback: createSTTProvider(fallbackType),
  };
}
