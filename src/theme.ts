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
  brandStrong: "#7ef67b",
  brandSoft: "var(--mom-brand-soft, rgba(126,246,123,.16))",
  brandInk: "var(--mom-brand-ink, #0a1a0a)",
  brandBorder: "rgba(126,246,123,.25)",
  brandButtonGradient: "linear-gradient(180deg, #8ef885 0%, #7ef67b 45%, #6de066 100%)",
  brandButtonGlow: "0 4px 24px rgba(126,246,123,.35), 0 0 48px rgba(126,246,123,.12)",
  brandGlow: "0 0 20px rgba(126,246,123,.22)",
  brandGradient:
    "linear-gradient(160deg, color-mix(in oklab, var(--mom-brand, #7ef67b) 14%, #1a1a1a), #111111)",
  brandGradientSubtle:
    "linear-gradient(160deg, color-mix(in oklab, var(--mom-brand, #7ef67b) 8%, #1a1a1a), #141414)",
  rest: "#525252",
  prep: "#a3a3a3",
  disp: "'Saira Condensed', sans-serif",
  body: "'Archivo', sans-serif",
} as const;

/** Compact exercise list rows (Track, Plan, Bibliothek, Picker). */
export const EXERCISE_ROW = {
  height: 56,
  iconSize: 34,
  iconRadius: 10,
  paddingX: 12,
  gap: 12,
  titleSize: 16,
  metaSize: 12,
  borderRadius: 12,
} as const;

export type ExerciseRowBackground = "card" | "panel" | "transparent";

export function exerciseRowStyle(options?: {
  background?: ExerciseRowBackground;
  borderRadius?: number;
}): CSSProperties {
  const bg = options?.background ?? "panel";
  return {
    height: EXERCISE_ROW.height,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: EXERCISE_ROW.gap,
    padding: `0 ${EXERCISE_ROW.paddingX}px`,
    borderRadius: options?.borderRadius ?? EXERCISE_ROW.borderRadius,
    background: bg === "card" ? M.card : bg === "panel" ? M.panel : "transparent",
    border: bg === "transparent" ? "none" : "1px solid " + M.line2,
    flexShrink: 0,
    width: "100%",
  };
}

export const exerciseRowEllipsis: CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export type BrandSurfaceVariant = "hero" | "card" | "selected";

/** Reusable card/surface styles for brand-accented UI. */
export function brandSurface(variant: BrandSurfaceVariant): CSSProperties {
  switch (variant) {
    case "hero":
      return {
        background: M.brandGradient,
        border: "1px solid " + M.brandBorder,
        borderRadius: 20,
      };
    case "card":
      return {
        background: M.brandGradientSubtle,
        border: "1px solid " + M.line2,
        borderRadius: 18,
      };
    case "selected":
      return {
        background: M.brand,
        color: M.brandInk,
        border: "1px solid transparent",
        boxShadow: M.brandGlow,
      };
  }
}

/** Primary CTA — gradient + neon glow (Referenz Onboarding/Checkout). */
export function brandButtonStyle(options?: { glow?: boolean }): CSSProperties {
  const glow = options?.glow !== false;
  return {
    background: M.brandButtonGradient,
    color: M.brandInk,
    borderColor: "transparent",
    fontFamily: M.disp,
    ...(glow ? { boxShadow: M.brandButtonGlow } : null),
  };
}

/** Wizard/list selection — green border + soft fill. */
export function brandSelectionStyle(selected: boolean): CSSProperties {
  return selected
    ? {
        border: `2px solid ${M.brand}`,
        background: M.brandSoft,
        color: M.brand,
        boxShadow: M.brandGlow,
      }
    : {
        border: `1px solid ${M.line}`,
        background: M.card,
        color: M.fg,
      };
}

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
export type ButtonVariantToken = "primary" | "secondary" | "ghost" | "danger";

/** Press/release transitions for MButton tactile feedback. */
export const buttonPressTransition =
  "transform 150ms ease-out, opacity 150ms ease-out, background-color 150ms ease-out, border-color 150ms ease-out, box-shadow 180ms cubic-bezier(0.34, 1.4, 0.64, 1)";

/** Dimmed glow while primary button is pressed. */
export const buttonPrimaryPressedGlow = "0 2px 12px rgba(126,246,123,.18), 0 0 24px rgba(126,246,123,.06)";

/** Brief glow pulse on primary button release (~180 ms). */
export const buttonPrimaryReleaseGlow =
  "0 6px 32px rgba(126,246,123,.48), 0 0 72px rgba(126,246,123,.22)";

/** Variant-specific press styles for MButton. */
export function buttonPressStyle(
  variant: ButtonVariantToken,
  pressed: boolean,
  options?: { reducedMotion?: boolean },
): CSSProperties | null {
  if (!pressed) return null;
  const reduced = options?.reducedMotion === true;

  if (reduced) {
    switch (variant) {
      case "primary":
        return { opacity: 0.88 };
      case "secondary":
        return { opacity: 0.88, borderColor: M.brandBorder };
      case "danger":
        return { opacity: 0.88 };
      case "ghost":
        return { opacity: 0.72 };
    }
  }

  switch (variant) {
    case "primary":
      return {
        transform: "scale(0.96) translateY(1px)",
        boxShadow: buttonPrimaryPressedGlow,
      };
    case "secondary":
      return {
        transform: "scale(0.97)",
        borderColor: M.brandBorder,
        background: M.brandSoft,
      };
    case "danger":
      return {
        transform: "scale(0.97)",
        background: "rgba(245,180,180,.08)",
      };
    case "ghost":
      return { transform: "scale(0.98)" };
  }
}

/** Release glow pulse style for primary MButton. */
export function buttonReleaseGlowStyle(): CSSProperties {
  return { boxShadow: buttonPrimaryReleaseGlow };
}

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
  transition: buttonPressTransition,
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
