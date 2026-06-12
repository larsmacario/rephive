import type { Exercise } from "../../lib/engine";
import { formatExpressSetDisplay } from "../../lib/expressTrackingFlow";
import { setVolumeKg } from "../../lib/exerciseCatalog";
import { EXERCISE_ROW, M } from "../../theme";
import { ExerciseListRow } from "../ExerciseListRow";
import { Icon } from "../Icon";
import { MButton } from "../MButton";
import { MStat } from "../widgets";

export interface ExpressWorkoutCompleteViewProps {
  exercises: Exercise[];
  sessionName: string;
  elapsedSec: number;
  onBack: () => void;
}

function fmtElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function summarizeExerciseSets(ex: Exercise): string {
  const doneSets = ex.sets.filter((s) => s.done);
  if (doneSets.length === 0) return `${ex.sets.length} Sätze`;
  const sample = doneSets[0]!;
  const uniform =
    doneSets.length === ex.sets.length &&
    doneSets.every((s) => s.kg === sample.kg && s.reps === sample.reps);
  if (uniform) return `${doneSets.length}× ${formatExpressSetDisplay(sample.kg, sample.reps)}`;
  return `${doneSets.length} Sätze geloggt`;
}

function CompleteLeadingIcon() {
  return (
    <div
      style={{
        width: EXERCISE_ROW.iconSize,
        height: EXERCISE_ROW.iconSize,
        borderRadius: "50%",
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: M.brand,
        color: M.brandInk,
      }}
    >
      <Icon name="check" size={16} stroke={2.6} />
    </div>
  );
}

export function ExpressWorkoutCompleteView({
  exercises,
  sessionName,
  elapsedSec,
  onBack,
}: ExpressWorkoutCompleteViewProps) {
  const doneSets = exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const totalSets = exercises.reduce((a, e) => a + e.sets.length, 0);
  const volumeKg = exercises.reduce(
    (a, e) =>
      a + e.sets.filter((s) => s.done).reduce((b, s) => b + setVolumeKg(s, e.metric ?? "weight_reps"), 0),
    0,
  );

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          padding: "8px 18px 4px",
          flexShrink: 0,
        }}
      >
        <MButton type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Zur Übersicht">
          <Icon name="chevL" size={22} stroke={2.2} color={M.mut} />
        </MButton>
        <span
          style={{
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: 20,
            fontVariantNumeric: "tabular-nums",
            color: M.fg,
          }}
        >
          {fmtElapsed(elapsedSec)}
        </span>
        <div aria-hidden />
      </div>

      <div style={{ padding: "0 18px 12px", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              background: M.brandSoft,
              border: "1px solid " + M.brandBorder,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="check" size={22} stroke={2.6} color={M.brand} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, color: M.fg, lineHeight: 1.15 }}>
              Workout abgeschlossen
            </div>
            <div
              style={{
                fontSize: 13,
                color: M.mut,
                marginTop: 4,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {sessionName}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <MStat label="SÄTZE" value={`${doneSets}/${totalSets}`} />
          <MStat label="VOLUMEN" value={`${(volumeKg / 1000).toFixed(1)}t`} />
          <MStat label="ÜBUNGEN" value={String(exercises.length)} />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          padding: "0 18px 12px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: 1.2,
            color: M.mut,
            fontWeight: 700,
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Übersicht
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {exercises.map((ex) => (
            <ExerciseListRow
              key={ex.id}
              title={ex.name}
              subtitle={summarizeExerciseSets(ex)}
              leading={<CompleteLeadingIcon />}
              background="card"
            />
          ))}
        </div>
      </div>
    </>
  );
}
