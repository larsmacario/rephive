import type { CSSProperties } from "react";

// Small geometric icon set. `name` keys into the path table below.
const ICON_PATHS: Record<string, string> = {
  play: "M8 5v14l11-7z",
  skipFwd: "M5 4l10 8-10 8V4zM19 5v14",
  pause: "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  check: "M5 12.5l4.5 4.5L19 6.5",
  x: "M6 6l12 12M18 6L6 18",
  chevR: "M9 5l7 7-7 7",
  chevD: "M5 9l7 7 7-7",
  chevL: "M15 5l-7 7 7 7",
  reset: "M4 4v6h6M20 20v-6h-6M19 9a8 8 0 0 0-14-3M5 15a8 8 0 0 0 14 3",
  flag: "M5 21V4M5 4h12l-2 4 2 4H5",
  flame: "M12 3c2 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5-1-8z",
  droplet: "M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13zM9 16c.4 1.4 1.4 2.2 3 2.5",
  dumbbell: "M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10",
  timer: "M12 8v5l3 2M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9 2h6",
  list: "M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  menu: "M4 6h16M4 12h16M4 18h16",
  trash: "M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  edit: "M4 20h4L18 10l-4-4L4 16zM14 6l4 4",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  heart: "M12 20.5l-1.05-1.02C5.4 14.36 2 11.28 2 7.5 2 5 4 3 6.5 3c1.74 0 3.41 1.01 4.22 2.44C11.09 4.01 12.76 3 14.5 3 17 3 19 5 19 7.5c0 3.78-3.4 6.86-8.95 11.98L12 20.5z",
  sparkles: "M12 2L13.2 8.8L20 10L13.2 11.2L12 18L10.8 11.2L4 10L10.8 8.8L12 2zM19 15L19.6 17.2L22 17.8L19.6 18.4L19 20.6L18.4 18.4L16 17.8L18.4 17.2L19 15z",
  arrowUp: "M12 19V5M5 12l7-7 7 7",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  moreH: "M5 12h.01M12 12h.01M19 12h.01",
  clock: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  home: "M3 11l9-7 9 7M5 10v9h5v-6h4v6h5v-9",
  history: "M3 4v5h5M3.5 9a9 9 0 1 0 2.2-3.6L3 9M12 8v5l4 2",
  calendar: "M8 2v4M16 2v4M4 7h16M5 7v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  copy: "M9 9h10v11H9zM5 5h10v2M5 5v11h2",
  calculator: "M4 4h16v16H4z M4 9h16 M9 9v11 M15 9v11 M4 14h16",
  scale: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm7 3a3 3 0 0 0-3 3h6a3 3 0 0 0-3-3zm-4 7h8",
  externalLink:
    "M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
  like: "M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3",
  dislike: "M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm12-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3",
  alertCircle: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-14v4m0 4h.01",
  lock: "M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0",
  users: "M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 9a6 6 0 0 1 12 0M13 19a5 5 0 0 1 10 0",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  volume: "M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07",
};

export interface IconProps {
  name: keyof typeof ICON_PATHS | string;
  size?: number;
  stroke?: number;
  fill?: string;
  color?: string;
  style?: CSSProperties;
}

export function Icon({
  name,
  size = 24,
  stroke = 2,
  fill = "none",
  color = "currentColor",
  style,
}: IconProps) {
  const d = ICON_PATHS[name] || "";
  const filled = name === "play" || name === "pause" || name === "bolt" || name === "flame" || name === "sparkles" || name === "heart";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : fill}
      stroke={filled ? "none" : color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <path d={d} />
    </svg>
  );
}
