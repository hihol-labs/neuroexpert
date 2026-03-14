"use client";

import { useState, useRef, useCallback } from "react";

type RecordingState = "idle" | "recording" | "uploading" | "done" | "error";

export default function ContentNewPage() {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunks.current, { type: recorder.mimeType });
        await uploadAudio(blob);
      };

      recorder.start(1000);
      mediaRecorder.current = recorder;
      setState("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      setError("Нет доступа к микрофону. Разрешите в настройках браузера.");
      setState("error");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
      setState("uploading");
    }
  }, []);

  const uploadAudio = async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const res = await fetch("/api/voice", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Ошибка сервера" }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data.message || "Запись отправлена на обработку!");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
      setState("error");
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-2">Запись ответа</h1>
        <p className="text-gray-500 mb-8">
          Запишите голосовой ответ (3–10 минут). Мы создадим 5 форматов контента.
        </p>

        {state === "idle" && (
          <button
            onClick={startRecording}
            className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 text-white text-lg font-medium mx-auto flex items-center justify-center transition-colors"
          >
            REC
          </button>
        )}

        {state === "recording" && (
          <div>
            <div className="w-24 h-24 rounded-full bg-red-500 animate-pulse mx-auto flex items-center justify-center mb-4">
              <span className="text-white text-2xl font-mono">{formatTime(duration)}</span>
            </div>
            <button
              onClick={stopRecording}
              className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              Остановить запись
            </button>
          </div>
        )}

        {state === "uploading" && (
          <div>
            <div className="w-24 h-24 rounded-full bg-blue-500 animate-pulse mx-auto flex items-center justify-center mb-4">
              <span className="text-white text-sm">Загрузка...</span>
            </div>
            <p className="text-gray-500">Отправляем запись на обработку</p>
          </div>
        )}

        {state === "done" && (
          <div>
            <div className="w-24 h-24 rounded-full bg-green-500 mx-auto flex items-center justify-center mb-4">
              <span className="text-white text-3xl">✓</span>
            </div>
            <p className="text-green-700 font-medium mb-4">{result}</p>
            <button
              onClick={() => { setState("idle"); setDuration(0); setResult(""); }}
              className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              Записать ещё
            </button>
          </div>
        )}

        {state === "error" && (
          <div>
            <div className="w-24 h-24 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
              <span className="text-red-500 text-3xl">✕</span>
            </div>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => { setState("idle"); setError(""); }}
              className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
