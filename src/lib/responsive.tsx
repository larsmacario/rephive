import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react";

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
} as const;

export type Breakpoint = "mobile" | "tablet" | "desktop";

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.desktop) return "desktop";
  if (width >= BREAKPOINTS.tablet) return "tablet";
  return "mobile";
}

const ResponsiveContext = createContext<Breakpoint>("mobile");

export function ResponsiveProvider({ children }: { children: ReactNode }) {
  const [bp, setBp] = useState<Breakpoint>(() =>
    typeof window === "undefined" ? "mobile" : getBreakpoint(window.innerWidth),
  );

  useEffect(() => {
    const tabletMq = window.matchMedia(`(min-width: ${BREAKPOINTS.tablet}px)`);
    const desktopMq = window.matchMedia(`(min-width: ${BREAKPOINTS.desktop}px)`);

    const update = () => setBp(getBreakpoint(window.innerWidth));

    tabletMq.addEventListener("change", update);
    desktopMq.addEventListener("change", update);
    window.addEventListener("resize", update);

    return () => {
      tabletMq.removeEventListener("change", update);
      desktopMq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return <ResponsiveContext.Provider value={bp}>{children}</ResponsiveContext.Provider>;
}

export function useBreakpoint(): Breakpoint {
  return useContext(ResponsiveContext);
}

export function useIsWide(): boolean {
  const bp = useBreakpoint();
  return bp === "tablet" || bp === "desktop";
}

/** True when viewport height is tight (e.g. iPhone SE, small phones). */
export function useShortViewport(threshold = 740): boolean {
  const [short, setShort] = useState(() =>
    typeof window === "undefined" ? false : window.innerHeight < threshold,
  );

  useEffect(() => {
    const update = () => setShort(window.innerHeight < threshold);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [threshold]);

  return short;
}

/** Horizontal padding used by tab screens — nav aligns to the same inset. */
export const CONTENT_HORIZONTAL_PADDING = 22;

/** Standard push/tab screen header inset (top, horizontal, bottom). */
export function screenHeaderPadding(): string {
  return `4px ${CONTENT_HORIZONTAL_PADDING}px 12px`;
}

/** Horizontal-only page inset for footers, errors, tab bars. */
export function screenHorizontalPadding(): string {
  return `0 ${CONTENT_HORIZONTAL_PADDING}px`;
}

/** Fixed bottom padding for scroll areas when PhoneShell reserves safe-area. */
export const SCROLL_BOTTOM_PADDING = 24;

/** Bottom padding for fixed footer bars that own safe-area (shell padding off). */
export const FOOTER_BAR_PADDING_BOTTOM = "max(10px, env(safe-area-inset-bottom, 0px))";

/** Max content width per breakpoint for centered layouts. */
export function contentMaxWidth(bp: Breakpoint): number | undefined {
  if (bp === "mobile") return undefined;
  if (bp === "tablet") return 720;
  return 960;
}

/** Shared width/centering for app content columns and bottom sheets. */
export function contentColumnStyle(bp: Breakpoint): CSSProperties {
  const maxW = contentMaxWidth(bp);
  return {
    width: "100%",
    maxWidth: maxW,
    marginLeft: maxW ? "auto" : undefined,
    marginRight: maxW ? "auto" : undefined,
  };
}

export function useContentColumnStyle(): CSSProperties {
  return contentColumnStyle(useBreakpoint());
}
