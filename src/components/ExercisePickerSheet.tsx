import { useEffect, useMemo, useState } from "react";
import type { LibraryExercise } from "../data";
import { normalizeMuscleGroup, metricShort } from "../lib/exerciseCatalog";
import { isTurboTrackingLibraryExercise } from "../lib/turboTracking";
import { BottomSheet } from "./BottomSheet";
import { MuscleGroupSelect } from "./MuscleGroupSelect";
import { M } from "../theme";
import { Icon } from "./Icon";
import { ExerciseListRow, ExerciseListRowDumbbellIcon } from "./ExerciseListRow";
import { MButton } from "./MButton";
import { ExerciseFormSheet } from "./ExerciseFormSheet";

export interface ExercisePickerSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: LibraryExercise) => void;
  onSelectMultiple?: (exercises: LibraryExercise[]) => void;
  mode?: "single" | "multi";
  turboTrackingOnly?: boolean;
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
  onSelectMultiple,
  mode = "single",
  turboTrackingOnly = false,
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isMulti = mode === "multi" && Boolean(onSelectMultiple);

  useEffect(() => {
    if (!open) {
      setCreateOpen(false);
      setSelectedIds([]);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return library.filter((ex) => {
      if (turboTrackingOnly && !isTurboTrackingLibraryExercise(ex)) return false;
      if (groupFilter && normalizeMuscleGroup(ex.group) !== groupFilter) return false;
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [library, query, groupFilter, turboTrackingOnly]);

  const toggleMulti = (ex: LibraryExercise) => {
    setSelectedIds((prev) => (prev.includes(ex.id) ? prev.filter((id) => id !== ex.id) : [...prev, ex.id]));
  };

  const confirmMulti = () => {
    if (!onSelectMultiple) return;
    const picked = selectedIds
      .map((id) => library.find((ex) => ex.id === id))
      .filter((ex): ex is LibraryExercise => Boolean(ex));
    if (picked.length === 0) return;
    onSelectMultiple(picked);
    onClose();
  };

  const handleFreeText = () => {
    const name = freeText.trim();
    if (!name || !onFreeText) return;
    onFreeText(name);
    setFreeText("");
    onClose();
  };

  const headerBlock = (
    <>
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
    </>
  );

  const exerciseList = (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {!loading && filtered.length === 0 && (
        <div style={{ color: M.mut, fontSize: 14, textAlign: "center", padding: "12px 0" }}>
          Keine Übungen gefunden.
        </div>
      )}
      {filtered.map((ex) => {
        const selected = selectedIds.includes(ex.id);
        return (
          <ExerciseListRow
            key={ex.id}
            title={ex.name}
            subtitle={`${ex.group} · ${ex.equip} · ${metricShort(ex.metric)}${ex.userId ? " · Eigene" : ""}`}
            leading={<ExerciseListRowDumbbellIcon />}
            trailing={
              isMulti ? (
                selected ? (
                  <Icon name="check" size={20} color={M.brand} stroke={2.4} />
                ) : (
                  <div style={{ width: 20, height: 20, borderRadius: 6, border: "1.5px solid " + M.line2 }} />
                )
              ) : (
                <Icon name="plus" size={20} color={M.acc} stroke={2.4} />
              )
            }
            onClick={() => {
              if (isMulti) {
                toggleMulti(ex);
                return;
              }
              onSelect(ex);
              onClose();
            }}
            background="card"
            style={{
              border: selected ? "1px solid " + M.brandBorder : "1px solid transparent",
              background: selected ? M.brandSoft : M.card,
            }}
          />
        );
      })}
    </div>
  );

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        zIndex={20}
        aria-label={title}
        fitContent={!isMulti}
        wrapScroll={!isMulti}
        lockBodyScroll={isMulti}
      >
        {isMulti ? (
          <>
            <div style={{ flexShrink: 0 }}>{headerBlock}</div>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                marginBottom: 4,
              }}
            >
              {exerciseList}
            </div>
            <div
              style={{
                flexShrink: 0,
                paddingTop: 12,
                marginTop: 8,
                borderTop: "1px solid " + M.line2,
              }}
            >
              <MButton
                type="button"
                variant="primary"
                size="md"
                fullWidth
                disabled={selectedIds.length === 0}
                onClick={confirmMulti}
                style={{ fontFamily: M.disp, fontWeight: 700, letterSpacing: 0.3 }}
              >
                Weiter ({selectedIds.length})
              </MButton>
            </div>
          </>
        ) : (
          <>
            {headerBlock}
            {exerciseList}
          </>
        )}
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
