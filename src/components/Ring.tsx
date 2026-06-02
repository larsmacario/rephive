import type { ReactNode } from "react";

export interface RingProps {
  size?: number;
  stroke?: number;
  progress?: number; // 0..1
  color?: string;
  track?: string;
  children?: ReactNode;
  cap?: "round" | "butt" | "square";
  rotate?: number;
  glow?: string | null;
}

// Circular progress ring. Renders children centered.
export function Ring({
  size = 240,
  stroke = 14,
  progress = 0,
  color = "#0f0",
  track = "rgba(255,255,255,.1)",
  children,
  cap = "round",
  rotate = -90,
  glow,
}: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{
          transform: `rotate(${rotate}deg)`,
          filter: glow ? `drop-shadow(0 0 12px ${glow})` : "none",
        }}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap={cap}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, progress)))}
          style={{ transition: "stroke-dashoffset .12s linear" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
