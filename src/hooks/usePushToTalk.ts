import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Hold-to-talk: release is tracked on window so minor finger movement / re-renders
 * do not cancel the session early (common iOS WKWebView issue).
 */
export function usePushToTalk(
  onStart: () => void | Promise<void>,
  onStop: () => void | Promise<void>,
  enabled = true,
) {
  const [holding, setHolding] = useState(false);
  const holdingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const release = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!holdingRef.current) return;
    holdingRef.current = false;
    pointerIdRef.current = null;
    setHolding(false);
    void onStop();
  }, [onStop]);

  const press = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || holdingRef.current) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();

      const el = event.currentTarget;
      pointerIdRef.current = event.pointerId;
      try {
        el.setPointerCapture(event.pointerId);
      } catch {
        // ignore — window listeners still handle release
      }

      holdingRef.current = true;
      setHolding(true);
      void onStart();

      const onWindowPointerUp = (ev: PointerEvent) => {
        if (pointerIdRef.current != null && ev.pointerId !== pointerIdRef.current) return;
        release();
      };

      const cleanup = () => {
        window.removeEventListener("pointerup", onWindowPointerUp, true);
        window.removeEventListener("pointercancel", onWindowPointerUp, true);
        try {
          if (pointerIdRef.current != null) el.releasePointerCapture(pointerIdRef.current);
        } catch {
          // ignore
        }
      };

      cleanupRef.current = cleanup;
      window.addEventListener("pointerup", onWindowPointerUp, true);
      window.addEventListener("pointercancel", onWindowPointerUp, true);
    },
    [enabled, onStart, release],
  );

  return { holding, press, release };
}
