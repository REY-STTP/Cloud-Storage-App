// components/SwrProvider.tsx
// Global SWR setup: satu fetcher JSON + penanganan error via toast.
"use client";

import { SWRConfig } from "swr";
import { useToast } from "@/components/ToastProvider";

/** Fetcher JSON standar untuk semua useSWR di aplikasi. */
export const swrFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `Request failed (${res.status})`);
  }
  return res.json();
};

export function SwrProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();

  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        revalidateOnFocus: false, // dashboard: jangan refetch tiap pindah tab
        onError: (err) => {
          showToast("error", err instanceof Error ? err.message : "Failed to load data");
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
