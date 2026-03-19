"use client";

import { useState, useCallback, createContext, useContext } from "react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({
  confirm: () => Promise.resolve(false),
});

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolve, setResolve] = useState<((value: boolean) => void) | null>(null);

  const confirmFn = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((res) => {
      setOptions(opts);
      setResolve(() => res);
    });
  }, []);

  const handleClose = (result: boolean) => {
    resolve?.(result);
    setOptions(null);
    setResolve(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm: confirmFn }}>
      {children}
      {options && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => handleClose(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" role="dialog" aria-modal="true">
            <h3 className="text-lg font-semibold text-gray-900">{options.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{options.message}</p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => handleClose(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {options.cancelText ?? "Отмена"}
              </button>
              <button
                onClick={() => handleClose(true)}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                  options.variant === "danger"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {options.confirmText ?? "Подтвердить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
