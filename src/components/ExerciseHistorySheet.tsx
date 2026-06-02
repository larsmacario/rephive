import { M } from "../theme";
import { Icon } from "./Icon";
import { useExerciseHistory } from "../lib/db";
import { formatSetLine } from "../lib/exerciseCatalog";

export interface ExerciseHistorySheetProps {
  open: boolean;
  onClose: () => void;
  exerciseName: string | null;
}

function formatHistoryDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfTarget.getTime()) / 86400000);

  if (diffDays === 0) return "Heute";
  if (diffDays === 1) return "Gestern";

  const weekday = d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");
  const dateStr = d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
  return `${weekday}, ${dateStr}`;
}

export function ExerciseHistorySheet({ open, onClose, exerciseName }: ExerciseHistorySheetProps) {
  const { data: history, loading, error } = useExerciseHistory(open ? exerciseName : null);

  if (!open || !exerciseName) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,7,5,.6)",
        backdropFilter: "blur(4px)",
        zIndex: 40,
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
          maxHeight: "75%",
          display: "flex",
          flexDirection: "column",
          padding: "16px 18px 24px",
          boxSizing: "border-box",
        }}
      >
        {/* Grabber */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: M.line, margin: "0 auto 14px" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, color: M.acc, fontWeight: 700, textTransform: "uppercase" }}>
              ÜBUNGSVERLAUF
            </div>
            <div
              style={{
                fontFamily: M.disp,
                fontWeight: 700,
                fontSize: 24,
                color: M.fg,
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {exerciseName}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              border: "1px solid " + M.line2,
              background: M.card,
              color: M.fg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="x" size={16} stroke={2.4} />
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0 }}>
          {loading && (
            <div style={{ color: M.mut, fontSize: 14, textAlign: "center", padding: "24px 0" }}>
              Verlauf wird geladen…
            </div>
          )}

          {error && (
            <div style={{ color: "#ff8a8a", fontSize: 14, textAlign: "center", padding: "24px 0" }}>
              Fehler beim Laden des Verlaufs: {error}
            </div>
          )}

          {!loading && !error && (!history || history.length === 0) && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: M.mut,
                textAlign: "center",
                padding: "36px 12px",
                gap: 10,
              }}
            >
              <Icon name="list" size={28} color={M.mut2} stroke={2} />
              <div style={{ fontSize: 15, fontWeight: 600, color: M.fg }}>Noch kein Verlauf</div>
              <div style={{ fontSize: 13, maxWidth: 240, lineHeight: 1.4 }}>
                Sobald du diese Übung in einem Workout ausführst und abschließt, erscheint der Verlauf hier.
              </div>
            </div>
          )}

          {!loading &&
            !error &&
            history &&
            history.map((entry, idx) => (
              <div
                key={entry.sessionId + "-" + idx}
                style={{
                  background: M.card,
                  border: "1px solid " + M.line2,
                  borderRadius: 16,
                  padding: "12px 14px",
                }}
              >
                {/* Session Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: M.fg,
                      maxWidth: "70%",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {entry.sessionName}
                  </div>
                  <div style={{ fontSize: 11.5, color: M.mut, fontWeight: 600 }}>
                    {formatHistoryDate(entry.performedAt)}
                  </div>
                </div>

                {entry.note && (
                  <div style={{ fontSize: 12, color: M.mut, marginBottom: 8, fontStyle: "italic" }}>
                    Hinweis: {entry.note}
                  </div>
                )}

                {/* Sets List */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {entry.sets.map((set, sIdx) => {
                    const line = formatSetLine(set, entry.metric);
                    return (
                      <div
                        key={sIdx}
                        style={{
                          background: set.done ? M.accSoft : "rgba(255,255,255,0.03)",
                          border: "1px solid " + (set.done ? M.acc : M.line2),
                          borderRadius: 10,
                          padding: "6px 10px",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 12.5,
                          fontWeight: 600,
                        }}
                      >
                        <span style={{ color: set.done ? M.acc : M.mut, fontSize: 11 }}>S{sIdx + 1}</span>
                        <span style={{ color: M.fg, fontFamily: M.disp, fontWeight: 700, fontSize: 14 }}>
                          {line}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
