import type { STTOptions, STTProvider } from "./index.js";

const YANDEX_STT_URL = "https://stt.api.cloud.yandex.net/speech/v1/stt:recognize";

export class YandexSTTProvider implements STTProvider {
  readonly name = "yandex-stt";
  private apiKey: string;
  private folderId: string;

  constructor() {
    this.apiKey = process.env.YANDEX_API_KEY || "";
    this.folderId = process.env.YANDEX_FOLDER_ID || "";
  }

  async transcribe(audio: Buffer, options?: STTOptions): Promise<string> {
    const lang = options?.language || "ru-RU";

    const response = await fetch(`${YANDEX_STT_URL}?lang=${lang}&folderId=${this.folderId}`, {
      method: "POST",
      headers: {
        Authorization: `Api-Key ${this.apiKey}`,
        "Content-Type": "audio/ogg",
      },
      body: new Uint8Array(audio),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Yandex STT error ${response.status}: ${error}`);
    }

    const data = await response.json() as { result: string };
    return data.result;
  }
}
