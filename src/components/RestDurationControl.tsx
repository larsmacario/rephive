import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { M } from "../theme";
import { Icon } from "./Icon";
import { MStepper } from "./widgets";

const PANEL_WIDTH = 248;
const PANEL_Z = 200;
const REST_PRESETS = [45, 60, 75, 90, 120, 150, 180] as const;

function fmtRestSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export interface RestDurationControlProps {
  value: number;
  onChangeExercise: (seconds: number) => void;
  onChangeWorkout: (seconds: number) => void;
}

export function RestDurationControl({ value, onChangeExercise, onChangeWorkout }: RestDurationControlProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setDraft(value);
  }, [open, value]);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8));
    setPos({ top: rect.bottom + 8, left });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const applyExercise = (seconds: number) => {
    setDraft(seconds);
    onChangeExercise(seconds);
  };

  const applyWorkout = (seconds: number) => {
    setDraft(seconds);
    onChangeWorkout(seconds);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((current) => {
            const next = !current;
            if (next) updatePosition();
            return next;
          });
        }}
        aria-label="Pausendauer ändern"
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 6,
          padding: "6px 12px",
          borderRadius: 999,
          border: "1px solid " + (open ? M.line : M.line2),
          background: open ? M.cardHi : M.card,
          color: M.mut,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: M.body,
          flexShrink: 0,
        }}
      >
        <Icon name="clock" size={14} stroke={2} color={M.mut2} />
        Pausendauer · {fmtRestSec(value)}
        <Icon name="chevD" size={14} stroke={2.2} color={M.mut2} />
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Pausendauer"
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: PANEL_WIDTH,
                padding: 14,
                borderRadius: 14,
                border: "1px solid " + M.line2,
                background: M.cardHi,
                boxShadow: "0 12px 32px rgba(0,0,0,.45)",
                zIndex: PANEL_Z,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: M.mut2, marginBottom: 10 }}>
                PAUSE
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {REST_PRESETS.map((preset) => {
                  const selected = draft === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => applyExercise(preset)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid " + (selected ? M.brandBorder : M.line2),
                        background: selected ? M.brandSoft : M.card,
                        color: selected ? M.brand : M.fg,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: M.body,
                      }}
                    >
                      {fmtRestSec(preset)}
                    </button>
                  );
                })}
              </div>
              <MStepper
                value={draft}
                min={30}
                max={300}
                step={15}
                fmt={fmtRestSec}
                onChange={(seconds) => applyExercise(seconds)}
              />
              <button
                type="button"
                onClick={() => applyWorkout(draft)}
                style={{
                  width: "100%",
                  marginTop: 14,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid " + M.line2,
                  background: M.card,
                  color: M.fg,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: M.body,
                  textAlign: "left",
                }}
              >
                Für ganzes Workout übernehmen
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export { fmtRestSec };
