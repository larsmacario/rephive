import { useState } from "react";
import { M } from "../theme";

export interface SplitImageSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeDate?: string;
  afterDate?: string;
  beforeWeight?: string;
  afterWeight?: string;
}

export function SplitImageSlider({
  beforeUrl,
  afterUrl,
  beforeDate,
  afterDate,
  beforeWeight,
  afterWeight,
}: SplitImageSliderProps) {
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Slider Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: "133.33%", /* 3:4 Aspect Ratio */
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid " + M.line,
          background: M.panel,
          userSelect: "none",
        }}
      >
        {/* After Image (Right / Background) */}
        <img
          src={afterUrl}
          alt="Nachher"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            pointerEvents: "none",
          }}
        />

        {/* Before Image (Left / Overlay with clipPath) */}
        <img
          src={beforeUrl}
          alt="Vorher"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            pointerEvents: "none",
            clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
          }}
        />

        {/* Separator Line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${sliderPosition}%`,
            width: 2,
            backgroundColor: M.acc,
            transform: "translateX(-50%)",
            pointerEvents: "none",
            zIndex: 2,
            boxShadow: "0 0 8px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Handle Badge */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: M.acc,
              border: "3px solid " + M.card,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
              color: M.accInk,
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            ↔
          </div>
        </div>

        {/* Badges for Before/After */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            padding: "4px 8px",
            borderRadius: 6,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            zIndex: 3,
            pointerEvents: "none",
            letterSpacing: 0.5,
          }}
        >
          VORHER
        </div>

        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            padding: "4px 8px",
            borderRadius: 6,
            color: M.acc,
            fontSize: 10,
            fontWeight: 700,
            zIndex: 3,
            pointerEvents: "none",
            letterSpacing: 0.5,
          }}
        >
          NACHHER
        </div>

        {/* Invisible Input Range for dragging */}
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={sliderPosition}
          onChange={(e) => setSliderPosition(parseFloat(e.target.value))}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "ew-resize",
            zIndex: 4,
            margin: 0,
            padding: 0,
          }}
        />
      </div>

      {/* Info Details Row */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px 8px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11, color: M.mut, fontWeight: 700 }}>VORHER-MESSUNG</span>
          <span style={{ fontSize: 13, color: M.fg, fontWeight: 600 }}>
            {beforeDate || "Kein Datum"}
          </span>
          {beforeWeight && (
            <span style={{ fontSize: 12, color: M.mut2, fontWeight: 600 }}>
              {beforeWeight} kg
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end", textAlign: "right" }}>
          <span style={{ fontSize: 11, color: M.mut, fontWeight: 700 }}>NACHHER-MESSUNG</span>
          <span style={{ fontSize: 13, color: M.acc, fontWeight: 600 }}>
            {afterDate || "Kein Datum"}
          </span>
          {afterWeight && (
            <span style={{ fontSize: 12, color: M.mut2, fontWeight: 600 }}>
              {afterWeight} kg
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
