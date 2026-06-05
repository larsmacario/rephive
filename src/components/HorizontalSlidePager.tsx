import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { M } from "../theme";

export interface HorizontalSlidePagerProps {
  count: number;
  activeIndex: number;
  onIndexChange: (index: number) => void;
  children: ReactNode[];
  ariaLabel?: string;
  slideLabel?: (index: number, count: number) => string;
  showIndicators?: boolean;
}

export function HorizontalSlidePager({
  count,
  activeIndex,
  onIndexChange,
  children,
  ariaLabel = "Tages-Karussell",
  slideLabel = (i, total) => `Tag ${i + 1} von ${total}`,
  showIndicators = true,
}: HorizontalSlidePagerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const ignoreScrollRef = useRef(false);
  const indexFromScrollRef = useRef(false);
  const ignoreScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIndexRef = useRef(activeIndex);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const targetLeft = index * el.clientWidth;
    if (Math.abs(el.scrollLeft - targetLeft) < 2) return;

    ignoreScrollRef.current = true;
    el.scrollTo({ left: targetLeft, behavior });

    if (ignoreScrollTimerRef.current) clearTimeout(ignoreScrollTimerRef.current);
    ignoreScrollTimerRef.current = setTimeout(() => {
      ignoreScrollRef.current = false;
      ignoreScrollTimerRef.current = null;
    }, behavior === "smooth" ? 400 : 80);
  }, []);

  const readIndexFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return activeIndexRef.current;
    return Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / el.clientWidth)));
  }, [count]);

  const syncIndexFromScroll = useCallback(() => {
    if (ignoreScrollRef.current) return;
    const next = readIndexFromScroll();
    if (next === activeIndexRef.current) return;
    indexFromScrollRef.current = true;
    onIndexChange(next);
    requestAnimationFrame(() => {
      indexFromScrollRef.current = false;
    });
  }, [onIndexChange, readIndexFromScroll]);

  const goTo = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(count - 1, index));
      scrollToIndex(next);
      onIndexChange(next);
    },
    [count, onIndexChange, scrollToIndex],
  );

  useEffect(() => {
    if (indexFromScrollRef.current || ignoreScrollRef.current) return;
    scrollToIndex(activeIndex, "auto");
  }, [activeIndex, scrollToIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScrollEnd = () => syncIndexFromScroll();

    const onScroll = () => {
      if (ignoreScrollRef.current) return;
      if (scrollDebounceTimerRef.current) clearTimeout(scrollDebounceTimerRef.current);
      scrollDebounceTimerRef.current = setTimeout(() => {
        scrollDebounceTimerRef.current = null;
        syncIndexFromScroll();
      }, 120);
    };

    el.addEventListener("scrollend", onScrollEnd);
    el.addEventListener("scroll", onScroll, { passive: true });

    const observer = new ResizeObserver(() => {
      if (ignoreScrollRef.current) return;
      const idx = readIndexFromScroll();
      scrollToIndex(idx, "auto");
    });
    observer.observe(el);

    return () => {
      el.removeEventListener("scrollend", onScrollEnd);
      el.removeEventListener("scroll", onScroll);
      observer.disconnect();
      if (ignoreScrollTimerRef.current) clearTimeout(ignoreScrollTimerRef.current);
      if (scrollDebounceTimerRef.current) clearTimeout(scrollDebounceTimerRef.current);
    };
  }, [readIndexFromScroll, scrollToIndex, syncIndexFromScroll]);

  if (count === 0) return null;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        role="region"
        aria-roledescription="Karussell"
        aria-label={ariaLabel}
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          overflowX: "auto",
          overflowY: "hidden",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          touchAction: "pan-x pan-y",
        }}
      >
        {children.map((slide, i) => (
          <div
            key={i}
            style={{
              flex: "0 0 100%",
              width: "100%",
              height: "100%",
              scrollSnapAlign: "start",
              scrollSnapStop: "always",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              boxSizing: "border-box",
            }}
          >
            {slide}
          </div>
        ))}
      </div>

      {showIndicators && count > 1 && (
        <div
          style={{
            flexShrink: 0,
            padding: "10px 0 4px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 11, letterSpacing: 1.2, color: M.mut2, fontWeight: 700 }}>
            {slideLabel(activeIndex, count).toUpperCase()}
          </span>
          <div
            role="tablist"
            aria-label="Tages-Folien"
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            {Array.from({ length: count }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={activeIndex === i}
                aria-current={activeIndex === i ? "true" : undefined}
                aria-label={slideLabel(i, count)}
                onClick={() => goTo(i)}
                style={{
                  width: activeIndex === i ? 24 : 8,
                  height: 8,
                  borderRadius: activeIndex === i ? 5 : 4,
                  border: "none",
                  padding: 0,
                  minWidth: 32,
                  minHeight: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: activeIndex === i ? 24 : 8,
                    height: 8,
                    borderRadius: activeIndex === i ? 5 : 4,
                    background: activeIndex === i ? M.acc : M.line,
                    transition: "width 0.2s ease, background 0.2s ease",
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
