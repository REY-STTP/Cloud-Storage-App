// components/ToastProvider.tsx
"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, message }]);

      // Auto close 3 detik
      setTimeout(() => {
        removeToast(id);
      }, 3000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "16px",
        right: "16px",
        left: "16px",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "8px",
          maxWidth: "420px",
          marginLeft: "auto",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`alert alert-${
              toast.type === "success"
                ? "success"
                : toast.type === "error"
                ? "danger"
                : toast.type === "warning"
                ? "warning"
                : "info"
            } alert-dismissible fade show shadow-lg`}
            role="alert"
            style={{
              animation: "slideInRight 0.3s ease-out",
              pointerEvents: "auto",
              width: "100%",
              margin: 0,
            }}
          >
            <div className="d-flex align-items-start">
              <div className="me-2" style={{ fontSize: "1.25rem", lineHeight: 1 }}>
                {toast.type === "success" && "✅"}
                {toast.type === "error" && "❌"}
                {toast.type === "warning" && "⚠️"}
                {toast.type === "info" && "ℹ️"}
              </div>

              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <strong className="d-block mb-1">
                  {toast.type === "success" && "Success"}
                  {toast.type === "error" && "Error"}
                  {toast.type === "warning" && "Warning"}
                  {toast.type === "info" && "Info"}
                </strong>
                <div style={{ fontSize: "0.9rem", wordBreak: "break-word" }}>
                  {toast.message}
                </div>
              </div>

              <button
                type="button"
                className="btn-close ms-2"
                aria-label="Close"
                onClick={() => removeToast(toast.id)}
                style={{ flexShrink: 0 }}
              />
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 576px) {
          .alert {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}
