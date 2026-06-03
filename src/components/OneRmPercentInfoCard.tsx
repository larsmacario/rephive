import type { CSSProperties } from "react";
import { M } from "../theme";
import { Icon } from "./Icon";

export interface OneRmPercentInfoCardProps {
  compact?: boolean;
  style?: CSSProperties;
}

export function OneRmPercentInfoCard({ compact = false, style }: OneRmPercentInfoCardProps) {
  return (
    <div
      style={{
        padding: compact ? "12px 14px" : "14px 16px",
        borderRadius: 14,
        border: "1px solid " + M.line,
        background: M.card,
        display: "flex",
        flexDirection: "column",
        gap: compact ? 8 : 10,
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="calculator" size={18} color={M.acc} stroke={2} />
        <span
          style={{
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: compact ? 14 : 15,
            letterSpacing: 0.3,
            color: M.acc,
          }}
        >
          Was bedeutet % 1RM?
        </span>
      </div>

      <p style={{ margin: 0, fontSize: compact ? 12.5 : 13.5, lineHeight: 1.55, color: M.fg }}>
        <strong style={{ color: M.fg }}>1RM</strong> ist dein geschätztes Maximalgewicht für eine Wiederholung.
        Vorgaben wie „75% 1RM“ bedeuten: Du trainierst mit 75&nbsp;% dieses Maximums — die Wdh.-Zahl steht in der
        Übungs-Note.
      </p>

      <div
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          background: M.accSoft,
          fontSize: compact ? 12 : 12.5,
          lineHeight: 1.5,
          color: M.fg,
        }}
      >
        <span style={{ fontWeight: 700, color: M.acc }}>So findest du dein kg:</span> Öffne den{" "}
        <strong>1RM-Rechner</strong> auf der Startseite → trage Gewicht und Wdh. aus deinem letzten Training ein →
        die Prozent-Tabelle zeigt dir das passende kg. Alternativ: 1RM × Prozent (z.&nbsp;B. 100&nbsp;kg × 0,75 = 75&nbsp;kg).
      </div>

      <p style={{ margin: 0, fontSize: compact ? 11.5 : 12, lineHeight: 1.45, color: M.mut }}>
        Im KI-Plan steht bei den Sätzen kg = 0 — trage dein berechnetes Gewicht beim ersten Training selbst ein.
      </p>
    </div>
  );
}
