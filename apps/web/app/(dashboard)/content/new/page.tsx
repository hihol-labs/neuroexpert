"use client";

import { useState, useRef, useCallback } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

type RecordingState = "idle" | "recording" | "uploading" | "analyzing" | "followup" | "done" | "error";

interface FollowUp {
  questions: string[];
  is_complete: boolean;
  reason?: string;
}

export default function ContentNewPage() {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

  const uploadAudio = useCallback(async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("duration", String(durationRef.current));

      const res = await fetch("/api/voice", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Ошибка сервера" }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const recordingId = data.voice_recording_id as string | undefined;
      setResult(data.message || "Запись отправлена!");

      // Try to get follow-up questions
      if (recordingId) {
        setState("analyzing");
        try {
          const fuRes = await fetch("/api/voice-followup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voice_recording_id: recordingId }),
          });

          if (fuRes.ok) {
            const fuData = await fuRes.json() as FollowUp;
            if (fuData.questions?.length > 0 && !fuData.is_complete) {
              setFollowUp(fuData);
              setState("followup");
              return;
            }
          }
        } catch {
          // Follow-up is optional, don't block
        }
      }

      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
      setState("error");
    }
  }, []);

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
      durationRef.current = 0;
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => {
          const next = d + 1;
          durationRef.current = next;
          return next;
        });
      }, 1000);
    } catch {
      setError("Нет доступа к микрофону. Разрешите в настройках браузера.");
      setState("error");
    }
  }, [uploadAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
      setState("uploading");
    }
  }, []);

  const skipFollowUp = () => {
    setState("done");
  };

  const recordMore = () => {
    setFollowUp(null);
    setState("idle");
    durationRef.current = 0;
    setDuration(0);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-left mb-4">
          <Breadcrumbs items={[
            { label: "Контент", href: "/content" },
            { label: "Новая запись" },
          ]} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Запись ответа</h1>
        <p className="text-gray-500 mb-8">
          Запишите голосовой ответ (3-10 минут). Мы создадим 5 форматов
          контента.
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
              <span className="text-white text-2xl font-mono">
                {formatTime(duration)}
              </span>
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

        {state === "analyzing" && (
          <div>
            <div className="w-24 h-24 rounded-full bg-purple-500 animate-pulse mx-auto flex items-center justify-center mb-4">
              <span className="text-white text-2xl">🤖</span>
            </div>
            <p className="text-gray-600 font-medium">AI-ассистент анализирует ответ...</p>
            <p className="text-gray-500 text-sm mt-1">Проверяем полноту и глубину</p>
          </div>
        )}

        {state === "followup" && followUp && (
          <div className="text-left">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🤖</span>
              <h2 className="font-semibold text-gray-900">
                AI-ассистент рекомендует дополнить
              </h2>
            </div>

            {followUp.reason && (
              <p className="text-sm text-gray-500 mb-4">{followUp.reason}</p>
            )}

            <div className="space-y-3 mb-6">
              {followUp.questions.map((q, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3"
                >
                  <span className="text-blue-500 font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm text-blue-900">{q}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={recordMore}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Дозаписать ответ
              </button>
              <button
                onClick={skipFollowUp}
                className="px-4 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Пропустить
              </button>
            </div>
          </div>
        )}

        {state === "done" && (
          <div>
            <div className="w-24 h-24 rounded-full bg-green-500 mx-auto flex items-center justify-center mb-4">
              <span className="text-white text-3xl">✓</span>
            </div>
            <p className="text-green-700 font-medium mb-4">{result}</p>
            <p className="text-gray-500 text-sm mb-4">
              AI создаёт 5 форматов контента. Это займёт несколько минут.
            </p>
            <button
              onClick={() => {
                setState("idle");
                setDuration(0);
                setResult("");
                setFollowUp(null);
              }}
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
              onClick={() => {
                setState("idle");
                setError("");
              }}
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
