"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastOptions {
  type?: ToastType;
  message: string;
}

interface ToastRecord extends ToastOptions {
  id: number;
}

const ToastContext = createContext<{
  showToast: (options: ToastOptions) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx.showToast;
}

const toneStyles: Record<
  ToastType,
  { wrapper: string; icon: JSX.Element }
> = {
  success: {
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: <CheckCircle2 size={18} />,
  },
  error: {
    wrapper: "border-rose-200 bg-rose-50 text-rose-700",
    icon: <AlertTriangle size={18} />,
  },
  info: {
    wrapper: "border-sky-200 bg-sky-50 text-sky-700",
    icon: <Info size={18} />,
  },
};

export default function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    const id = Date.now();
    const toast: ToastRecord = { id, type: options.type ?? "info", message: options.message };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => removeToast(id), 4500);
  }, [removeToast]);

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {mounted &&
        createPortal(
          <div className="pointer-events-none fixed top-6 right-6 z-[2500] flex flex-col gap-3">
            {toasts.map((toast) => {
              const tone = toneStyles[toast.type ?? "info"];
              return (
                <div
                  key={toast.id}
                  className={`pointer-events-auto flex min-w-[240px] items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xl ${tone.wrapper}`}
                >
                  <span className="shrink-0">{tone.icon}</span>
                  <p className="flex-1 leading-tight">{toast.message}</p>
                  <button
                    type="button"
                    onClick={() => removeToast(toast.id)}
                    className="text-xs font-semibold uppercase tracking-wide opacity-60 transition hover:opacity-100"
                  >
                    Tutup
                  </button>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
