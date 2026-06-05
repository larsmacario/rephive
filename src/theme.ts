import type { CSSProperties } from "react";

// rephive — design tokens (dark monochrome premium, Saira Condensed display / Archivo body).
export const APP_NAME = "rephive";
/** PWA home-screen label (max. ~12 Zeichen empfohlen). */
export const APP_NAME_SHORT = "rephive";
/** App-Logo (Biene, transparent). Favicons bleiben PNG für PWA/OS. */
export const LOGO_ICON = "/bee-without-bg.svg";
/** Wordmark mit „YOUR“ in Akzentfarbe. */
export const LOGO_WORDMARK = "/logo.png";

export const M = {
  bg: "#000000",
  panel: "#121212",
  card: "#1a1a1a",
  cardHi: "#222222",
  line: "rgba(255,255,255,.08)",
  line2: "rgba(255,255,255,.05)",
  fg: "#fafafa",
  mut: "rgba(255,255,255,.58)",
  mut2: "rgba(255,255,255,.32)",
  acc: "var(--mom-acc, #fafafa)",
  accSoft: "rgba(255,255,255,.08)",
  accInk: "#0a0a0a",
  brand: "var(--mom-brand, #7ef67b)",
  brandSoft: "var(--mom-brand-soft, rgba(126,246,123,.12))",
  brandInk: "var(--mom-brand-ink, #0a1a0a)",
  rest: "#525252",
  prep: "#a3a3a3",
  disp: "'Saira Condensed', sans-serif",
  body: "'Archivo', sans-serif",
} as const;

/** Stacking order — sheets/overlays must stay above nav (10). */
export const Z = {
  nav: 10,
  sheet: 20,
  sheetRaised: 25,
  sheetHigh: 30,
  sheetTop: 40,
} as const;

export type SegmentKind = "work" | "rest" | "prep" | "done";

export const mKind = (k: SegmentKind): string =>
  k === "rest" ? M.rest : k === "prep" ? M.prep : M.acc;

export type ButtonSizeToken = "sm" | "md" | "lg" | "icon";

/** Shared button base — mirrors MButton defaults. */
export const buttonBase: CSSProperties = {
  border: "1px solid transparent",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontFamily: M.body,
  fontWeight: 600,
  fontSize: 13,
  lineHeight: 1,
  letterSpacing: 0.2,
  transition: "transform 120ms ease-out, opacity 120ms ease-out, background-color 120ms ease-out, border-color 120ms ease-out",
  WebkitTapHighlightColor: "transparent",
};

export const buttonSizes: Record<ButtonSizeToken, CSSProperties> = {
  sm: { minHeight: 30, padding: "0 10px", borderRadius: 8, fontSize: 12 },
  md: { minHeight: 36, padding: "0 14px", borderRadius: 9, fontSize: 13 },
  lg: { minHeight: 40, padding: "0 18px", borderRadius: 9, fontSize: 14 },
  icon: { width: 32, height: 32, padding: 0, borderRadius: 9, fontSize: 13 },
};

// Inline +/- buttons inside set steppers (Track, Builder).
export const mMini: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1px solid " + M.line,
  background: M.bg,
  color: M.fg,
  fontSize: 16,
  lineHeight: 1,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: M.body,
};
