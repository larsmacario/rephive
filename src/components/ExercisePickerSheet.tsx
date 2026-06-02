import { useMemo, useState } from "react";
import type { LibraryExercise } from "../data";
import { normalizeMuscleGroup, metricShort } from "../lib/exerciseCatalog";
import { MuscleGroupFilterChips } from "./MuscleGroupFilterChips";
import { M } from "../theme";
import { Icon } from "./Icon";
import { ExerciseFormSheet } from "./ExerciseFormSheet";

export interface ExercisePickerSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: LibraryExercise) => void;
  library: LibraryExercise[];
  loading?: boolean;
  title?: string;
  showFreeText?: boolean;
  onFreeText?: (name: string) => void;
  allowCreate?: boolean;
  onLibraryChange?: () => void;
}

export function ExercisePickerSheet({
  open,
  onClose,
  onSelect,
  library,
  loading,
  title = "Übungsbibliothek",
  showFreeText,
  onFreeText,
  allowCreate,
  onLibraryChange,
}: ExercisePickerSheetProps) {
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return library.filter((ex) => {
      if (groupFilter && normalizeMuscleGroup(ex.group) !== groupFilter) return false;
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [library, query, groupFilter]);

  if (!open) return null;

  const handleFreeText = () => {
    const name = freeText.trim();
    if (!name || !onFreeText) return;
    onFreeText(name);
    setFreeText("");
    onClose();
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(5,7,5,.6)",
          backdropFilter: "blur(4px)",
          zIndex: 20,
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
            maxHeight: "78%",
            display: "flex",
            flexDirection: "column",
            padding: "16px 18px 24px",
          }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: M.line, margin: "0 auto 14px" }} />
          <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, marginBottom: 12 }}>{title}</div>

          {showFreeText && onFreeText && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleFreeText())}
                placeholder="Eigener Übungsname…"
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid " + M.line,
                  background: M.card,
                  color: M.fg,
                  fontSize: 15,
                  outline: "none",
                }}
              />
              <button
                disabled={!freeText.trim()}
                onClick={handleFreeText}
                style={{
                  padding: "0 16px",
                  borderRadius: 12,
                  border: "none",
                  background: M.acc,
                  color: M.accInk,
                  fontFamily: M.disp,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: freeText.trim() ? "pointer" : "not-allowed",
                  opacity: freeText.trim() ? 1 : 0.5,
                }}
              >
                OK
              </button>
            </div>
          )}

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen…"
            style={{
              width: "100%",
              padding: "11px 14px",
              borderRadius: 12,
              border: "1px solid " + M.line,
              background: M.card,
              color: M.fg,
              fontSize: 14,
              outline: "none",
              marginBottom: 10,
              boxSizing: "border-box",
            }}
          />

          <div style={{ marginBottom: 10 }}>
            <MuscleGroupFilterChips groupFilter={groupFilter} onGroupFilterChange={setGroupFilter} />
          </div>

          {allowCreate && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              style={{
                marginBottom: 10,
                padding: "10px 0",
                border: "none",
                background: "none",
                color: M.acc,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              + Eigene Übung anlegen
            </button>
          )}

          {loading && <div style={{ color: M.mut, fontSize: 14, marginBottom: 12 }}>Lädt…</div>}
          <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, flex: 1, minHeight: 0 }}>
            {!loading && filtered.length === 0 && (
              <div style={{ color: M.mut, fontSize: 14, textAlign: "center", padding: "12px 0" }}>
                Keine Übungen gefunden.
              </div>
            )}
            {filtered.map((ex) => (
              <button
                key={ex.id}
                onClick={() => {
                  onSelect(ex);
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 12px",
                  borderRadius: 12,
                  border: "none",
                  background: M.card,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: M.accSoft,
                    color: M.acc,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "0 0 auto",
                  }}
                >
                  <Icon name="dumbbell" size={18} stroke={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>{ex.name}</div>
                  <div style={{ color: M.mut, fontSize: 12 }}>
                    {ex.group} · {ex.equip} · {metricShort(ex.metric)}
                    {ex.userId ? " · Eigene" : ""}
                  </div>
                </div>
                <Icon name="plus" size={20} color={M.acc} stroke={2.4} />
              </button>
            ))}
          </div>
        </div>
      </div>
      {allowCreate && (
        <ExerciseFormSheet
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            onLibraryChange?.();
          }}
        />
      )}
    </>
  );
}
