// app/opengraph-image.tsx
// Dynamically generated social preview (PNG). Auto-wired as og:image and
// twitter:image by Next.js. Brand colors match globals.css tokens.
import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// White version of the brand cloud mark, inlined as a data URL.
const brandSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><g fill='white'><circle cx='184' cy='288' r='72'/><circle cx='306' cy='258' r='100'/><rect x='112' y='278' width='294' height='106' rx='53'/></g></svg>`;
const brandDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(brandSvg)}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "radial-gradient(900px 520px at 88% -10%, #e5edff 0%, rgba(229,237,255,0) 60%), #f7f9fc",
          color: "#1f2a44",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "20px",
              background: "#2f63e6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brandDataUrl} width={46} height={46} alt="" />
          </div>
          <div style={{ fontSize: "40px", fontWeight: 700, letterSpacing: "-0.02em" }}>
            {siteConfig.name}
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              fontSize: "68px",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: "900px",
            }}
          >
            File storage that stays private by default
          </div>
          <div style={{ fontSize: "30px", color: "#5b6678", maxWidth: "820px" }}>
            A sealed private bucket. Every download link expires in 60 minutes.
          </div>
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: "16px" }}>
          {["1 GB free", "No credit card", "Expiring links"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 26px",
                borderRadius: "999px",
                background: "white",
                color: "#1f2a44",
                fontSize: "26px",
                fontWeight: 600,
                boxShadow: "0 1px 2px rgba(31,42,68,0.06), 0 8px 24px rgba(31,42,68,0.08)",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
