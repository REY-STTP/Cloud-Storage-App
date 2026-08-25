import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Escape karakter wildcard LIKE/ILIKE (L-2) agar input search user tidak bisa
 * menyuntik pola `%`/`_`. Pasangkan dengan klausa `ESCAPE '\'` bila perlu —
 * Postgres memakai backslash sebagai escape default untuk LIKE/ILIKE.
 */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, "\\$&");
}
