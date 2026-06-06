import { M } from "../../theme";

export interface DotIndicatorsProps {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  ariaLabel?: string;
}

function layoutForCount(count: number) {
  /** ~90 % typische Content-Breite auf Mobil */
  const budgetPx = 320;
  let gap = count <= 8 ? 5 : count <= 14 ? 4 : 3;
  let hit = count <= 8 ? 22 : count <= 14 ? 18 : 16;
  const total = count * hit + Math.max(0, count - 1) * gap;
  if (total > budgetPx && count > 1) {
    hit = Math.max(12, Math.floor((budgetPx - (count - 1) * gap) / count));
  }
  const dot = hit <= 14 ? 4 : hit <= 18 ? 5 : 6;
  const activeDot = Math.min(dot + 1, hit - 4);
  return { dot, activeDot, gap, hit };
}

export function DotIndicators({
  count,
  activeIndex,
  onSelect,
  ariaLabel = "Navigation",
}: DotIndicatorsProps) {
  if (count <= 1) return null;

  const safeIndex = Math.max(0, Math.min(count - 1, activeIndex));
  const { dot, activeDot, gap, hit } = layoutForCount(count);

  return (
    <div
      style={{
        flexShrink: 0,
        padding: "6px 0 10px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        role="tablist"
        aria-label={ariaLabel}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap,
          width: "auto",
          maxWidth: "90%",
          flexWrap: "nowrap",
        }}
      >
        {Array.from({ length: count }, (_, i) => {
          const isActive = safeIndex === i;
          const size = isActive ? activeDot : dot;
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "true" : undefined}
              aria-label={`Übung ${i + 1} von ${count}`}
              onClick={() => onSelect(i)}
              style={{
                width: hit,
                height: hit,
                minWidth: hit,
                minHeight: hit,
                border: "none",
                padding: 0,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  background: isActive ? M.fg : M.line,
                  display: "block",
                  flexShrink: 0,
                  transition: "background .15s ease",
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
