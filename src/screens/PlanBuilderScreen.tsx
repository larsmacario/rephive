import { useEffect, useState } from "react";
import { M } from "../theme";
import { useAuth } from "../lib/auth";
import { usePreferences } from "../lib/preferences";
import { createPlan, updatePlan, useExercises, usePlan } from "../lib/db";
import type { LibraryExercise } from "../data";
import { planDayDisplayName } from "../data";
import {
  buildUniformTemplateSets,
  defaultSetValue,
  formatSetSummary,
  serializeTemplateSet,
  type SetMode,
  type TemplateSet,
} from "../lib/exerciseSets";
import {
  BLOCK_LABELS,
  DEFAULT_ENABLED_BLOCKS,
  disabledBlocks,
  type TrainingBlockType,
} from "../lib/planBlocks";
import { Icon } from "../components/Icon";
import { ExerciseSetConfigurator } from "../components/ExerciseSetConfigurator";
import { ExercisePickerSheet } from "../components/ExercisePickerSheet";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { BottomSheet } from "../components/BottomSheet";
import { PlanDaySlide } from "../components/PlanDaySlide";
import { MButton } from "../components/MButton";
import { HorizontalSlidePager } from "../components/HorizontalSlidePager";

interface BuilderExercise extends LibraryExercise {
  blockType: TrainingBlockType;
  setMode: SetMode;
  setRows: TemplateSet[];
  catalogExerciseId?: string;
}

interface BuilderDay {
  id: string;
  name: string;
  enabledBlocks: TrainingBlockType[];
  exercises: BuilderExercise[];
}

function createEmptyDay(index: number): BuilderDay {
  return {
    id: crypto.randomUUID(),
    name: `Tag ${index + 1}`,
    enabledBlocks: [...DEFAULT_ENABLED_BLOCKS],
    exercises: [],
  };
}

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
  const { data: exerciseLibrary, loading: exercisesLoading, reload: reloadExercises } = useExercises();

  const [name, setName] = useState("Neuer Trainingsplan");
  const [days, setDays] = useState<BuilderDay[]>([]);
  const [initialized, setInitialized] = useState(!isEditing);
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [pickerTargetBlock, setPickerTargetBlock] = useState<TrainingBlockType | null>(null);
  const [removeBlockConfirm, setRemoveBlockConfirm] = useState<TrainingBlockType | null>(null);
  const [configExerciseId, setConfigExerciseId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  const exLibrary = exerciseLibrary ?? [];
  const activeDay = days[activeDayIndex] ?? null;
  const configExercise = activeDay?.exercises.find((e) => e.id === configExerciseId) ?? null;

  useEffect(() => {
    if (!isEditing || !existingPlan || initialized) return;
    setName(existingPlan.name);
    setDays(
      existingPlan.days.map((d) => ({
        id: d.id,
        name: d.name,
        enabledBlocks: d.enabledBlocks,
        exercises: d.exercises.map((e) => ({
          id: e.id,
          blockType: e.blockType,
          catalogExerciseId: e.catalogExerciseId ?? undefined,
          name: e.name,
          category: "strength" as const,
          group: e.note?.split(" · ")[0] ?? "",
          equip: e.note?.split(" · ")[1] ?? "",
          userId: null,
          metric: e.metric,
          setMode: "uniform" as const,
          setRows: e.sets.map((s) => ({
            reps: s.reps,
            kg: s.kg,
            ...(s.durationSec != null ? { durationSec: s.durationSec } : {}),
            ...(s.distanceM != null ? { distanceM: s.distanceM } : {}),
            ...(s.warmUp ? { warmUp: true } : {}),
          })),
        })),
      })),
    );
    setInitialized(true);
  }, [isEditing, existingPlan, initialized]);

  useEffect(() => {
    if (isEditing || days.length > 0 || !initialized) return;
    setDays([createEmptyDay(0)]);
  }, [isEditing, days.length, initialized]);

  const updateActiveDay = (updater: (day: BuilderDay) => BuilderDay) => {
    setDays((prev) =>
      prev.map((day, index) => (index === activeDayIndex ? updater(day) : day)),
    );
  };

  const addDay = () => {
    setDays((prev) => {
      const next = [...prev, createEmptyDay(prev.length)];
      setActiveDayIndex(next.length - 1);
      return next;
    });
  };

  const openExercisePicker = (block: TrainingBlockType) => {
    setPickerTargetBlock(block);
    setExercisePickerOpen(true);
  };

  const addExercise = (ex: LibraryExercise) => {
    const block = pickerTargetBlock ?? "strength";
    updateActiveDay((day) => ({
      ...day,
      exercises: [
        ...day.exercises,
        {
          id: crypto.randomUUID(),
          blockType: block,
          catalogExerciseId: ex.id,
          name: ex.name,
          category: ex.category,
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
      ],
    }));
    setExercisePickerOpen(false);
    setPickerTargetBlock(null);
  };

  const updateExerciseSets = (id: string, setMode: SetMode, setRows: TemplateSet[]) => {
    updateActiveDay((day) => ({
      ...day,
      exercises: day.exercises.map((x) => (x.id === id ? { ...x, setMode, setRows } : x)),
    }));
  };

  const removeExercise = (id: string) => {
    updateActiveDay((day) => ({
      ...day,
      exercises: day.exercises.filter((x) => x.id !== id),
    }));
    if (configExerciseId === id) setConfigExerciseId(null);
  };

  const removeBlock = (block: TrainingBlockType) => {
    updateActiveDay((day) => ({
      ...day,
      enabledBlocks: day.enabledBlocks.filter((b) => b !== block),
      exercises: day.exercises.filter((e) => e.blockType !== block),
    }));
    setRemoveBlockConfirm(null);
  };

  const restoreBlock = (block: TrainingBlockType) => {
    updateActiveDay((day) => ({
      ...day,
      enabledBlocks: [...day.enabledBlocks, block].sort(
        (a, b) => DEFAULT_ENABLED_BLOCKS.indexOf(a) - DEFAULT_ENABLED_BLOCKS.indexOf(b),
      ),
    }));
  };

  const removeDay = (id: string) => {
    setDays((prev) => {
      const removeIndex = prev.findIndex((d) => d.id === id);
      const next = prev.filter((d) => d.id !== id);
      setActiveDayIndex((current) => {
        if (next.length === 0) return 0;
        if (removeIndex < 0) return Math.min(current, next.length - 1);
        if (current > removeIndex) return current - 1;
        if (current >= next.length) return next.length - 1;
        return current;
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!user || days.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);
      const sub = `${days.length} Tag${days.length === 1 ? "" : "e"} · ${totalExercises} Übung${totalExercises === 1 ? "" : "en"}`;

      const payload = {
        name: name.trim() || "Neuer Trainingsplan",
        sub,
        days: days.map((d, i) => ({
          name: d.name.trim() || `Tag ${i + 1}`,
          enabledBlocks: d.enabledBlocks,
          exercises: d.exercises.map((x) => ({
            name: x.name,
            note: `${x.group} · ${x.equip}`,
            blockType: x.blockType,
            catalogExerciseId: x.catalogExerciseId ?? null,
            metric: x.metric,
            sets: x.setRows.map((s, index) => serializeTemplateSet(s, index, { done: false })),
          })),
        })),
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
        <MButton onClick={onBack} variant="primary" size="sm">
          Zurück
        </MButton>
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
        <MButton onClick={onBack} variant="ghost" size="icon" aria-label="Zurück">
          <Icon name="chevL" size={20} stroke={2.2} color={M.mut} />
        </MButton>
        <span style={{ fontSize: 12, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>
          {isEditing ? "PLAN BEARBEITEN" : "NEUER PLAN"}
        </span>
        <MButton
          disabled={saving || days.length === 0}
          onClick={handleSave}
          variant="ghost"
          size="sm"
          loading={saving}
          style={{ fontFamily: M.disp, color: M.fg, letterSpacing: 0.4 }}
        >
          Speichern
        </MButton>
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
          minWidth: 0,
          padding: "0 22px 8px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {days.length === 0 ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MButton
              onClick={addDay}
              variant="ghost"
              size="md"
              style={{
                border: "1.5px dashed " + M.line,
                color: M.fg,
                fontFamily: M.disp,
                letterSpacing: 0.4,
              }}
            >
              <Icon name="plus" size={16} stroke={2.6} /> Tag hinzufügen
            </MButton>
          </div>
        ) : (
          <>
            <HorizontalSlidePager
              key={days.map((d) => d.id).join("-")}
              count={days.length}
              activeIndex={activeDayIndex}
              onIndexChange={setActiveDayIndex}
              ariaLabel="Plan-Tage bearbeiten"
            >
              {days.map((day, index) => (
                <div
                  key={day.id}
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                    padding: "0 0 4px",
                    boxSizing: "border-box",
                  }}
                >
                  <PlanDaySlide
                    dayNumber={index + 1}
                    label={planDayDisplayName({ name: day.name, position: index })}
                    isCurrent={false}
                    isActive={activeDayIndex === index}
                    enabledBlocks={day.enabledBlocks}
                    exercises={day.exercises.map((e) => ({
                      id: e.id,
                      name: e.name,
                      note: `${e.group} · ${e.equip}`,
                      blockType: e.blockType,
                      metric: e.metric,
                      sets: e.setRows.map((s) => ({ ...s, done: false })),
                    }))}
                    variant="builder"
                    builderMode
                    editableName
                    nameValue={day.name}
                    onNameChange={(value) =>
                      setDays((prev) =>
                        prev.map((d, i) => (i === index ? { ...d, name: value } : d)),
                      )
                    }
                    onExerciseClick={(exerciseId) => setConfigExerciseId(exerciseId)}
                    onAddExerciseToBlock={(block) => openExercisePicker(block)}
                    onRemoveBlock={(block) => setRemoveBlockConfirm(block)}
                    disabledBlocks={disabledBlocks(DEFAULT_ENABLED_BLOCKS, day.enabledBlocks)}
                    onRestoreBlock={(block) => restoreBlock(block)}
                    actions={
                      <MButton
                        type="button"
                        onClick={() => removeDay(day.id)}
                        variant="ghost"
                        size="icon"
                        aria-label="Tag entfernen"
                        style={{ color: M.mut2 }}
                      >
                        <Icon name="trash" size={16} stroke={2} />
                      </MButton>
                    }
                  />
                </div>
              ))}
            </HorizontalSlidePager>

            <MButton
              onClick={addDay}
              variant="ghost"
              size="md"
              fullWidth
              style={{
                flexShrink: 0,
                marginTop: 8,
                border: "1.5px dashed " + M.line,
                color: M.fg,
                fontFamily: M.disp,
                letterSpacing: 0.4,
              }}
            >
              <Icon name="plus" size={16} stroke={2.6} /> Tag hinzufügen
            </MButton>
          </>
        )}
      </div>

      <ExercisePickerSheet
        open={exercisePickerOpen}
        onClose={() => {
          setExercisePickerOpen(false);
          setPickerTargetBlock(null);
        }}
        onSelect={addExercise}
        library={exLibrary}
        loading={exercisesLoading}
        allowCreate
        onLibraryChange={() => reloadExercises()}
      />

      <ConfirmSheet
        open={removeBlockConfirm != null}
        title="Baustein entfernen?"
        message={
          removeBlockConfirm
            ? `„${BLOCK_LABELS[removeBlockConfirm]}“ wird dauerhaft aus diesem Tag entfernt — inklusive aller Übungen darin.`
            : ""
        }
        confirmLabel="Entfernen"
        onConfirm={() => removeBlockConfirm && removeBlock(removeBlockConfirm)}
        onCancel={() => setRemoveBlockConfirm(null)}
      />

      <BottomSheet
        open={Boolean(configExercise)}
        onClose={() => setConfigExerciseId(null)}
        position="absolute"
        zIndex={21}
        aria-label="Übung konfigurieren"
      >
        {configExercise && (
          <>
            <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, marginBottom: 4 }}>{configExercise.name}</div>
            <div style={{ color: M.mut, fontSize: 12, marginBottom: 12 }}>
              {configExercise.group} · {configExercise.equip} · {formatSetSummary(configExercise.setRows, configExercise.metric)}
            </div>
            <ExerciseSetConfigurator
              variant="template"
              setMode={configExercise.setMode}
              sets={configExercise.setRows}
              metric={configExercise.metric}
              onChange={(setMode, setRows) =>
                updateExerciseSets(configExercise.id, setMode, setRows as TemplateSet[])
              }
            />
            <MButton
              onClick={() => removeExercise(configExercise.id)}
              variant="ghost"
              size="sm"
              fullWidth
              style={{ marginTop: 16, color: "#ff8a8a" }}
            >
              Übung entfernen
            </MButton>
          </>
        )}
      </BottomSheet>
    </div>
  );
}
