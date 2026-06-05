import { useState } from "react";
import { M } from "../theme";
import { useAuth } from "../lib/auth";
import { deleteWorkout, useWorkout } from "../lib/db";
import { Icon } from "../components/Icon";
import { MTag } from "../components/widgets";
import { formatSetSummary, isUniform } from "../lib/exerciseSets";
import { SupersetBlock } from "../components/SupersetBlock";
import { segmentExercises } from "../lib/superset";
import { ExerciseHistorySheet } from "../components/ExerciseHistorySheet";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { MButton } from "../components/MButton";

export interface WorkoutDetailScreenProps {
  workoutId: string;
  trackLoading?: boolean;
  onBack: () => void;
  onStart: (workoutId: string) => void;
  onEdit: (workoutId: string) => void;
  onDeleted: () => void;
}

export function WorkoutDetailScreen({
  workoutId,
  trackLoading,
  onBack,
  onStart,
  onEdit,
  onDeleted,
}: WorkoutDetailScreenProps) {
  const { user } = useAuth();
  const { data: workout, loading, error } = useWorkout(workoutId);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [historyExercise, setHistoryExercise] = useState<string | null>(null);

  const isOwned = Boolean(user?.id && workout?.userId === user.id);
  const setCount = workout?.exercises.reduce((a, e) => a + e.sets.length, 0) ?? 0;

  const handleDelete = async () => {
    if (!workout) return;
    setBusy(true);
    setActionError(null);
    try {
      await deleteWorkout(workout.id);
      setDeleteConfirmOpen(false);
      onDeleted();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: M.mut, fontSize: 14 }}>
        Workout wird geladen…
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 22 }}>
        <div style={{ color: M.mut, fontSize: 14 }}>{error ?? "Workout nicht gefunden."}</div>
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
        <span style={{ fontSize: 12, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>WORKOUT</span>
        <div style={{ width: 24 }} />
      </div>

      {actionError && <div style={{ padding: "0 22px 8px", color: "#ff8a8a", fontSize: 13 }}>{actionError}</div>}

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 22px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 30, lineHeight: 1.1 }}>{workout.name}</div>
          {!isOwned && <MTag>Vorlage</MTag>}
        </div>
        {workout.sub && <div style={{ fontSize: 13, color: M.mut, marginTop: 8, fontWeight: 600 }}>{workout.sub}</div>}

        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          {workout.tags.map((t) => (
            <MTag key={t}>{t}</MTag>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 14,
            fontSize: 12.5,
            color: M.mut,
            fontWeight: 600,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="dumbbell" size={15} stroke={2} color={M.mut} />
            {workout.exercises.length} Übungen
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="list" size={15} stroke={2} color={M.mut} />
            {setCount} Sätze
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="clock" size={15} stroke={2} color={M.mut} />~{workout.dur} Min
          </span>
        </div>

        <div style={{ marginTop: 18, fontSize: 11, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>ÜBUNGEN</div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {segmentExercises(workout.exercises).map((seg) => {
            const renderEx = (ex: (typeof workout.exercises)[number]) => {
              const summary = formatSetSummary(ex.sets, ex.metric);
              const uniform = isUniform(ex.sets);
              return (
                <div
                  key={ex.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: M.card,
                    border: "1px solid " + M.line2,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: M.accSoft,
                        color: M.acc,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                      }}
                    >
                      <Icon name="dumbbell" size={16} stroke={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: M.fg }}>{ex.name}</div>
                      {ex.note && (
                        <div style={{ color: M.mut, fontSize: 12, marginTop: 2, fontWeight: 500 }}>{ex.note}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistoryExercise(ex.name);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: M.mut2,
                        display: "flex",
                        padding: 4,
                        marginRight: 4,
                      }}
                    >
                      <Icon name="history" size={16} stroke={2} />
                    </button>
                    <span style={{ color: M.mut2, flex: "0 0 auto", fontSize: 12.5 }}>{summary}</span>
                  </div>
                  {!uniform && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {ex.sets.map((s, si) => (
                        <div
                          key={si}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "4px 8px",
                            borderRadius: 8,
                            background: M.accSoft,
                            fontSize: 12,
                            color: M.mut,
                          }}
                        >
                          <span>Satz {si + 1}</span>
                          <span style={{ fontFamily: M.disp, fontWeight: 700, color: M.fg }}>
                            {s.kg} kg × {s.reps}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            };
            if (seg.kind === "single") return renderEx(seg.exercise);
            return (
              <SupersetBlock key={seg.exercises.map((e) => e.id).join("-")}>
                {seg.exercises.map((ex) => renderEx(ex))}
              </SupersetBlock>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "10px 22px 14px", display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid " + M.line2 }}>
        <MButton
          disabled={trackLoading || busy}
          onClick={() => onStart(workout.id)}
          variant="primary"
          size="md"
          fullWidth
          loading={trackLoading || busy}
        >
          <Icon name="play" size={16} color={M.accInk} />
          Workout starten
        </MButton>

        {isOwned && (
          <div style={{ display: "flex", flexDirection: "row", alignItems: "stretch", gap: 8, flexWrap: "nowrap" }}>
            <MButton
              disabled={busy || trackLoading}
              onClick={() => onEdit(workout.id)}
              variant="secondary"
              size="sm"
              style={{ flex: 1, minWidth: 0, background: M.card }}
            >
              <Icon name="edit" size={16} stroke={2} color={M.fg} />
              Bearbeiten
            </MButton>
            <MButton
              disabled={busy || trackLoading}
              onClick={() => setDeleteConfirmOpen(true)}
              variant="danger"
              size="icon"
              aria-label="Workout löschen"
              style={{ flexShrink: 0 }}
            >
              <Icon name="trash" size={16} stroke={2} color={M.mut2} />
            </MButton>
          </div>
        )}
      </div>

      {deleteConfirmOpen && workout && (
        <DeleteConfirmDialog
          title="Workout löschen?"
          message={
            <>
              Möchtest du <strong style={{ color: M.fg }}>{workout.name}</strong> wirklich löschen?
            </>
          }
          step2Title="Endgültig löschen?"
          step2Message={
            <>
              Diese Aktion kann nicht rückgängig gemacht werden. Workout{" "}
              <strong style={{ color: M.fg }}>{workout.name}</strong> unwiderruflich entfernen?
            </>
          }
          busy={busy}
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={handleDelete}
        />
      )}
      <ExerciseHistorySheet
        open={Boolean(historyExercise)}
        onClose={() => setHistoryExercise(null)}
        exerciseName={historyExercise}
      />
    </div>
  );
}
