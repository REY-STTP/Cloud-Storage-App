// components/landing/Reveal.tsx
// Staggered GSAP entry for children marked with data-reveal.
// Runs immediately for above-the-fold content, or on scroll.
"use client";

import { ReactNode, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Animate on mount instead of when scrolled into view. */
  immediate?: boolean;
  stagger?: number;
  y?: number;
}

export default function Reveal({
  children,
  className,
  immediate = false,
  stagger = 0.08,
  y = 24,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const targets = el.querySelectorAll<HTMLElement>("[data-reveal]");
      if (!targets.length) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.from(targets, {
        y,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger,
        ...(immediate
          ? {}
          : {
              scrollTrigger: { trigger: el, start: "top 82%", once: true },
            }),
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
