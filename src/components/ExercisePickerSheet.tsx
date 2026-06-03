import { useEffect, useMemo, useState } from "react";
import type { LibraryExercise } from "../data";
import { normalizeMuscleGroup, metricShort } from "../lib/exerciseCatalog";
import { BottomSheet } from "./BottomSheet";
import { MuscleGroupSelect } from "./MuscleGroupSelect";
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

  useEffect(() => {
    if (!open) setCreateOpen(false);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return library.filter((ex) => {
      if (groupFilter && normalizeMuscleGroup(ex.group) !== groupFilter) return false;
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [library, query, groupFilter]);

  const handleFreeText = () => {
    const name = freeText.trim();
    if (!name || !onFreeText) return;
    onFreeText(name);
    setFreeText("");
    onClose();
  };

  return (
    <>
      <BottomSheet open={open} onClose={onClose} zIndex={20} aria-label={title}>
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, marginBottom: 12, flexShrink: 0 }}>
          {title}
        </div>

        {showFreeText && onFreeText && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexShrink: 0 }}>
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
            flexShrink: 0,
          }}
        />

        <div style={{ flexShrink: 0 }}>
          <MuscleGroupSelect mode="filter" value={groupFilter} onChange={setGroupFilter} />
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
              flexShrink: 0,
            }}
          >
            + Eigene Übung anlegen
          </button>
        )}

        {loading && (
          <div style={{ color: M.mut, fontSize: 14, marginBottom: 12, flexShrink: 0 }}>Lädt…</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
      </BottomSheet>
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
