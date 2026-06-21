import { useEffect, useState } from "react";
import { M } from "../theme";
import { useAuth } from "../lib/auth";
import { usePreferences } from "../lib/preferences";
import { createPlan, updatePlan, useExercises, usePlan } from "../lib/db";
import type { LibraryExercise, PlanDayBlock } from "../data";
import { planDayDisplayName } from "../data";
import {
  defaultWeekdayForPlanDayIndex,
  getPlanTrainingWeekdays,
  resolveUniquePlanDayWeekdays,
  trainingWeekdayLabel,
  trainingWeekdaysFromPlanDayWeekdays,
} from "../lib/trainingWeekdays";
import {
  buildUniformTemplateSets,
  defaultSetValue,
  formatSetSummary,
  serializeTemplateSet,
  type SetMode,
  type TemplateSet,
} from "../lib/exerciseSets";
import type { ExerciseMetric } from "../lib/exerciseCatalog";
import {
  BLOCK_ORDER,
  BLOCK_LABELS,
  BUILDER_DEFAULT_ENABLED_BLOCKS,
  DEFAULT_ENABLED_BLOCKS,
  disabledBlocks,
  type TrainingBlockType,
} from "../lib/planBlocks";
import {
  configFromPlanDayBlock,
  formatMetconExerciseNote,
  isBodyweightEquipment,
  metconConfigToBlockInput,
  metconConfigToPlanDayBlock,
  normalizeMetconExercise,
  type MetconConfig,
  type MetconExerciseLike,
} from "../lib/metcon";
import { Icon } from "../components/Icon";
import { ExerciseSetConfigurator } from "../components/ExerciseSetConfigurator";
import { ExercisePickerSheet } from "../components/ExercisePickerSheet";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { BottomSheet } from "../components/BottomSheet";
import { MetconConfigSheet } from "../components/MetconConfigSheet";
import { PlanDaySlide } from "../components/PlanDaySlide";
import { PlanDayWeekdayPicker } from "../components/PlanDayWeekdayPicker";
import { MButton } from "../components/MButton";
import { HorizontalSlidePager } from "../components/HorizontalSlidePager";

/** Safe-area only — shell padding is disabled for plan builder. */
const PLAN_BUILDER_FOOTER_PADDING = "max(8px, env(safe-area-inset-bottom, 0px))";

interface BuilderExercise extends LibraryExercise {
  blockType: TrainingBlockType;
  setMode: SetMode;
  setRows: TemplateSet[];
  catalogExerciseId?: string;
  displayNote?: string;
}

interface BuilderDay {
  id: string;
  name: string;
  trainingWeekday: number;
  enabledBlocks: TrainingBlockType[];
  metconConfig: MetconConfig | null;
  exercises: BuilderExercise[];
}

function createEmptyDay(index: number, usedWeekdays: number[] = []): BuilderDay {
  return {
    id: crypto.randomUUID(),
    name: `Tag ${index + 1}`,
    trainingWeekday: defaultWeekdayForPlanDayIndex(index, usedWeekdays),
    enabledBlocks: [...BUILDER_DEFAULT_ENABLED_BLOCKS],
    metconConfig: null,
    exercises: [],
  };
}

function builderBlocksForDay(day: BuilderDay): PlanDayBlock[] {
  if (!day.enabledBlocks.includes("metcon") || !day.metconConfig) return [];
  return [metconConfigToPlanDayBlock(day.metconConfig)];
}

function restoreableDisabledBlocks(enabled: TrainingBlockType[]): TrainingBlockType[] {
  return disabledBlocks(DEFAULT_ENABLED_BLOCKS, enabled).filter((b) => b !== "metcon");
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
  const [metconSheetOpen, setMetconSheetOpen] = useState(false);
  const [metconSheetDayIndex, setMetconSheetDayIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  const exLibrary = exerciseLibrary ?? [];
  const weekdayLabels = days.map((d) => trainingWeekdayLabel(d.trainingWeekday));
  const activeDay = days[activeDayIndex] ?? null;
  const configExercise = activeDay?.exercises.find((e) => e.id === configExerciseId) ?? null;

  useEffect(() => {
    if (!isEditing || !existingPlan || initialized) return;
    const planWeekdays = getPlanTrainingWeekdays(existingPlan);
    const resolvedWeekdays = resolveUniquePlanDayWeekdays(
      existingPlan.days.map((_, index) => planWeekdays?.[index] ?? null),
    );
    setName(existingPlan.name);
    setDays(
      existingPlan.days.map((d, index) => {
        const metconBlock = d.blocks?.find((b) => b.blockType === "metcon");
        return {
          id: d.id,
          name: d.name,
          trainingWeekday: resolvedWeekdays[index] ?? defaultWeekdayForPlanDayIndex(index, []),
          enabledBlocks: d.enabledBlocks,
          metconConfig: metconBlock ? configFromPlanDayBlock(metconBlock) : null,
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
            displayNote: e.blockType === "metcon" ? e.note : undefined,
            setMode: "uniform" as const,
            setRows: e.sets.map((s) => ({
              reps: s.reps,
              kg: s.kg,
              ...(s.durationSec != null ? { durationSec: s.durationSec } : {}),
              ...(s.distanceM != null ? { distanceM: s.distanceM } : {}),
              ...(s.warmUp ? { warmUp: true } : {}),
            })),
          })),
        };
      }),
    );
    setInitialized(true);
  }, [isEditing, existingPlan, initialized]);

  useEffect(() => {
    if (isEditing || days.length > 0 || !initialized) return;
    setDays([createEmptyDay(0)]);
  }, [isEditing, days.length, initialized]);

  const updateDayAt = (index: number, updater: (day: BuilderDay) => BuilderDay) => {
    setDays((prev) => prev.map((day, i) => (i === index ? updater(day) : day)));
  };

  const updateActiveDay = (updater: (day: BuilderDay) => BuilderDay) => {
    updateDayAt(activeDayIndex, updater);
  };

  const addDay = () => {
    setDays((prev) => {
      const usedWeekdays = prev.map((d) => d.trainingWeekday);
      const next = [...prev, createEmptyDay(prev.length, usedWeekdays)];
      setActiveDayIndex(next.length - 1);
      return next;
    });
  };

  const openExercisePicker = (block: TrainingBlockType) => {
    setPickerTargetBlock(block);
    setExercisePickerOpen(true);
  };

  const openMetconSheet = (dayIndex: number) => {
    setMetconSheetDayIndex(dayIndex);
    setMetconSheetOpen(true);
  };

  const confirmMetconConfig = (config: MetconConfig) => {
    if (metconSheetDayIndex == null) return;
    updateDayAt(metconSheetDayIndex, (day) => {
      const nextEnabled: TrainingBlockType[] = day.enabledBlocks.includes("metcon")
        ? day.enabledBlocks
        : ([...day.enabledBlocks, "metcon"] as TrainingBlockType[]).sort(
            (a, b) => BLOCK_ORDER.indexOf(a) - BLOCK_ORDER.indexOf(b),
          );
      return {
        ...day,
        metconConfig: config,
        enabledBlocks: nextEnabled,
      };
    });
    setMetconSheetDayIndex(null);
  };

  const addExercise = (ex: LibraryExercise) => {
    const block = pickerTargetBlock ?? "strength";
    const targetReps = preferences.defaultReps ?? 10;
    const isMetcon = block === "metcon";
    const bodyweight = isBodyweightEquipment(ex.equip);
    const metric: ExerciseMetric = isMetcon && bodyweight ? "reps" : ex.metric;
    const setRows: TemplateSet[] = isMetcon
      ? [{ reps: targetReps, kg: 0 }]
      : buildUniformTemplateSets(
          preferences.defaultSets,
          defaultSetValue(metric, targetReps),
          0,
          metric,
        );

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
          metric,
          youtubeUrl: ex.youtubeUrl,
          displayNote: isMetcon ? formatMetconExerciseNote(targetReps) : undefined,
          setMode: "uniform" as const,
          setRows,
        },
      ],
    }));
    setExercisePickerOpen(false);
    setPickerTargetBlock(null);
  };

  const updateExerciseSets = (id: string, setMode: SetMode, setRows: TemplateSet[]) => {
    updateActiveDay((day) => ({
      ...day,
      exercises: day.exercises.map((x) => {
        if (x.id !== id) return x;
        const cappedRows = x.blockType === "metcon" ? setRows.slice(0, 1) : setRows;
        const reps = cappedRows[0]?.reps ?? 10;
        return {
          ...x,
          setMode: x.blockType === "metcon" ? "uniform" : setMode,
          setRows: cappedRows,
          displayNote: x.blockType === "metcon" ? formatMetconExerciseNote(reps) : x.displayNote,
        };
      }),
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
      metconConfig: block === "metcon" ? null : day.metconConfig,
      exercises: day.exercises.filter((e) => e.blockType !== block),
    }));
    setRemoveBlockConfirm(null);
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

  const exerciseNoteForSave = (x: BuilderExercise): string => {
    if (x.blockType === "metcon") {
      const reps = x.setRows[0]?.reps ?? 10;
      return x.displayNote ?? formatMetconExerciseNote(reps);
    }
    return `${x.group} · ${x.equip}`;
  };

  const handleSave = async () => {
    if (!user || days.length === 0) return;
    const trainingWeekdays = trainingWeekdaysFromPlanDayWeekdays(days.map((d) => d.trainingWeekday));
    if (new Set(trainingWeekdays).size !== trainingWeekdays.length) {
      setError("Jeder Wochentag darf nur einem Workout zugeordnet sein.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);
      const sub = `${days.length} Tag${days.length === 1 ? "" : "e"} · ${totalExercises} Übung${totalExercises === 1 ? "" : "en"}`;

      const payload = {
        name: name.trim() || "Neuer Trainingsplan",
        sub,
        days: days.map((d, i) => {
          const blockConfigs =
            d.metconConfig && d.enabledBlocks.includes("metcon")
              ? [metconConfigToBlockInput(d.metconConfig)]
              : [];

          const exercises = d.exercises.map((x) => {
            if (x.blockType === "metcon") {
              const metconLike: MetconExerciseLike = {
                metric: x.metric,
                equipment: x.equip,
                note: exerciseNoteForSave(x),
                blockType: "metcon",
                sets: x.setRows.map((s) => ({ reps: s.reps, kg: s.kg })),
              };
              normalizeMetconExercise(metconLike);
              return {
                name: x.name,
                note: metconLike.note ?? exerciseNoteForSave(x),
                blockType: x.blockType,
                catalogExerciseId: x.catalogExerciseId ?? null,
                metric: (metconLike.metric ?? x.metric) as ExerciseMetric,
                sets: (metconLike.sets ?? x.setRows).map((s, index) =>
                  serializeTemplateSet({ reps: s.reps ?? 0, kg: s.kg ?? 0 }, index, { done: false }),
                ),
              };
            }
            return {
              name: x.name,
              note: exerciseNoteForSave(x),
              blockType: x.blockType,
              catalogExerciseId: x.catalogExerciseId ?? null,
              metric: x.metric,
              sets: x.setRows.map((s, index) => serializeTemplateSet(s, index, { done: false })),
            };
          });

          return {
            name: d.name.trim() || `Tag ${i + 1}`,
            enabledBlocks: d.enabledBlocks,
            blockConfigs,
            exercises,
          };
        }),
        trainingWeekdays,
      };

      if (isEditing && planId) {
        await updatePlan(user.id, planId, payload);
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

  const metconSheetDay = metconSheetDayIndex != null ? (days[metconSheetDayIndex] ?? null) : activeDay;

  if (isEditing && ((planLoading && !existingPlan) || !initialized)) {
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
        <span style={{ fontSize: 13, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>
          {isEditing ? "PLAN BEARBEITEN" : "NEUER PLAN"}
        </span>
        <div style={{ width: 32 }} aria-hidden />
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

      <div
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          padding: "0 22px 0",
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
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              paddingBottom: PLAN_BUILDER_FOOTER_PADDING,
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
            <MButton
              disabled={saving || days.length === 0}
              onClick={handleSave}
              variant="primary"
              size="md"
              fullWidth
              loading={saving}
              style={{ maxWidth: 320 }}
            >
              Speichern
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
              tabListPadding="6px 0 0"
              tabSize="lg"
              tabBarTrailing={
                <MButton
                  type="button"
                  onClick={addDay}
                  variant="ghost"
                  size="icon"
                  aria-label="Tag hinzufügen"
                  style={{
                    border: "1.5px dashed " + M.line,
                    color: M.fg,
                    flexShrink: 0,
                  }}
                >
                  <Icon name="plus" size={18} stroke={2.6} />
                </MButton>
              }
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
                    label={planDayDisplayName({ name: day.name, position: index }, weekdayLabels)}
                    isCurrent={false}
                    isActive={activeDayIndex === index}
                    scrollHeader={
                      <PlanDayWeekdayPicker
                        value={day.trainingWeekday}
                        disabledWeekdays={days
                          .filter((_, i) => i !== index)
                          .map((d) => d.trainingWeekday)}
                        onChange={(weekday) =>
                          updateDayAt(index, (d) => ({ ...d, trainingWeekday: weekday }))
                        }
                      />
                    }
                    enabledBlocks={day.enabledBlocks}
                    blocks={builderBlocksForDay(day)}
                    exercises={day.exercises.map((e) => ({
                      id: e.id,
                      name: e.name,
                      note:
                        e.blockType === "metcon"
                          ? (e.displayNote ?? exerciseNoteForSave(e))
                          : `${e.group} · ${e.equip}`,
                      blockType: e.blockType,
                      metric: e.metric,
                      sets: e.setRows.map((s) => ({ ...s, done: false })),
                    }))}
                    variant="builder"
                    builderMode
                    editableName
                    nameValue={day.name}
                    onNameChange={(value) =>
                      setDays((prev) => prev.map((d, i) => (i === index ? { ...d, name: value } : d)))
                    }
                    onExerciseClick={(exerciseId) => setConfigExerciseId(exerciseId)}
                    onAddExerciseToBlock={(block) => openExercisePicker(block)}
                    onRemoveBlock={(block) => setRemoveBlockConfirm(block)}
                    disabledBlocks={restoreableDisabledBlocks(day.enabledBlocks)}
                    onRestoreBlock={(block) => {
                      if (block === "metcon") {
                        openMetconSheet(index);
                      } else {
                        updateDayAt(index, (d) => ({
                          ...d,
                          enabledBlocks: [...d.enabledBlocks, block].sort(
                            (a, b) => BLOCK_ORDER.indexOf(a) - BLOCK_ORDER.indexOf(b),
                          ),
                        }));
                      }
                    }}
                    optionalMetconLink={{
                      visible: !day.enabledBlocks.includes("metcon"),
                      onAdd: () => openMetconSheet(index),
                    }}
                    onMetconSettings={() => openMetconSheet(index)}
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

            <div
              style={{
                flexShrink: 0,
                paddingTop: 8,
                paddingBottom: PLAN_BUILDER_FOOTER_PADDING,
              }}
            >
              <MButton
                disabled={saving || days.length === 0}
                onClick={handleSave}
                variant="primary"
                size="md"
                fullWidth
                loading={saving}
              >
                Speichern
              </MButton>
            </div>
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

      <MetconConfigSheet
        open={metconSheetOpen}
        initialConfig={metconSheetDay?.metconConfig}
        onClose={() => {
          setMetconSheetOpen(false);
          setMetconSheetDayIndex(null);
        }}
        onConfirm={confirmMetconConfig}
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
            <div style={{ color: M.mut, fontSize: 13, marginBottom: 12 }}>
              {configExercise.blockType === "metcon"
                ? (configExercise.displayNote ?? formatSetSummary(configExercise.setRows, configExercise.metric))
                : `${configExercise.group} · ${configExercise.equip} · ${formatSetSummary(configExercise.setRows, configExercise.metric)}`}
            </div>
            {configExercise.blockType === "metcon" && (
              <div style={{ color: M.mut2, fontSize: 13, marginBottom: 10, fontWeight: 600 }}>
                Ziel-Wdh. pro Runde
              </div>
            )}
            <ExerciseSetConfigurator
              variant="template"
              setMode={configExercise.setMode}
              sets={configExercise.setRows}
              metric={configExercise.metric}
              maxSets={configExercise.blockType === "metcon" ? 1 : undefined}
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
