import type { CSSProperties } from "react";

// rephive — design tokens (dark, neon-lime, Saira Condensed display / Archivo body).
export const APP_NAME = "rephive";
/** PWA home-screen label (max. ~12 Zeichen empfohlen). */
export const APP_NAME_SHORT = "rephive";
/** Quadratisches App-Icon (Favicon-Set). */
export const LOGO_ICON = "/favicon/favicon-96x96.png";
/** Wordmark mit „YOUR“ in Akzentfarbe. */
export const LOGO_WORDMARK = "/logo.png";

export const M = {
  bg: "#0a0c0a",
  panel: "#0f120f",
  card: "#151915",
  cardHi: "#1c211c",
  line: "rgba(255,255,255,.08)",
  line2: "rgba(255,255,255,.05)",
  fg: "#eef2ec",
  mut: "rgba(238,242,236,.52)",
  mut2: "rgba(238,242,236,.3)",
  acc: "var(--mom-acc, oklch(0.87 0.21 143))",
  accSoft: "color-mix(in oklab, var(--mom-acc, oklch(0.87 0.21 143)) 16%, transparent)",
  accInk: "#06210f",
  rest: "oklch(0.82 0.11 233)",
  prep: "oklch(0.87 0.15 85)",
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

// Small inline +/- button used inside steppers.
export const mMini: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 7,
  border: "1px solid " + M.line,
  background: M.bg,
  color: M.fg,
  fontSize: 15,
  lineHeight: 1,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: M.body,
};
