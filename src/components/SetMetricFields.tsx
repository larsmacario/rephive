import type { ExerciseMetric, SetLike } from "../lib/exerciseCatalog";
import {
  DEFAULT_EXERCISE_METRIC,
  DISTANCE_STEP_M,
  formatDistanceM,
  formatDurationSec,
  getMetricSpec,
  getSetDistanceM,
  getSetDurationSec,
  TIME_STEP_SEC,
} from "../lib/exerciseCatalog";
import { KG_STEP, type SetField } from "../lib/exerciseSets";
import { M, mMini } from "../theme";
import { SetValueStepper } from "./SetValueStepper";

export interface SetMetricFieldsProps {
  set: SetLike;
  metric?: ExerciseMetric;
  onBump: (field: SetField, delta: number) => void;
  onSetValue?: (field: SetField, value: number) => void;
  compact?: boolean;
  layout?: "inline" | "cells";
}

export function setFieldHeaders(metric: ExerciseMetric = DEFAULT_EXERCISE_METRIC): { key: SetField | "set"; label: string }[] {
  const spec = getMetricSpec(metric);
  const headers: { key: SetField | "set"; label: string }[] = [{ key: "set", label: "SATZ" }];
  if (spec.showKg) headers.push({ key: "kg", label: spec.kgLabel });
  if (spec.showReps) headers.push({ key: "reps", label: "WDH" });
  if (spec.showDistance) headers.push({ key: "distanceM", label: "M" });
  if (spec.showTime) headers.push({ key: "durationSec", label: "ZEIT" });
  return headers;
}

function fieldDisplay(set: SetLike, field: SetField, metric: ExerciseMetric): string | number {
  if (field === "kg") return set.kg;
  if (field === "reps") return set.reps;
  if (field === "durationSec") return formatDurationSec(getSetDurationSec(set, metric));
  if (field === "distanceM") return formatDistanceM(getSetDistanceM(set, metric));
  return 0;
}

function fieldValue(set: SetLike, field: SetField, metric: ExerciseMetric): number {
  if (field === "kg") return set.kg;
  if (field === "reps") return set.reps;
  if (field === "durationSec") return getSetDurationSec(set, metric);
  if (field === "distanceM") return getSetDistanceM(set, metric);
  return 0;
}

function fieldStep(field: SetField): number {
  if (field === "kg") return KG_STEP;
  if (field === "reps") return 1;
  if (field === "durationSec") return TIME_STEP_SEC;
  return DISTANCE_STEP_M;
}

function fieldMin(field: SetField): number {
  if (field === "reps") return 1;
  if (field === "kg") return 0;
  if (field === "durationSec") return TIME_STEP_SEC;
  return DISTANCE_STEP_M;
}

function fieldMinWidth(field: SetField, compact: boolean): number {
  if (field === "reps") return compact ? 28 : 32;
  if (field === "kg") return 48;
  if (field === "durationSec" || field === "distanceM") return compact ? 44 : 52;
  return 40;
}

function fieldLabel(field: SetField, spec: ReturnType<typeof getMetricSpec>): string {
  if (field === "reps") return "WDH";
  if (field === "durationSec") return "ZEIT";
  if (field === "distanceM") return "M";
  return spec.kgLabel;
}

export function SetMetricFields({
  set,
  metric = DEFAULT_EXERCISE_METRIC,
  onBump,
  onSetValue,
  compact = false,
  layout = "cells",
}: SetMetricFieldsProps) {
  const spec = getMetricSpec(metric);
  const fontSize = compact ? 15 : 21;
  const fields: SetField[] = [];
  if (spec.showKg) fields.push("kg");
  if (spec.showReps) fields.push("reps");
  if (spec.showDistance) fields.push("distanceM");
  if (spec.showTime) fields.push("durationSec");

  const renderEditableField = (field: SetField, withLabel = false) => (
    <SetValueStepper
      label={withLabel ? fieldLabel(field, spec) : undefined}
      value={fieldValue(set, field, metric)}
      step={fieldStep(field)}
      min={fieldMin(field)}
      kind={field}
      onChange={(val) => onSetValue!(field, val)}
      editable
      fontSize={compact ? 17 : 18}
      minWidth={fieldMinWidth(field, compact)}
    />
  );

  const renderField = (field: SetField) => {
    if (onSetValue) return renderEditableField(field);

    const isTime = field === "durationSec";
    const isDist = field === "distanceM";
    const display = fieldDisplay(set, field, metric);

    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <button type="button" onClick={() => onBump(field, -1)} style={mMini}>
          –
        </button>
        <span
          style={{
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: isTime || isDist ? (compact ? 14 : 16) : fontSize,
            fontVariantNumeric: "tabular-nums",
            minWidth: isTime || isDist ? 44 : 22,
            textAlign: "center",
          }}
        >
          {display}
        </span>
        <button type="button" onClick={() => onBump(field, 1)} style={mMini}>
          +
        </button>
      </div>
    );
  };

  if (layout === "inline") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: compact ? 8 : 10, flexWrap: "wrap" }}>
        {fields.map((field, i) => (
          <div key={field} style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 8 }}>
            {i > 0 && (
              <span style={{ color: M.mut2, fontFamily: M.disp, fontSize: compact ? 14 : 16 }}>×</span>
            )}
            {onSetValue ? (
              renderEditableField(field, true)
            ) : (
              <div style={{ textAlign: "center" }}>
                {renderField(field)}
                <div style={{ fontSize: 9, letterSpacing: 1, color: M.mut2, fontWeight: 700, marginTop: 2 }}>
                  {fieldLabel(field, spec)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {fields.map((field) => (
        <div key={field} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {renderField(field)}
        </div>
      ))}
    </>
  );
}
