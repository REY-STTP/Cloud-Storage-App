// components/landing/PinnedPrivacy.tsx
// Desire section: the left title pins while the right column scrolls;
// stacking cards demonstrate the real privacy mechanics.
"use client";

import { ReactNode, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function PinnedPrivacy({
  title,
  lede,
  children,
}: {
  title: ReactNode;
  lede: ReactNode;
  children: ReactNode; // the stacking cards
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const left = leftRef.current;
      const right = rightRef.current;
      if (!section || !left || !right) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (window.innerWidth < 768) return; // single column: no pinning

      // Pin the title while the card column scrolls past it.
      const distance = () => right.offsetHeight - left.offsetHeight;
      ScrollTrigger.create({
        trigger: section,
        start: "top 96px",
        end: () => `+=${distance()}`,
        pin: left,
        pinSpacing: false,
        invalidateOnRefresh: true,
      });

      // Card stacking: each card settles as the next one arrives.
      const cards = gsap.utils.toArray<HTMLElement>("[data-stack-card]");
      cards.forEach((card, i) => {
        if (i === cards.length - 1) return;
        gsap.to(card, {
          scale: 0.94,
          opacity: 0.45,
          transformOrigin: "center top",
          ease: "none",
          scrollTrigger: {
            trigger: cards[i + 1],
            start: "top bottom",
            end: "top top+=140",
            scrub: true,
          },
        });
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-5 py-24 sm:px-8 md:grid-cols-[5fr_6fr] md:gap-16 md:py-36"
    >
      <div ref={leftRef} className="md:self-start">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 max-w-[46ch] leading-relaxed text-muted-foreground">
          {lede}
        </p>
      </div>
      <div ref={rightRef} className="flex flex-col gap-6">
        {children}
      </div>
    </section>
  );
}
