// components/ConfirmDialogProvider.tsx
// App-wide confirm dialog built on shadcn/ui AlertDialog, keeping the
// promise-based confirm(options) API.
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  ReactNode,
} from "react";
import { CircleAlertIcon, InfoIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | undefined>(
  undefined
);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions({
      cancelLabel: "Cancel",
      confirmLabel: "Confirm",
      danger: false,
      ...opts,
    });
    setOpen(true);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) settle(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia
              className={
                options?.danger
                  ? "bg-destructive/10 text-destructive"
                  : undefined
              }
            >
              {options?.danger ? (
                <CircleAlertIcon />
              ) : (
                <InfoIcon />
              )}
            </AlertDialogMedia>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description && (
              <AlertDialogDescription>
                {options.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{options?.cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              variant={options?.danger ? "destructive" : "default"}
              onClick={() => settle(true)}
            >
              {options?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error("useConfirmDialog must be used within ConfirmDialogProvider");
  }
  return ctx;
}
