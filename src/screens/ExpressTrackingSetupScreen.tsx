import { useEffect, useMemo, useState } from "react";
import type { HistoryEntry } from "../data";
import { M, TYPE } from "../theme";
import { Icon } from "../components/Icon";
import { MButton } from "../components/MButton";
import { MStepper } from "../components/widgets";
import { ExercisePickerSheet } from "../components/ExercisePickerSheet";
import { SwipeRevealRow } from "../components/SwipeRevealRow";
import { ExerciseListRowDumbbellIcon, ExerciseListRowText } from "../components/ExerciseListRow";
import { useExercises, fetchRecentExpressTrackingSessions } from "../lib/db";
import { usePreferences } from "../lib/preferences";
import {
  buildExpressTrackingWorkout,
  extractExpressTemplatesFromSession,
  groupExpressTemplatesByMuscleGroup,
  libraryExercisesToExpressTemplates,
  expressImportSkipMessage,
  type ExpressTrackingExerciseTemplate,
} from "../lib/expressTracking";
import type { Workout } from "../lib/engine";
import type { LibraryExercise } from "../data";

export interface ExpressTrackingSetupScreenProps {
  onBack: () => void;
  onStart: (workout: Workout, skipMessage?: string | null) => void;
}

type SetupStep = "source" | "sets";

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function ExpressTrackingSetupScreen({ onBack, onStart }: ExpressTrackingSetupScreenProps) {
  const { preferences } = usePreferences();
  const { data: library, loading: libraryLoading, reload: reloadExercises } = useExercises();
  const [step, setStep] = useState<SetupStep>("source");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [manualTemplates, setManualTemplates] = useState<ExpressTrackingExerciseTemplate[] | null>(null);
  const [setCount, setSetCount] = useState(preferences.defaultSets);
  const [skipMessage, setSkipMessage] = useState<string | null>(null);
  const [openSwipeRowId, setOpenSwipeRowId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    fetchRecentExpressTrackingSessions(12)
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeTemplates = manualTemplates ?? [];

  const templateKey = (template: ExpressTrackingExerciseTemplate) =>
    template.catalogExerciseId ?? template.name.trim().toLowerCase();

  const mergeExpressTemplates = (
    base: ExpressTrackingExerciseTemplate[],
    incoming: ExpressTrackingExerciseTemplate[],
  ): ExpressTrackingExerciseTemplate[] => {
    const seen = new Set(base.map(templateKey));
    const merged = [...base];
    for (const template of incoming) {
      const key = templateKey(template);
      if (seen.has(key)) continue;
      merged.push(template);
      seen.add(key);
    }
    return merged;
  };

  const libraryById = useMemo(
    () => new Map((library ?? []).map((ex) => [ex.id, ex])),
    [library],
  );

  const templatesByMuscleGroup = useMemo(
    () => groupExpressTemplatesByMuscleGroup(activeTemplates, libraryById),
    [activeTemplates, libraryById],
  );

  const goToSetsFromSession = (session: HistoryEntry) => {
    const imported = extractExpressTemplatesFromSession(session);
    setSkipMessage(expressImportSkipMessage(imported));
    if (imported.templates.length === 0) return;
    setManualTemplates(imported.templates);
    setStep("sets");
  };

  const goToSetsFromManual = (exercises: LibraryExercise[]) => {
    const templates = libraryExercisesToExpressTemplates(exercises);
    if (templates.length === 0) return;
    setManualTemplates(templates);
    setSkipMessage(null);
    setStep("sets");
  };

  const appendTemplatesFromPicker = (exercises: LibraryExercise[]) => {
    const templates = libraryExercisesToExpressTemplates(exercises);
    if (templates.length === 0) return;
    setManualTemplates((prev) => mergeExpressTemplates(prev ?? [], templates));
    setPickerOpen(false);
  };

  const removeTemplate = (template: ExpressTrackingExerciseTemplate) => {
    const key = templateKey(template);
    setManualTemplates((prev) => (prev ?? []).filter((item) => templateKey(item) !== key));
  };

  const handleStart = () => {
    if (activeTemplates.length === 0) return;
    const workout = buildExpressTrackingWorkout({
      templates: activeTemplates,
      setCount,
      defaultReps: preferences.defaultReps,
    });
    onStart(workout, skipMessage);
  };

  const stepIndex = step === "source" ? 1 : 2;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: M.bg }}>
      <div style={{ padding: "8px 18px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <MButton type="button" variant="ghost" size="icon" onClick={step === "sets" ? () => setStep("source") : onBack} aria-label="Zurück">
            <Icon name="chevL" size={22} stroke={2.2} color={M.mut} />
          </MButton>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 24, color: M.fg }}>ExpressTracking</div>
            <div style={{ fontSize: TYPE.bodySm, color: M.mut, marginTop: 2 }}>Schritt {stepIndex} von 2</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 18px 24px" }}>
        {step === "source" ? (
          <>
            <div style={{ fontSize: TYPE.body, color: M.mut, lineHeight: 1.5, marginBottom: 16 }}>
              Wiederhole ein früheres ExpressTracking-Workout oder wähle Übungen aus der Bibliothek.
            </div>

            {historyLoading ? (
              <div style={{ color: M.mut, fontSize: TYPE.bodySm, marginBottom: 16 }}>Verlauf wird geladen…</div>
            ) : history.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {history.map((session) => {
                  const imported = extractExpressTemplatesFromSession(session);
                  const eligible = imported.templates.length;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      disabled={eligible === 0}
                      onClick={() => goToSetsFromSession(session)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "1px solid " + M.line2,
                        background: M.card,
                        cursor: eligible > 0 ? "pointer" : "default",
                        opacity: eligible > 0 ? 1 : 0.45,
                        textAlign: "left",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: M.fg, fontWeight: 600, fontSize: TYPE.body }}>{session.name}</div>
                        <div style={{ color: M.mut, fontSize: TYPE.bodySm, marginTop: 2 }}>
                          {formatSessionDate(session.performedAt)} · {eligible} Übung{eligible === 1 ? "" : "en"}
                        </div>
                      </div>
                      <Icon name="chevR" size={16} color={M.mut2} stroke={2.2} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: "20px 14px",
                  borderRadius: 12,
                  border: "1px dashed " + M.line,
                  color: M.mut,
                  fontSize: TYPE.body,
                  lineHeight: 1.5,
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                Noch kein ExpressTracking in der Vergangenheit — wähle Übungen aus der Bibliothek.
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: TYPE.body, color: M.mut, lineHeight: 1.5, marginBottom: 16 }}>
              Satzanzahl gilt für alle {activeTemplates.length} Übung{activeTemplates.length === 1 ? "" : "en"}. Im Tracking kannst du sie pro Übung anpassen.
            </div>

            {skipMessage ? (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: M.cardHi,
                  border: "1px solid " + M.line2,
                  color: M.mut,
                  fontSize: TYPE.bodySm,
                  lineHeight: 1.45,
                  marginBottom: 14,
                }}
              >
                {skipMessage}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 14px",
                borderRadius: 14,
                background: M.card,
                border: "1px solid " + M.line2,
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: TYPE.titleSm, color: M.fg }}>Sätze pro Übung</div>
                <div style={{ fontSize: TYPE.bodySm, color: M.mut, marginTop: 4 }}>Standard: {preferences.defaultSets}</div>
              </div>
              <MStepper value={setCount} min={1} max={10} onChange={setSetCount} />
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: M.cardHi,
                border: "1px solid " + M.line2,
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: TYPE.caption, fontWeight: 700, letterSpacing: 1, color: M.mut, marginBottom: 8 }}>
                ZUSAMMENFASSUNG
              </div>
              <div style={{ color: M.fg, fontWeight: 600, fontSize: TYPE.body, marginBottom: 12 }}>
                {activeTemplates.length} Übung{activeTemplates.length === 1 ? "" : "en"} × {setCount} Sätze
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {templatesByMuscleGroup.map(({ group, templates }, groupIndex) => (
                  <div key={group}>
                    <div
                      style={{
                        fontSize: TYPE.caption,
                        fontWeight: 700,
                        letterSpacing: 1,
                        color: M.mut,
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      {group}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {templates.map((template, templateIndex) => {
                        const rowId = templateKey(template);
                        return (
                        <SwipeRevealRow
                          key={rowId}
                          rowId={rowId}
                          openRowId={openSwipeRowId}
                          onOpenRowIdChange={setOpenSwipeRowId}
                          onDelete={() => removeTemplate(template)}
                          deleteAriaLabel={`${template.name} entfernen`}
                          showSwipeHint={
                            !libraryLoading && groupIndex === 0 && templateIndex === 0
                          }
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              height: "100%",
                              padding: `0 12px`,
                              boxSizing: "border-box",
                            }}
                          >
                            <ExerciseListRowDumbbellIcon />
                            <ExerciseListRowText title={template.name} />
                          </div>
                        </SwipeRevealRow>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <MButton
                type="button"
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => setPickerOpen(true)}
                style={{
                  marginTop: 12,
                  border: "1.5px dashed " + M.line,
                  color: M.fg,
                  fontFamily: M.disp,
                  letterSpacing: 0.3,
                  fontSize: TYPE.bodySm,
                }}
              >
                <Icon name="plus" size={14} stroke={2.6} /> Übung hinzufügen
              </MButton>
            </div>
          </>
        )}
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: "10px 18px 14px",
          borderTop: "1px solid " + M.line2,
          background: M.bg,
        }}
      >
        {step === "source" ? (
          <MButton
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setPickerOpen(true)}
            style={{ fontFamily: M.disp, letterSpacing: 0.3 }}
          >
            <Icon name="plus" size={16} stroke={2.4} /> Übungen auswählen
          </MButton>
        ) : (
          <MButton
            type="button"
            variant="primary"
            size="md"
            fullWidth
            onClick={handleStart}
            disabled={activeTemplates.length === 0}
            style={{ fontFamily: M.disp, fontWeight: 700, letterSpacing: 0.4 }}
          >
            Workout starten
          </MButton>
        )}
      </div>

      <ExercisePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={() => {}}
        onSelectMultiple={step === "sets" ? appendTemplatesFromPicker : goToSetsFromManual}
        mode="multi"
        expressTrackingOnly
        library={library ?? []}
        loading={libraryLoading}
        title={step === "sets" ? "Übungen hinzufügen" : "Übungen wählen"}
        allowCreate
        onLibraryChange={reloadExercises}
      />
    </div>
  );
}
