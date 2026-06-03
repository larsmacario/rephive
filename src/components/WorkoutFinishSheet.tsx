import { useState } from "react";
import { M } from "../theme";
import { fmtUp } from "../lib/engine";
import { Icon } from "./Icon";

export interface WorkoutFinishSheetProps {
  name: string;
  durationSec: number;
  doneSets: number;
  totalSets: number;
  volumeKg: number;
  busy?: boolean;
  exercises?: string[];
  onSave: (feedback: Record<string, { rating: "like" | "dislike" | "pain" }>) => void;
  onDiscard: () => void;
  onClose: () => void;
}

export function WorkoutFinishSheet({
  name,
  durationSec,
  doneSets,
  totalSets,
  volumeKg,
  busy,
  exercises = [],
  onSave,
  onDiscard,
  onClose,
}: WorkoutFinishSheetProps) {
  const [feedback, setFeedback] = useState<Record<string, { rating: "like" | "dislike" | "pain" }>>({});

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(5,7,5,.6)",
        backdropFilter: "blur(4px)",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: M.panel,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTop: "1px solid " + M.line,
          padding: "16px 18px 28px",
          maxHeight: "85%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: M.line, margin: "0 auto 14px", flexShrink: 0 }} />
        
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, marginBottom: 6 }}>Workout beenden?</div>
          <div
            style={{
              color: M.mut,
              fontSize: 14,
              marginBottom: 16,
              lineHeight: 1.45,
            }}
          >
            {name} · {fmtUp(durationSec)} · {doneSets}/{totalSets} Sätze · {(volumeKg / 1000).toFixed(1)}t
          </div>
        </div>

        {/* Feedback-Sektion */}
        {exercises.length > 0 && (
          <div style={{ marginBottom: 18, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 1.2,
                color: M.mut,
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: 8,
                flexShrink: 0,
              }}
            >
              Übungs-Feedback (für die KI)
            </div>
            <div
              style={{
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                paddingRight: 4,
                maxHeight: 160,
              }}
            >
              {Array.from(new Set(exercises)).map((exName) => {
                const current = feedback[exName];
                const setRating = (rating: "like" | "dislike" | "pain") => {
                  setFeedback((prev) => {
                    const next = { ...prev };
                    if (next[exName]?.rating === rating) {
                      delete next[exName];
                    } else {
                      next[exName] = { rating };
                    }
                    return next;
                  });
                };

                return (
                  <div
                    key={exName}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "rgba(255,255,255,.015)",
                      border: "1px solid " + M.line2,
                      borderRadius: 12,
                      padding: "8px 12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        color: M.fg,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginRight: 10,
                        flex: 1,
                      }}
                    >
                      {exName}
                    </span>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => setRating("like")}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: "none",
                          background: current?.rating === "like" ? M.accSoft : "transparent",
                          color: current?.rating === "like" ? M.acc : M.mut,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Icon name="like" size={16} color={current?.rating === "like" ? M.acc : M.mut} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRating("dislike")}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: "none",
                          background: current?.rating === "dislike" ? "rgba(255,255,255,.06)" : "transparent",
                          color: current?.rating === "dislike" ? M.fg : M.mut,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Icon name="dislike" size={16} color={current?.rating === "dislike" ? M.fg : M.mut} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRating("pain")}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: "none",
                          background: current?.rating === "pain" ? "rgba(239, 68, 68, 0.15)" : "transparent",
                          color: current?.rating === "pain" ? "#ef4444" : M.mut,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Icon name="alertCircle" size={16} color={current?.rating === "pain" ? "#ef4444" : M.mut} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ flexShrink: 0 }}>
          <button
            disabled={busy}
            onClick={() => onSave(feedback)}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 14,
              border: "none",
              background: M.acc,
              color: M.accInk,
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: 0.8,
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <Icon name="check" size={18} stroke={2.6} color={M.accInk} /> SPEICHERN
          </button>
          
          <button
            disabled={busy}
            onClick={onDiscard}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 14,
              border: "1px solid " + M.line,
              background: M.card,
              color: M.fg,
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: 0.8,
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.7 : 1,
              marginBottom: 10,
            }}
          >
            VERWERFEN
          </button>
          
          <button
            disabled={busy}
            onClick={onClose}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 14,
              border: "none",
              background: "transparent",
              color: M.mut,
              fontFamily: M.body,
              fontWeight: 600,
              fontSize: 15,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
