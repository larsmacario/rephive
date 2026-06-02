import type { ReactNode } from "react";
import { M } from "../theme";
import { contentMaxWidth, useBreakpoint } from "../lib/responsive";

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
  const maxW = contentMaxWidth(bp);

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
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          paddingTop: 8,
          width: "100%",
          maxWidth: maxW,
          margin: maxW ? "0 auto" : undefined,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
