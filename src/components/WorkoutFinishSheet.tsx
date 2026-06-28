import { useState, useRef, useLayoutEffect, useCallback, useEffect } from "react";
import { brandButtonStyle, M } from "../theme";
import { fmtUp } from "../lib/engine";
import { Icon } from "./Icon";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { ProteinPresetLogSheet } from "./ProteinPresetLogSheet";
import { formatPresetChipLabel, getRecoveryPreset } from "../lib/recoveryEngine";

export interface WorkoutFinishRecoveryProps {
  sessionLine: string;
  remainingG: number;
  suggestionPresetIds: string[];
  userId: string;
  onLogged: (label: string) => void;
  onRefresh: () => void;
  onDismiss: () => void;
  loggedSuggestionLabel?: string | null;
}

export interface WorkoutFinishSheetProps {
  open?: boolean;
  name: string;
  durationSec: number;
  doneSets: number;
  totalSets: number;
  volumeKg: number;
  busy?: boolean;
  exercises?: string[];
  recovery?: WorkoutFinishRecoveryProps | null;
  onSave: (feedback: Record<string, { rating: "like" | "dislike" | "pain" }>) => void;
  onDiscard: () => void;
  onClose: () => void;
}

const uniqueExercises = (exercises: string[]) => Array.from(new Set(exercises));

const FEEDBACK_LEGEND = [
  { rating: "like" as const, icon: "like" as const, label: "Gefällt mir", color: M.brand },
  { rating: "dislike" as const, icon: "dislike" as const, label: "Ersetzen", color: M.mut },
  { rating: "pain" as const, icon: "alertCircle" as const, label: "Schmerzen", color: "#ef4444" },
];

function FeedbackLegend() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 14px",
        marginTop: 8,
      }}
    >
      {FEEDBACK_LEGEND.map((item) => (
        <div
          key={item.rating}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: M.mut,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              border: "1px solid " + M.line2,
              background: "rgba(255,255,255,.02)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name={item.icon} size={14} color={item.color} />
          </span>
          {item.label}
        </div>
      ))}
    </div>
  );
}

export function WorkoutFinishSheet({
  open = true,
  name,
  durationSec,
  doneSets,
  totalSets,
  volumeKg,
  busy,
  exercises = [],
  recovery,
  onSave,
  onDiscard,
  onClose,
}: WorkoutFinishSheetProps) {
  const [feedback, setFeedback] = useState<Record<string, { rating: "like" | "dislike" | "pain" }>>({});
  const [canScroll, setCanScroll] = useState(false);
  const [atBottom, setAtBottom] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activePreset = activePresetId ? getRecoveryPreset(activePresetId) ?? null : null;

  const exerciseList = uniqueExercises(exercises);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanScroll(false);
      setAtBottom(true);
      return;
    }
    const overflow = el.scrollHeight > el.clientHeight + 2;
    setCanScroll(overflow);
    setAtBottom(!overflow || el.scrollHeight - el.scrollTop - el.clientHeight < 8);
  }, []);

  useLayoutEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);
    return () => ro.disconnect();
  }, [exerciseList.length, updateScrollState]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let lastY = 0;

    const onTouchStart = (e: TouchEvent) => {
      lastY = e.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      const dy = touch.clientY - lastY;
      lastY = touch.clientY;

      const { scrollTop, scrollHeight, clientHeight } = el;
      const scrollAtTop = scrollTop <= 0;
      const scrollAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      if ((scrollAtTop && dy > 0) || (scrollAtBottom && dy < 0)) {
        e.preventDefault();
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [exerciseList.length]);

  const showScrollHint = canScroll && !atBottom && exerciseList.length > 2;
  const showBottomFade = canScroll && !atBottom;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      zIndex={30}
      fitContent={false}
      wrapScroll={false}
      lockBodyScroll
      aria-label="Workout beenden"
    >
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, marginBottom: 6 }}>Workout beenden?</div>
        <div
          style={{
            color: M.mut,
            fontSize: 14,
            marginBottom: exerciseList.length > 0 ? 12 : 16,
            lineHeight: 1.45,
          }}
        >
          {name} · {fmtUp(durationSec)} · {doneSets}/{totalSets} Sätze · {(volumeKg / 1000).toFixed(1)}t
        </div>
      </div>

      {exerciseList.length > 0 && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            marginBottom: 14,
          }}
        >
          <div style={{ flexShrink: 0, marginBottom: showScrollHint ? 4 : 8 }}>
            <div
              style={{
                fontSize: 13,
                letterSpacing: 1.2,
                color: M.mut,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Übungs-Feedback
            </div>
            <FeedbackLegend />
            {showScrollHint && (
              <div style={{ fontSize: 13, color: M.mut, marginTop: 4, fontWeight: 600 }}>
                Weitere Übungen — nach unten scrollen
              </div>
            )}
          </div>

          <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
            <div
              ref={scrollRef}
              onScroll={updateScrollState}
              style={{
                height: "100%",
                overflowY: "auto",
                overscrollBehavior: "contain",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                paddingRight: 4,
                paddingBottom: 12,
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-y",
              }}
            >
              {exerciseList.map((exName) => {
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
                      flexShrink: 0,
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
                          background: current?.rating === "like" ? M.brandSoft : "transparent",
                          color: current?.rating === "like" ? M.brand : M.mut,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Icon name="like" size={16} color={current?.rating === "like" ? M.brand : M.mut} />
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

            {showBottomFade && (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  right: 4,
                  bottom: 0,
                  height: 36,
                  pointerEvents: "none",
                  background: `linear-gradient(to bottom, transparent, ${M.panel})`,
                }}
              />
            )}
          </div>
        </div>
      )}

      {recovery ? (
        <div style={{ flexShrink: 0, marginBottom: 12 }}>
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 16,
              background: M.card,
              border: "1px solid " + M.line2,
            }}
          >
            <div
              style={{
                fontSize: 13,
                letterSpacing: 1.2,
                color: M.mut,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Recovery
            </div>
            <div style={{ fontSize: 13, color: M.mut, marginTop: 6, fontWeight: 600 }}>{recovery.sessionLine}</div>
            <div style={{ fontSize: 14, color: M.fg, marginTop: 8, lineHeight: 1.45 }}>
              {recovery.remainingG > 0
                ? `Für heute noch ~${recovery.remainingG} g Protein offen.`
                : "Protein-Ziel für heute erreicht — optional trotzdem loggen."}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {recovery.suggestionPresetIds.map((presetId) => {
                const preset = getRecoveryPreset(presetId);
                if (!preset) return null;
                const logged = recovery.loggedSuggestionLabel === preset.label;
                return (
                  <MButton
                    key={presetId}
                    type="button"
                    variant={logged ? "primary" : "secondary"}
                    size="sm"
                    disabled={logged}
                    onClick={() => setActivePresetId(presetId)}
                    style={{ borderRadius: 999 }}
                  >
                    {logged ? `${formatPresetChipLabel(preset)} ✓` : formatPresetChipLabel(preset)}
                  </MButton>
                );
              })}
            </div>
            {!recovery.loggedSuggestionLabel ? (
              <MButton
                type="button"
                variant="ghost"
                size="md"
                fullWidth
                onClick={recovery.onDismiss}
                style={{ marginTop: 8 }}
              >
                Später
              </MButton>
            ) : null}
          </div>
        </div>
      ) : null}

      <div style={{ flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
            padding: "12px 14px",
            borderRadius: 16,
            background: M.card,
            border: "1px solid " + M.line2,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                letterSpacing: 1.2,
                color: M.mut,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Speichern
            </div>
            <div style={{ fontSize: 13, color: M.mut, marginTop: 4, fontWeight: 600 }}>
              {doneSets}/{totalSets} Sätze · {fmtUp(durationSec)}
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSave(feedback)}
            style={{
              ...brandButtonStyle(),
              flex: "0 0 auto",
              minHeight: 44,
              padding: "0 18px",
              borderRadius: 12,
              border: "none",
              cursor: busy ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 15,
              opacity: busy ? 0.45 : 1,
            }}
          >
            {(volumeKg / 1000).toFixed(1)}t
            <Icon name="chevR" size={16} color={M.brandInk} stroke={2.4} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <MButton
            type="button"
            disabled={busy}
            aria-label="Workout verwerfen"
            onClick={onDiscard}
            variant="secondary"
            size="md"
            fullWidth
          >
            <Icon name="trash" size={18} stroke={2.2} color={M.mut} /> Verwerfen
          </MButton>
        </div>

        <MButton type="button" disabled={busy} onClick={onClose} variant="ghost" size="md" fullWidth>
          Abbrechen
        </MButton>
      </div>

      {recovery ? (
        <ProteinPresetLogSheet
          open={!!activePreset}
          preset={activePreset}
          onClose={() => setActivePresetId(null)}
          onSaved={() => {
            if (activePreset) {
              recovery.onLogged(activePreset.label);
              recovery.onRefresh();
            }
            setActivePresetId(null);
          }}
          userId={recovery.userId}
          logSource="post_workout"
        />
      ) : null}
    </BottomSheet>
  );
}
