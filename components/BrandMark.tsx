// components/BrandMark.tsx
// Logo brand: awan geometris dengan slot negatif space di bawahnya
// ("slot drive tempat file masuk"). Menggambar pakai currentColor supaya
// bisa dipakai di dalam chip bg-primary (putih) maupun di atas background
// lain. Ukuran dikontrol lewat className, default mengikuti ikon lucide.
import { cn } from "@/lib/utils";

export default function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      className={cn("size-4 shrink-0", className)}
    >
      <mask id="brandmark-slot">
        <rect width="512" height="512" fill="#fff" />
        <rect x="194" y="320" width="130" height="34" rx="17" fill="#000" />
      </mask>
      <g fill="currentColor" mask="url(#brandmark-slot)">
        <circle cx="184" cy="288" r="72" />
        <circle cx="306" cy="258" r="100" />
        <rect x="112" y="278" width="294" height="106" rx="53" />
      </g>
    </svg>
  );
}
