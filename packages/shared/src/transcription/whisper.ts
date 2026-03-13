import OpenAI from "openai";
import type { STTOptions, STTProvider } from "./index.js";

export class WhisperSTTProvider implements STTProvider {
  readonly name = "whisper";
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
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
