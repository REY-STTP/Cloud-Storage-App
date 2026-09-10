// components/ConfirmDialogProvider.tsx
// App-wide confirm dialog built on shadcn/ui AlertDialog, keeping the
// promise-based confirm(options) API.
//
// D0-P0-1: tambahan confirmWithPassword() untuk aksi destruktif yang wajib
// konfirmasi password (hapus akun — server M-5 menolak tanpa password).
// API lama confirm() tidak berubah; semua pemanggil existing aman.
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type PasswordPromptOptions = ConfirmOptions & {
  passwordLabel?: string;
  passwordPlaceholder?: string;
};

type DialogOptions = ConfirmOptions & {
  passwordInput?: { label: string; placeholder: string } | null;
};

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Resolves password saat konfirmasi, atau null saat dibatalkan. */
  confirmWithPassword: (options: PasswordPromptOptions) => Promise<string | null>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | undefined>(
  undefined
);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<DialogOptions | null>(null);
  const [password, setPassword] = useState("");
  const resolverRef = useRef<((value: unknown) => void) | null>(null);

  const settle = useCallback((result: unknown) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setPassword("");
    setOpen(false);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setPassword("");
    setOptions({
      cancelLabel: "Cancel",
      confirmLabel: "Confirm",
      danger: false,
      ...opts,
      passwordInput: null,
    });
    setOpen(true);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve as (value: unknown) => void;
    });
  }, []);

  const confirmWithPassword = useCallback((opts: PasswordPromptOptions) => {
    setPassword("");
    setOptions({
      cancelLabel: "Cancel",
      confirmLabel: "Confirm",
      danger: false,
      ...opts,
      passwordInput: {
        label: opts.passwordLabel ?? "Current password",
        placeholder: opts.passwordPlaceholder ?? "Enter your password to confirm",
      },
    });
    setOpen(true);

    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve as (value: unknown) => void;
    });
  }, []);

  // Mode murni dari state (tanpa ref saat render) — setOptions + setOpen
  // di-batch dalam handler yang sama sehingga selalu konsisten.
  const isPasswordMode = !!options?.passwordInput;
  const canSubmitPassword = password.length > 0;

  return (
    <ConfirmDialogContext.Provider value={{ confirm, confirmWithPassword }}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) settle(isPasswordMode ? null : false);
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
          {options?.passwordInput && (
            <div className="grid gap-2">
              <Label htmlFor="confirm-dialog-password">
                {options.passwordInput.label}
              </Label>
              <Input
                id="confirm-dialog-password"
                type="password"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSubmitPassword) {
                    e.preventDefault();
                    settle(password);
                  }
                }}
                placeholder={options.passwordInput.placeholder}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{options?.cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              variant={options?.danger ? "destructive" : "default"}
              disabled={isPasswordMode && !canSubmitPassword}
              onClick={() => settle(isPasswordMode ? password : true)}
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
