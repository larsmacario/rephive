import { M, mMini } from "../theme";
import {
  addIndividualSet,
  bumpUniformField,
  editIndividualSet,
  removeIndividualSet,
  setIndividualSetValue,
  setUniformField,
  switchToIndividual,
  switchToUniform,
  type SetField,
  type SetMode,
  type TemplateSet,
  type TrackedSet,
} from "../lib/exerciseSets";
import type { ExerciseMetric } from "../lib/exerciseCatalog";
import { DEFAULT_EXERCISE_METRIC } from "../lib/exerciseCatalog";
import { Icon } from "./Icon";
import { SetMetricFields, setFieldHeaders } from "./SetMetricFields";

type ConfigSet = TemplateSet | TrackedSet;

function isTrackedSet(s: ConfigSet): s is TrackedSet {
  return "done" in s;
}

export interface ExerciseSetConfiguratorProps {
  variant: "template" | "tracked";
  setMode: SetMode;
  sets: ConfigSet[];
  onChange: (setMode: SetMode, sets: ConfigSet[]) => void;
  metric?: ExerciseMetric;
  compact?: boolean;
}

export function SetModeToggle({
  setMode,
  onChange,
}: {
  setMode: SetMode;
  onChange: (mode: SetMode) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        borderRadius: 10,
        border: "1px solid " + M.line2,
        overflow: "hidden",
        marginBottom: 10,
      }}
    >
      {(["uniform", "individual"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          style={{
            flex: 1,
            padding: "8px 0",
            border: "none",
            background: setMode === mode ? M.accSoft : "transparent",
            color: setMode === mode ? M.acc : M.mut,
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: 0.4,
            cursor: "pointer",
          }}
        >
          {mode === "uniform" ? "GLEICH" : "INDIVIDUELL"}
        </button>
      ))}
    </div>
  );
}

export function ExerciseSetConfigurator({
  variant,
  setMode,
  sets,
  onChange,
  metric = DEFAULT_EXERCISE_METRIC,
  compact = false,
}: ExerciseSetConfiguratorProps) {
  const headers = setFieldHeaders(metric);
  const valueFontSize = compact ? 17 : 21;

  const handleModeChange = (mode: SetMode) => {
    if (mode === setMode) return;
    const next = mode === "uniform" ? switchToUniform(sets) : switchToIndividual(sets);
    onChange(mode, next);
  };

  const bumpUniform = (field: "count" | SetField, delta: number) => {
    onChange("uniform", bumpUniformField(sets, field, delta, metric));
  };

  const editSet = (index: number, field: SetField, delta: number) => {
    onChange("individual", editIndividualSet(sets, index, field, delta, metric));
  };

  const setField = (index: number, field: SetField, value: number) => {
    onChange("individual", setIndividualSetValue(sets, index, field, value, metric));
  };

  const toggleDone = (index: number) => {
    if (variant !== "tracked") return;
    onChange(
      setMode,
      sets.map((s, i) =>
        i !== index || !isTrackedSet(s) ? s : { ...s, done: !s.done },
      ),
    );
  };

  const count = sets.length || 1;
  const template = sets[0] ?? { reps: 10, kg: 0 };

  return (
    <div style={{ width: "100%" }}>
      <SetModeToggle setMode={setMode} onChange={handleModeChange} />

      {setMode === "uniform" ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: compact ? "flex-start" : "center",
            gap: compact ? 8 : 10,
            flexWrap: "wrap",
          }}
        >
          <UniformStepper label="SÄTZE" value={count} onDec={() => bumpUniform("count", -1)} onInc={() => bumpUniform("count", 1)} />
          <span style={{ color: M.mut2, fontFamily: M.disp, fontSize: compact ? 14 : 16 }}>×</span>
          <SetMetricFields
            set={template}
            metric={metric}
            layout="inline"
            compact={compact}
            onBump={(field, delta) => bumpUniform(field, delta)}
            onSetValue={(field, value) => onChange("uniform", setUniformField(sets, field, value, metric))}
          />
        </div>
      ) : (
        <div>
          <div
            style={{
              display: "flex",
              fontSize: 10,
              letterSpacing: 1.2,
              color: M.mut2,
              fontWeight: 700,
              padding: "4px 4px 8px",
            }}
          >
            {headers.map((h) => (
              <span
                key={h.key}
                style={{
                  width: h.key === "set" ? 34 : undefined,
                  flex: h.key === "set" ? undefined : 1,
                  textAlign: h.key === "set" ? "left" : "center",
                }}
              >
                {h.label}
              </span>
            ))}
            <span style={{ width: variant === "tracked" ? 72 : 36 }} />
          </div>
          {sets.map((s, si) => (
            <div
              key={si}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 4px",
                borderTop: "1px solid " + M.line2,
              }}
            >
              <span
                style={{
                  width: 34,
                  fontFamily: M.disp,
                  fontWeight: 700,
                  fontSize: valueFontSize,
                  color: isTrackedSet(s) && s.done ? M.acc : M.mut,
                }}
              >
                {si + 1}
              </span>
              <SetMetricFields
                set={s}
                metric={metric}
                compact={compact}
                onBump={(field, delta) => editSet(si, field, delta)}
                onSetValue={(field, value) => setField(si, field, value)}
              />
              <div
                style={{
                  width: variant === "tracked" ? 72 : 36,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 6,
                }}
              >
                {variant === "tracked" && isTrackedSet(s) && (
                  <button
                    type="button"
                    onClick={() => toggleDone(si)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      border: s.done ? "none" : "1.5px solid " + M.line,
                      background: s.done ? M.acc : "transparent",
                      color: s.done ? M.accInk : M.mut,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="check" size={17} stroke={2.6} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onChange("individual", removeIndividualSet(sets, si))}
                  disabled={sets.length <= 1}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    border: "1px solid " + M.line2,
                    background: "transparent",
                    color: M.mut2,
                    cursor: sets.length <= 1 ? "not-allowed" : "pointer",
                    opacity: sets.length <= 1 ? 0.4 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="minus" size={16} stroke={2.2} />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange("individual", addIndividualSet(sets))}
            style={{
              width: "100%",
              marginTop: 8,
              padding: "8px 0",
              borderRadius: 10,
              border: "1px dashed " + M.line,
              background: "transparent",
              color: M.mut,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            + Satz
          </button>
        </div>
      )}
    </div>
  );
}

function UniformStepper({
  label,
  value,
  onDec,
  onInc,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <button type="button" onClick={onDec} style={mMini}>
          –
        </button>
        <span
          style={{
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: 18,
            minWidth: 22,
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
        <button type="button" onClick={onInc} style={mMini}>
          +
        </button>
      </div>
      <div style={{ fontSize: 9, letterSpacing: 1, color: M.mut2, fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  );
}
