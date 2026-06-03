import { useEffect, useState } from "react";
import { M } from "../theme";
import type { LibraryExercise } from "../data";
import type { ExerciseMetric } from "../lib/exerciseCatalog";
import { defaultSetValue } from "../lib/exerciseSets";
import { useAuth } from "../lib/auth";
import { usePreferences } from "../lib/preferences";
import { createWorkout, updateWorkout, useExercises, useWorkout } from "../lib/db";
import {
  buildUniformTemplateSets,
  countTemplateSets,
  setsFromStored,
  type SetMode,
  type TemplateSet,
} from "../lib/exerciseSets";
import { Icon } from "../components/Icon";
import { ExercisePickerSheet } from "../components/ExercisePickerSheet";
import { MTag } from "../components/widgets";
import { ExerciseSetConfigurator } from "../components/ExerciseSetConfigurator";
import { SupersetBlock, supersetLinkButtonStyle } from "../components/SupersetBlock";
import {
  isLinkedWithPrevious,
  linkWithPrevious,
  segmentExercises,
  sanitizeSupersetIds,
  unlinkFromSuperset,
} from "../lib/superset";

interface BuilderItem extends LibraryExercise {
  setMode: SetMode;
  setRows: TemplateSet[];
  supersetId?: string;
  catalogExerciseId?: string;
}

function workoutExerciseToItem(
  exercise: {
    id: string;
    name: string;
    note?: string;
    supersetId?: string;
    catalogExerciseId?: string | null;
    metric: ExerciseMetric;
    sets: { reps: number; kg?: number }[];
  },
  defaults: { sets: number; reps: number },
): BuilderItem {
  const [group = "Custom", equip = ""] = (exercise.note ?? "").split(" · ");
  const { setMode, setRows } = setsFromStored(exercise.sets, defaults, exercise.metric);
  return {
    id: exercise.id,
    name: exercise.name,
    group,
    equip,
    userId: null,
    metric: exercise.metric,
    setMode,
    setRows,
    supersetId: exercise.supersetId,
    catalogExerciseId: exercise.catalogExerciseId ?? undefined,
  };
}

export interface BuilderScreenProps {
  workoutId?: string;
  onBack: () => void;
  onSave: () => void;
}

export function BuilderScreen({ workoutId, onBack, onSave }: BuilderScreenProps) {
  const isEditing = Boolean(workoutId);
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const { data: existingWorkout, loading: workoutLoading } = useWorkout(workoutId ?? null);
  const { data: library, loading, reload: reloadExercises } = useExercises();
  const [items, setItems] = useState<BuilderItem[]>([]);
  const [name, setName] = useState("Neues Workout");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(!isEditing);

  const exLibrary = library ?? [];
  const defaults = { sets: preferences.defaultSets, reps: preferences.defaultReps };

  useEffect(() => {
    if (!isEditing || !existingWorkout || initialized) return;
    setName(existingWorkout.name);
    setTags(existingWorkout.tags.filter((t) => t !== "Custom"));
    setItems(existingWorkout.exercises.map((e) => workoutExerciseToItem(e, defaults)));
    setInitialized(true);
  }, [isEditing, existingWorkout, initialized, preferences.defaultSets, preferences.defaultReps]);

  const add = (ex: LibraryExercise) => {
    setItems((it) => [
      ...it,
      {
        id: crypto.randomUUID(),
        catalogExerciseId: ex.id,
        name: ex.name,
        group: ex.group,
        equip: ex.equip,
        userId: ex.userId,
        metric: ex.metric,
        youtubeUrl: ex.youtubeUrl,
        setMode: "uniform" as const,
        setRows: buildUniformTemplateSets(
          defaults.sets,
          defaultSetValue(ex.metric, defaults.reps),
          0,
          ex.metric,
        ),
      },
    ]);
    setPicker(false);
  };

  const updateItemSets = (id: string, setMode: SetMode, setRows: TemplateSet[]) => {
    setItems((it) => it.map((x) => (x.id === id ? { ...x, setMode, setRows } : x)));
  };

  const removeItem = (id: string) =>
    setItems((it) => sanitizeSupersetIds(it.filter((x) => x.id !== id)));

  const handleLink = (id: string) => {
    setItems((it) => sanitizeSupersetIds(linkWithPrevious(it, id)));
  };

  const handleUnlink = (id: string) => {
    setItems((it) => unlinkFromSuperset(it, id));
  };

  const totalSets = countTemplateSets(items);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const handleSave = async () => {
    if (!user || items.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const durationMin = Math.max(20, Math.round(totalSets * 3));
      const cleaned = sanitizeSupersetIds(items);
      const payload = {
        name: name.trim() || "Neues Workout",
        sub: tags.join(" · ") || "Custom",
        tags: tags.length ? tags : ["Custom"],
        durationMin,
        exercises: cleaned.map((x) => ({
          name: x.name,
          note: `${x.group} · ${x.equip}`,
          supersetId: x.supersetId,
          catalogExerciseId: x.catalogExerciseId ?? null,
          metric: x.metric,
          sets: x.setRows.map((s) => ({ reps: s.reps, kg: s.kg, done: false })),
        })),
      };

      if (isEditing && workoutId) {
        await updateWorkout(workoutId, payload);
      } else {
        await createWorkout(user.id, payload);
      }
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  if (isEditing && (workoutLoading || !initialized)) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: M.mut, fontSize: 14 }}>
        Workout wird geladen…
      </div>
    );
  }

  if (isEditing && !workoutLoading && !existingWorkout) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 22 }}>
        <div style={{ color: M.mut, fontSize: 14 }}>Workout nicht gefunden.</div>
        <button
          onClick={onBack}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: "none",
            background: M.acc,
            color: M.accInk,
            fontFamily: M.disp,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Zurück
        </button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "2px 22px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: M.mut, display: "flex" }}>
          <Icon name="chevL" size={24} stroke={2.2} />
        </button>
        <span style={{ fontSize: 12, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>
          {isEditing ? "WORKOUT BEARBEITEN" : "NEUES WORKOUT"}
        </span>
        <button
          disabled={saving || items.length === 0}
          onClick={handleSave}
          style={{
            background: "none",
            border: "none",
            cursor: saving || items.length === 0 ? "not-allowed" : "pointer",
            fontFamily: M.disp,
            fontWeight: 700,
            color: M.acc,
            fontSize: 16,
            letterSpacing: 0.5,
            opacity: saving || items.length === 0 ? 0.5 : 1,
          }}
        >
          SAVE
        </button>
      </div>
      {error && <div style={{ padding: "0 22px 8px", color: "#ff8a8a", fontSize: 13 }}>{error}</div>}
      <div style={{ padding: "0 22px 8px" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%",
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: 30,
            lineHeight: 1,
            background: "transparent",
            border: "none",
            color: M.fg,
            outline: "none",
            padding: 0,
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          {tags.map((t) => (
            <MTag key={t}>{t}</MTag>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            placeholder="Tag hinzufügen…"
            style={{
              flex: "1 1 120px",
              minWidth: 100,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid " + M.line,
              background: M.card,
              color: M.fg,
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
      </div>
      <div style={{ padding: "14px 22px 10px" }}>
        <span style={{ fontSize: 11, letterSpacing: 1.5, color: M.mut, fontWeight: 700, whiteSpace: "nowrap" }}>
          {items.length} ÜBUNGEN · {totalSets} SÄTZE
        </span>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "0 22px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {segmentExercises(items).map((seg) => {
          const renderItem = (x: BuilderItem, itemIndex: number) => {
            const linked = isLinkedWithPrevious(items, x.id);
            return (
              <div
                key={x.id + x.name}
                style={{
                  background: M.card,
                  border: "1px solid " + M.line2,
                  borderRadius: 16,
                  padding: "13px 14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                  <div style={{ color: M.mut2, display: "flex", paddingTop: 2 }}>
                    <Icon name="grip" size={20} stroke={2.4} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 15.5,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {x.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: M.mut,
                        marginTop: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {x.group} · {x.equip}
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(x.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: M.mut2,
                      display: "flex",
                      padding: 4,
                    }}
                  >
                    <Icon name="trash" size={16} stroke={2} />
                  </button>
                </div>
                {itemIndex > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <button
                      type="button"
                      onClick={() => (linked ? handleUnlink(x.id) : handleLink(x.id))}
                      style={supersetLinkButtonStyle(linked)}
                    >
                      {linked ? "Supersatz lösen" : "Mit vorheriger verknüpfen"}
                    </button>
                  </div>
                )}
                <ExerciseSetConfigurator
                  variant="template"
                  setMode={x.setMode}
                  sets={x.setRows}
                  metric={x.metric}
                  onChange={(setMode, setRows) => updateItemSets(x.id, setMode, setRows as TemplateSet[])}
                  compact
                />
              </div>
            );
          };

          if (seg.kind === "single") {
            return renderItem(seg.exercise as BuilderItem, seg.index);
          }
          return (
            <SupersetBlock key={seg.exercises.map((e) => e.id).join("-")}>
              {(seg.exercises as BuilderItem[]).map((x, i) => renderItem(x, seg.startIndex + i))}
            </SupersetBlock>
          );
        })}
        <button
          onClick={() => setPicker(true)}
          style={{
            padding: "15px 0",
            borderRadius: 16,
            border: "1.5px dashed " + M.line,
            background: "transparent",
            color: M.acc,
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: 0.8,
            cursor: "pointer",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Icon name="plus" size={20} stroke={2.6} /> ÜBUNG HINZUFÜGEN
        </button>
      </div>
      <ExercisePickerSheet
        open={picker}
        onClose={() => setPicker(false)}
        onSelect={add}
        library={exLibrary}
        loading={loading}
        allowCreate
        onLibraryChange={() => reloadExercises()}
      />
    </div>
  );
}
