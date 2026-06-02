import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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

/** Horizontal padding used by tab screens — nav aligns to the same inset. */
export const CONTENT_HORIZONTAL_PADDING = 22;

/** Max content width per breakpoint for centered layouts. */
export function contentMaxWidth(bp: Breakpoint): number | undefined {
  if (bp === "mobile") return undefined;
  if (bp === "tablet") return 720;
  return 960;
}
