import type { ReactNode } from "react";
import { M } from "../theme";
import { contentColumnStyle, useBreakpoint } from "../lib/responsive";

export interface PhoneShellProps {
  children: ReactNode;
  /** When false, bottom safe-area is handled elsewhere (e.g. fixed bottom nav). */
  reserveBottomSafeArea?: boolean;
}

// App shell — fills its container. No device mockup chrome (status bar / home
// indicator); app surface plus safe-area insets so content clears
// the real notch / gesture bar on a phone (insets are 0 on desktop).
export function PhoneShell({ children, reserveBottomSafeArea = true }: PhoneShellProps) {
  const bp = useBreakpoint();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: M.bg,
        color: M.fg,
        position: "relative",
        overflow: "hidden",
        fontFamily: M.body,
        display: "flex",
        flexDirection: "column",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: reserveBottomSafeArea ? "env(safe-area-inset-bottom)" : 0,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 90% 50% at 50% 0%, color-mix(in oklab, var(--mom-brand, #7ef67b) 10%, transparent), transparent 62%)",
          zIndex: 0,
        }}
      />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          paddingTop: 8,
          overflow: "hidden",
          zIndex: 1,
          ...contentColumnStyle(bp),
        }}
      >
        {children}
      </div>
    </div>
  );
}
