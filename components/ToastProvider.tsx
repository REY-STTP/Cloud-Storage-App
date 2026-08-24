// components/ToastProvider.tsx
// Thin wrapper around sonner that keeps the app-wide showToast(type, message) API.
"use client";

import {
  createContext,
  useContext,
  useCallback,
  ReactNode,
} from "react";
import { toast } from "sonner";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const showToast = useCallback((type: ToastType, message: string) => {
    toast[type](message);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
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
