import { useEffect, useState } from "react";
import { M } from "../theme";
import { useAuth } from "../lib/auth";
import { usePreferences } from "../lib/preferences";
import { createPlan, createWorkout, updatePlan, useExercises, usePlan, useWorkouts } from "../lib/db";
import type { LibraryExercise, LibraryWorkout } from "../data";
import {
  buildUniformTemplateSets,
  countTemplateSets,
  defaultSetValue,
  serializeTemplateSet,
  type SetMode,
  type TemplateSet,
} from "../lib/exerciseSets";
import { Icon } from "../components/Icon";
import { ExerciseSetConfigurator } from "../components/ExerciseSetConfigurator";
import { BottomSheet } from "../components/BottomSheet";
import { ExercisePickerSheet } from "../components/ExercisePickerSheet";
import { PlanDayAccordion } from "../components/PlanDayAccordion";

interface BuilderDay {
  id: string;
  workoutId: string | null;
  workoutName?: string;
}

interface BuilderItem extends LibraryExercise {
  setMode: SetMode;
  setRows: TemplateSet[];
  catalogExerciseId?: string;
}

type SheetMode = "pick" | "create";

export interface PlanBuilderScreenProps {
  planId?: string;
  onBack: () => void;
  onSave: () => void;
}

export function PlanBuilderScreen({ planId, onBack, onSave }: PlanBuilderScreenProps) {
  const isEditing = Boolean(planId);
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const { data: existingPlan, loading: planLoading } = usePlan(planId ?? null);
  const { data: workouts, loading, reload: reloadWorkouts } = useWorkouts();
  const { data: exerciseLibrary, loading: exercisesLoading, reload: reloadExercises } = useExercises();

  const [name, setName] = useState("Neuer Trainingsplan");
  const [days, setDays] = useState<BuilderDay[]>([]);
  const [initialized, setInitialized] = useState(!isEditing);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>("pick");
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newWorkoutName, setNewWorkoutName] = useState("Neues Workout");
  const [newWorkoutItems, setNewWorkoutItems] = useState<BuilderItem[]>([]);
  const [creatingWorkout, setCreatingWorkout] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);

  const workoutList = workouts ?? [];
  const exLibrary = exerciseLibrary ?? [];

  useEffect(() => {
    if (!isEditing || !existingPlan || initialized) return;
    setName(existingPlan.name);
    setDays(
      existingPlan.days.map((d) => ({
        id: d.id,
        workoutId: d.isRestDay ? null : d.workout?.id ?? null,
        workoutName: d.isRestDay ? undefined : d.workout?.name,
      })),
    );
    setInitialized(true);
  }, [isEditing, existingPlan, initialized]);

  const openSheet = () => {
    setSheetMode("pick");
    setCreateError(null);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setSheetMode("pick");
    setExercisePickerOpen(false);
    setNewWorkoutName("Neues Workout");
    setNewWorkoutItems([]);
    setCreateError(null);
  };

  const startCreateMode = () => {
    setSheetMode("create");
    setCreateError(null);
    setNewWorkoutName("Neues Workout");
    setNewWorkoutItems([]);
  };

  const addRestDay = () => {
    setDays((prev) => [...prev, { id: crypto.randomUUID(), workoutId: null }]);
    closeSheet();
  };

  const addWorkoutDay = (workout: LibraryWorkout) => {
    setDays((prev) => [
      ...prev,
      { id: crypto.randomUUID(), workoutId: workout.id, workoutName: workout.name },
    ]);
    closeSheet();
  };

  const addExercise = (ex: LibraryExercise) => {
    setNewWorkoutItems((items) => [
      ...items,
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
          preferences.defaultSets,
          defaultSetValue(ex.metric, preferences.defaultReps),
          0,
          ex.metric,
        ),
      },
    ]);
    setExercisePickerOpen(false);
  };

  const updateExerciseSets = (id: string, setMode: SetMode, setRows: TemplateSet[]) => {
    setNewWorkoutItems((items) => items.map((x) => (x.id === id ? { ...x, setMode, setRows } : x)));
  };

  const removeExercise = (id: string) => {
    setNewWorkoutItems((items) => items.filter((x) => x.id !== id));
  };

  const totalNewSets = countTemplateSets(newWorkoutItems);
  const canCreateWorkout = newWorkoutName.trim().length > 0 && newWorkoutItems.length > 0;

  const handleCreateWorkout = async () => {
    if (!user || !canCreateWorkout) return;
    setCreatingWorkout(true);
    setCreateError(null);
    try {
      const workoutName = newWorkoutName.trim() || "Neues Workout";
      const durationMin = Math.max(20, Math.round(totalNewSets * 3));
      const workoutId = await createWorkout(user.id, {
        name: workoutName,
        sub: "Custom",
        tags: ["Custom"],
        durationMin,
        exercises: newWorkoutItems.map((x) => ({
          name: x.name,
          note: `${x.group} · ${x.equip}`,
          catalogExerciseId: x.catalogExerciseId ?? null,
          metric: x.metric,
          sets: x.setRows.map((s, index) => serializeTemplateSet(s, index, { done: false })),
        })),
      });
      setDays((prev) => [...prev, { id: crypto.randomUUID(), workoutId, workoutName }]);
      reloadWorkouts();
      closeSheet();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Workout erstellen fehlgeschlagen");
    } finally {
      setCreatingWorkout(false);
    }
  };

  const removeDay = (id: string) => {
    setDays((prev) => prev.filter((d) => d.id !== id));
    setExpandedDayId((prev) => (prev === id ? null : prev));
  };

  const handleToggleDay = (dayId: string) => {
    setExpandedDayId((prev) => (prev === dayId ? null : dayId));
  };

  const moveDay = (index: number, direction: -1 | 1) => {
    setDays((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!user || days.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const workoutDays = days.filter((d) => d.workoutId).length;
      const sub =
        workoutDays > 0
          ? `${workoutDays} Workout${workoutDays === 1 ? "" : "s"} · ${days.length} Tage`
          : `${days.length} Tage`;

      const payload = {
        name: name.trim() || "Neuer Trainingsplan",
        sub,
        days: days.map((d) => ({ workoutId: d.workoutId })),
      };

      if (isEditing && planId) {
        await updatePlan(planId, payload);
      } else {
        await createPlan(user.id, { ...payload, activate: true });
      }
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  if (isEditing && (planLoading || !initialized)) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: M.mut, fontSize: 14 }}>
        Plan wird geladen…
      </div>
    );
  }

  if (isEditing && !planLoading && !existingPlan) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 22 }}>
        <div style={{ color: M.mut, fontSize: 14 }}>Plan nicht gefunden.</div>
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
          {isEditing ? "PLAN BEARBEITEN" : "NEUER PLAN"}
        </span>
        <button
          disabled={saving || days.length === 0}
          onClick={handleSave}
          style={{
            background: "none",
            border: "none",
            cursor: saving || days.length === 0 ? "not-allowed" : "pointer",
            fontFamily: M.disp,
            fontWeight: 700,
            color: M.acc,
            fontSize: 16,
            letterSpacing: 0.5,
            opacity: saving || days.length === 0 ? 0.5 : 1,
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
      </div>

      <div style={{ padding: "14px 22px 10px" }}>
        <span style={{ fontSize: 11, letterSpacing: 1.5, color: M.mut, fontWeight: 700, whiteSpace: "nowrap" }}>
          {days.length} TAGE IM PLAN
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
        {days.map((day, index) => {
          const workout = day.workoutId ? workoutList.find((w) => w.id === day.workoutId) ?? null : null;
          return (
            <PlanDayAccordion
              key={day.id}
              dayId={day.id}
              dayNumber={index + 1}
              label={day.workoutId ? day.workoutName ?? "Workout" : "Ruhetag"}
              isRestDay={!day.workoutId}
              workout={workout}
              expanded={expandedDayId === day.id}
              onToggle={handleToggleDay}
              variant="builder"
              leading={
                <div style={{ color: M.mut2, display: "flex", flexDirection: "column", gap: 4 }}>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveDay(index, -1);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: index === 0 ? "default" : "pointer",
                      color: index === 0 ? M.line : M.mut,
                      padding: 0,
                      display: "flex",
                    }}
                  >
                    <Icon name="arrowUp" size={16} stroke={2.2} />
                  </button>
                  <button
                    type="button"
                    disabled={index === days.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveDay(index, 1);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: index === days.length - 1 ? "default" : "pointer",
                      color: index === days.length - 1 ? M.line : M.mut,
                      padding: 0,
                      display: "flex",
                      transform: "rotate(180deg)",
                    }}
                  >
                    <Icon name="arrowUp" size={16} stroke={2.2} />
                  </button>
                </div>
              }
              actions={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDay(day.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: M.mut2,
                    display: "flex",
                    padding: 4,
                  }}
                >
                  <Icon name="trash" size={18} stroke={2} />
                </button>
              }
            />
          );
        })}

        <button
          onClick={openSheet}
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
          <Icon name="plus" size={20} stroke={2.6} /> TAG HINZUFÜGEN
        </button>
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        position="absolute"
        zIndex={20}
        maxHeight="85%"
        aria-label={sheetMode === "pick" ? "Tag hinzufügen" : "Neues Workout erstellen"}
      >
        {sheetMode === "pick" ? (
              <>
                <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, marginBottom: 12 }}>Tag hinzufügen</div>

                <button
                  onClick={startCreateMode}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 12px",
                    borderRadius: 12,
                    border: "1.5px dashed " + M.line,
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    marginBottom: 12,
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
                    <Icon name="plus" size={18} stroke={2.6} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: M.acc, fontWeight: 700, fontSize: 15 }}>Neues Workout erstellen</div>
                    <div style={{ color: M.mut, fontSize: 12 }}>Name + Übungen direkt anlegen</div>
                  </div>
                  <Icon name="chevR" size={20} color={M.acc} stroke={2.4} />
                </button>

                <button
                  onClick={addRestDay}
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
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      background: M.panel,
                      color: M.mut,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "0 0 auto",
                    }}
                  >
                    <Icon name="pause" size={18} stroke={2} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>Ruhetag</div>
                    <div style={{ color: M.mut, fontSize: 12 }}>Kein Workout an diesem Tag</div>
                  </div>
                  <Icon name="plus" size={20} color={M.acc} stroke={2.4} />
                </button>

                {loading && <div style={{ color: M.mut, fontSize: 14, marginBottom: 12 }}>Workouts laden…</div>}
                <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                  {workoutList.map((workout) => (
                    <button
                      key={workout.id}
                      onClick={() => addWorkoutDay(workout)}
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
                        <div style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>{workout.name}</div>
                        <div style={{ color: M.mut, fontSize: 12 }}>
                          {workout.exercises.length} Übungen · ~{workout.dur} Min
                        </div>
                      </div>
                      <Icon name="plus" size={20} color={M.acc} stroke={2.4} />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <button
                    onClick={() => {
                      setSheetMode("pick");
                      setCreateError(null);
                      setExercisePickerOpen(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: M.mut,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: 0,
                    }}
                  >
                    <Icon name="chevL" size={20} stroke={2.2} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Zurück</span>
                  </button>
                  <button
                    disabled={creatingWorkout || !canCreateWorkout}
                    onClick={handleCreateWorkout}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: creatingWorkout || !canCreateWorkout ? "not-allowed" : "pointer",
                      fontFamily: M.disp,
                      fontWeight: 700,
                      color: M.acc,
                      fontSize: 16,
                      letterSpacing: 0.5,
                      opacity: creatingWorkout || !canCreateWorkout ? 0.5 : 1,
                    }}
                  >
                    {creatingWorkout ? "…" : "SPEICHERN"}
                  </button>
                </div>

                {createError && (
                  <div style={{ color: "#ff8a8a", fontSize: 13, marginBottom: 10 }}>{createError}</div>
                )}

                <input
                  value={newWorkoutName}
                  onChange={(e) => setNewWorkoutName(e.target.value)}
                  placeholder="Workout-Name"
                  style={{
                    width: "100%",
                    fontFamily: M.disp,
                    fontWeight: 700,
                    fontSize: 24,
                    lineHeight: 1,
                    background: "transparent",
                    border: "none",
                    color: M.fg,
                    outline: "none",
                    padding: 0,
                    marginBottom: 12,
                  }}
                />

                <div style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 10 }}>
                  {newWorkoutItems.length} ÜBUNGEN · {totalNewSets} SÄTZE
                </div>

                <div style={{ overflowY: "auto", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {newWorkoutItems.map((x) => (
                    <div
                      key={x.id + x.name}
                      style={{
                        background: M.card,
                        border: "1px solid " + M.line2,
                        borderRadius: 14,
                        padding: "11px 12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 14.5,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {x.name}
                          </div>
                          <div style={{ fontSize: 11.5, color: M.mut, marginTop: 1 }}>
                            {x.group} · {x.equip}
                          </div>
                        </div>
                        <button
                          onClick={() => removeExercise(x.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: M.mut2,
                            display: "flex",
                            padding: 2,
                          }}
                        >
                          <Icon name="trash" size={16} stroke={2} />
                        </button>
                      </div>
                      <ExerciseSetConfigurator
                        variant="template"
                        setMode={x.setMode}
                        sets={x.setRows}
                        metric={x.metric}
                        onChange={(setMode, setRows) => updateExerciseSets(x.id, setMode, setRows as TemplateSet[])}
                        compact
                      />
                    </div>
                  ))}

                  <button
                    onClick={() => setExercisePickerOpen(true)}
                    style={{
                      padding: "13px 0",
                      borderRadius: 14,
                      border: "1.5px dashed " + M.line,
                      background: "transparent",
                      color: M.acc,
                      fontFamily: M.disp,
                      fontWeight: 700,
                      fontSize: 15,
                      letterSpacing: 0.6,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Icon name="plus" size={18} stroke={2.6} /> ÜBUNG HINZUFÜGEN
                  </button>
                </div>

                <ExercisePickerSheet
                  open={exercisePickerOpen}
                  onClose={() => setExercisePickerOpen(false)}
                  onSelect={addExercise}
                  library={exLibrary}
                  loading={exercisesLoading}
                  allowCreate
                  onLibraryChange={() => reloadExercises()}
                />
              </>
        )}
      </BottomSheet>
    </div>
  );
}
