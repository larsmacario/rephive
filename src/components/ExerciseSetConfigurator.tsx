import { M, mMini, mMiniLg } from "../theme";
import {
  addIndividualSet,
  bumpUniformField,
  editIndividualSet,
  removeIndividualSet,
  setIndividualSetValue,
  setSetWarmUp,
  setUniformCount,
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
import { SetMetricFields } from "./SetMetricFields";
import { SetValueStepper } from "./SetValueStepper";
import { WarmUpSetToggle } from "./WarmUpSetToggle";
import { SetTable } from "./SetTable";
import { useBreakpoint } from "../lib/responsive";

const UNIFORM_ROW_WIDTH = "min(300px, 100%)";

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
  /** Cap uniform/individual set count (e.g. MetCon = 1). */
  maxSets?: number;
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
            fontSize: 13,
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
  maxSets,
}: ExerciseSetConfiguratorProps) {
  const isMobile = useBreakpoint() === "mobile";
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
  const warmUpChecked = Boolean(sets[0]?.warmUp);
  const singleSetOnly = maxSets === 1;
  const uiSize = compact ? "md" : "lg";

  const toggleWarmUp = (enabled: boolean) => {
    onChange(setMode, setSetWarmUp(sets, enabled));
  };

  return (
    <div style={{ width: "100%" }}>
      {!singleSetOnly && <SetModeToggle setMode={setMode} onChange={handleModeChange} />}

      {setMode === "uniform" || singleSetOnly ? (
        compact ? (
          <div style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "flex-start",
                gap: 8,
                flexWrap: "wrap",
                width: "100%",
              }}
            >
              {!singleSetOnly && (
                <>
                  <UniformStepper
                    label="SÄTZE"
                    value={count}
                    size={uiSize}
                    onDec={() => bumpUniform("count", -1)}
                    onInc={() => bumpUniform("count", 1)}
                  />
                  <span
                    style={{
                      color: M.mut2,
                      fontFamily: M.disp,
                      fontSize: 14,
                      lineHeight: 1,
                      paddingBottom: 6,
                    }}
                  >
                    ×
                  </span>
                </>
              )}
              <SetMetricFields
                set={template}
                metric={metric}
                layout="inline"
                compact={compact}
                size={uiSize}
                onBump={(field, delta) => bumpUniform(field, delta)}
                onSetValue={(field, value) => onChange("uniform", setUniformField(sets, field, value, metric))}
              />
            </div>
            {!singleSetOnly && (
              <WarmUpSetToggle layout="full" size={uiSize} checked={warmUpChecked} onChange={toggleWarmUp} />
            )}
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            {!singleSetOnly && (
              <div style={{ width: UNIFORM_ROW_WIDTH }}>
                <SetValueStepper
                  label="SÄTZE"
                  value={count}
                  step={1}
                  min={1}
                  kind="reps"
                  onChange={(value) => onChange("uniform", setUniformCount(sets, value, metric))}
                  size="lg"
                  uniformRow
                  fullWidth
                  editable
                />
              </div>
            )}
            <SetMetricFields
              set={template}
              metric={metric}
              layout="uniformStack"
              size="lg"
              onBump={(field, delta) => bumpUniform(field, delta)}
              onSetValue={(field, value) => onChange("uniform", setUniformField(sets, field, value, metric))}
            />
            {!singleSetOnly && (
              <WarmUpSetToggle layout="full" size="lg" checked={warmUpChecked} onChange={toggleWarmUp} />
            )}
          </div>
        )
      ) : (
        <SetTable
          sets={sets}
          metric={metric}
          variant={variant}
          compact={compact}
          size={uiSize}
          stacked={isMobile && !compact}
          onBumpSet={(si, field, delta) => editSet(si, field, delta)}
          onSetValue={(si, field, value) => setField(si, field, value)}
          onToggleDone={variant === "tracked" ? toggleDone : undefined}
          onRemove={(si) => onChange("individual", removeIndividualSet(sets, si))}
          onWarmUpChange={toggleWarmUp}
          onAddSet={() => onChange("individual", addIndividualSet(sets))}
        />
      )}
    </div>
  );
}

function UniformStepper({
  label,
  value,
  onDec,
  onInc,
  size = "md",
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  size?: "md" | "lg";
}) {
  const isLg = size === "lg";
  const btn = isLg ? mMiniLg : mMini;

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: isLg ? 8 : 5 }}>
        <button type="button" onClick={onDec} style={btn} aria-label={`${label} verringern`}>
          –
        </button>
        <span
          style={{
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: isLg ? 26 : 18,
            minWidth: isLg ? 28 : 22,
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
        <button type="button" onClick={onInc} style={btn} aria-label={`${label} erhöhen`}>
          +
        </button>
      </div>
      <div
        style={{
          fontSize: isLg ? 12 : 13,
          letterSpacing: 1,
          color: M.mut2,
          fontWeight: 700,
          marginTop: isLg ? 8 : 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}
