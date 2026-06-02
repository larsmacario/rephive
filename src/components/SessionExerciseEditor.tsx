import { useEffect, useState } from "react";
import type { LibraryExercise, SessionExercise } from "../data";
import { sessionMetrics } from "../lib/engine";
import {
  buildUniformTrackedSets,
  defaultSetValue,
  detectSetMode,
  type SetMode,
  type TrackedSet,
} from "../lib/exerciseSets";
import { M } from "../theme";
import { Icon } from "./Icon";
import { ExercisePickerSheet } from "./ExercisePickerSheet";
import { MStat } from "./widgets";
import { ExerciseSetConfigurator } from "./ExerciseSetConfigurator";
import { SupersetBlock, supersetLinkButtonStyle } from "./SupersetBlock";
import {
  isLinkedWithPrevious,
  linkWithPrevious,
  segmentExercises,
  sanitizeSupersetIds,
  unlinkFromSuperset,
} from "../lib/superset";

export interface SessionExerciseEditorProps {
  exercises: SessionExercise[];
  onChange: (exercises: SessionExercise[]) => void;
  library?: LibraryExercise[];
  libraryLoading?: boolean;
  onLibraryChange?: () => void;
  defaultSets?: number;
  defaultReps?: number;
}

function newId() {
  return crypto.randomUUID();
}

export function SessionExerciseEditor({
  exercises,
  onChange,
  library = [],
  libraryLoading,
  onLibraryChange,
  defaultSets = 3,
  defaultReps = 10,
}: SessionExerciseEditorProps) {
  const [open, setOpen] = useState<string>(exercises[0]?.id ?? "");
  const [picker, setPicker] = useState(false);
  const [setModes, setSetModes] = useState<Record<string, SetMode>>({});
  const metrics = sessionMetrics(exercises);

  useEffect(() => {
    setSetModes((prev) => {
      const next = { ...prev };
      for (const ex of exercises) {
        if (!next[ex.id]) {
          next[ex.id] = detectSetMode(ex.sets);
        }
      }
      return next;
    });
  }, [exercises]);

  const updateExercise = (exId: string, sets: TrackedSet[], setMode?: SetMode) => {
    onChange(exercises.map((e) => (e.id === exId ? { ...e, sets } : e)));
    if (setMode) {
      setSetModes((prev) => ({ ...prev, [exId]: setMode }));
    }
  };

  const removeExercise = (exId: string) => {
    const next = sanitizeSupersetIds(exercises.filter((e) => e.id !== exId));
    onChange(next);
    setSetModes((prev) => {
      const copy = { ...prev };
      delete copy[exId];
      return copy;
    });
    if (open === exId) setOpen(next[0]?.id ?? "");
  };

  const addExercise = (ex: LibraryExercise) => {
    const item: SessionExercise = {
      id: newId(),
      name: ex.name,
      note: `${ex.group} · ${ex.equip}`,
      metric: ex.metric,
      sets: buildUniformTrackedSets(
        defaultSets,
        defaultSetValue(ex.metric, defaultReps),
        0,
        false,
        ex.metric,
      ),
    };
    setSetModes((prev) => ({ ...prev, [item.id]: "uniform" }));
    onChange([...exercises, item]);
    setOpen(item.id);
    setPicker(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <MStat label="SÄTZE" value={String(metrics.setCount)} />
        <MStat label="VOLUMEN" value={`${(metrics.volumeKg / 1000).toFixed(1)}t`} />
      </div>

      {segmentExercises(exercises).map((seg) => {
        const renderExercise = (ex: SessionExercise, ei: number) => {
        const isOpen = open === ex.id;
        const done = ex.sets.filter((s) => s.done).length;
        const complete = ex.sets.length > 0 && done === ex.sets.length;
        const setMode = setModes[ex.id] ?? detectSetMode(ex.sets);
        const linked = isLinkedWithPrevious(exercises, ex.id);

        return (
          <div
            key={ex.id}
            style={{
              background: M.card,
              border: "1px solid " + (isOpen ? M.line : M.line2),
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 12px 12px 15px" }}>
              <button
                onClick={() => setOpen(isOpen ? "" : ex.id)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  padding: 0,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    flex: "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: complete ? M.acc : M.accSoft,
                    color: complete ? M.accInk : M.acc,
                    fontFamily: M.disp,
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  {complete ? <Icon name="check" size={18} stroke={2.6} /> : ei + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: M.fg,
                      fontWeight: 600,
                      fontSize: 16,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {ex.name}
                  </div>
                  <div style={{ color: M.mut, fontSize: 12, marginTop: 1 }}>
                    {ex.note ? `${ex.note} · ` : ""}
                    {done}/{ex.sets.length} Sätze
                  </div>
                </div>
                <Icon name={isOpen ? "chevD" : "chevR"} size={18} color={M.mut2} stroke={2.2} />
              </button>
              <button
                onClick={() => removeExercise(ex.id)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid " + M.line2,
                  background: "transparent",
                  color: M.mut2,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "0 0 auto",
                }}
              >
                <Icon name="trash" size={16} stroke={2} />
              </button>
            </div>
            {isOpen && (
              <div style={{ padding: "0 15px 14px" }}>
                {ei > 0 && (
                  <div style={{ paddingBottom: 10 }}>
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          linked
                            ? unlinkFromSuperset(exercises, ex.id)
                            : sanitizeSupersetIds(linkWithPrevious(exercises, ex.id)),
                        )
                      }
                      style={supersetLinkButtonStyle(linked)}
                    >
                      {linked ? "Supersatz lösen" : "Mit vorheriger verknüpfen"}
                    </button>
                  </div>
                )}
                <ExerciseSetConfigurator
                  variant="tracked"
                  setMode={setMode}
                  sets={ex.sets}
                  metric={ex.metric}
                  onChange={(mode, sets) => updateExercise(ex.id, sets as TrackedSet[], mode)}
                  compact
                />
              </div>
            )}
          </div>
        );
        };

        if (seg.kind === "single") {
          return renderExercise(seg.exercise as SessionExercise, seg.index);
        }
        return (
          <SupersetBlock key={seg.exercises.map((e) => e.id).join("-")}>
            {(seg.exercises as SessionExercise[]).map((ex, i) =>
              renderExercise(ex, seg.startIndex + i),
            )}
          </SupersetBlock>
        );
      })}

      <button
        onClick={() => setPicker((p) => !p)}
        style={{
          padding: "12px 0",
          borderRadius: 12,
          border: "1px dashed " + M.line,
          background: "transparent",
          color: M.acc,
          fontFamily: M.disp,
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        + Übung hinzufügen
      </button>

      <ExercisePickerSheet
        open={picker}
        onClose={() => setPicker(false)}
        onSelect={addExercise}
        library={library}
        loading={libraryLoading}
        allowCreate
        onLibraryChange={onLibraryChange}
      />
    </div>
  );
}
