"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">500</h1>
        <p className="mt-4 text-lg text-gray-600">Что-то пошло не так</p>
        <button
          onClick={reset}
          className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
}
