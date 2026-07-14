"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ── Toast ─────────────────────────────────────────────────────────────────
// Transient status messages. Mount <ToastProvider> once near the root of
// whatever subtree needs it, then call useToast() anywhere inside to show one.
// Auto-dismisses; announced via aria-live so screen-reader users hear it
// without focus having to move.

export type ToastVariant = "neutral" | "success" | "danger";

interface ToastItem {
  id:       number;
  message:  string;
  variant:  ToastVariant;
}

interface ToastContextValue {
  show: (message: string, options?: { variant?: ToastVariant; durationMs?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_CLS: Record<ToastVariant, string> = {
  neutral: "bg-ink text-canvas",
  success: "bg-success text-white",
  danger:  "bg-danger text-white",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const nextId = useRef(0);

  useEffect(() => setMounted(true), []);

  const show = useCallback((message: string, options?: { variant?: ToastVariant; durationMs?: number }) => {
    const id = nextId.current++;
    const variant = options?.variant ?? "neutral";
    const durationMs = options?.durationMs ?? 3200;
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, durationMs);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {mounted && createPortal(
        <div
          className="fixed bottom-4 inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none"
          aria-live="polite"
          aria-atomic="true"
        >
          {toasts.map(t => (
            <div
              key={t.id}
              role="status"
              className={`
                pointer-events-auto max-w-sm px-4 py-2.5 rounded-xl shadow-float
                type-body-md
                transition-opacity duration-normal
                ${VARIANT_CLS[t.variant]}
              `}
            >
              {t.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() must be called within a <ToastProvider>");
  }
  return ctx;
}
