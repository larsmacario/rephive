import { useEffect, useMemo, useState } from "react";
import {
  formatDistanceEdit,
  formatDurationEdit,
  formatKgDisplay,
  formatRepsDisplay,
  parseDistanceInput,
  parseDurationInput,
  parseKgInput,
  parseRepsInput,
  type SetField,
} from "../lib/exerciseSets";
import { formatDistanceM, formatDurationSec } from "../lib/exerciseCatalog";
import { M, mMini } from "../theme";

export interface SetValueStepperProps {
  label?: string;
  value: number;
  step: number;
  min?: number;
  onChange: (value: number) => void;
  editable?: boolean;
  kind?: SetField;
  fontSize?: number;
  minWidth?: number;
}

type StepperFormatters = {
  display: (value: number) => string;
  edit: (value: number) => string;
  parse: (raw: string) => number | null;
  inputMode: "decimal" | "numeric" | "text";
  roundInc: (value: number, step: number) => number;
};

function defaultFormatters(kind?: SetField): StepperFormatters {
  if (kind === "reps") {
    return {
      display: formatRepsDisplay,
      edit: formatRepsDisplay,
      parse: parseRepsInput,
      inputMode: "numeric",
      roundInc: (value, step) => Math.max(1, Math.round(value + step)),
    };
  }
  if (kind === "durationSec") {
    return {
      display: formatDurationSec,
      edit: formatDurationEdit,
      parse: parseDurationInput,
      inputMode: "text",
      roundInc: (value, step) => Math.round(value + step),
    };
  }
  if (kind === "distanceM") {
    return {
      display: formatDistanceM,
      edit: formatDistanceEdit,
      parse: parseDistanceInput,
      inputMode: "text",
      roundInc: (value, step) => Math.round(value + step),
    };
  }
  return {
    display: formatKgDisplay,
    edit: formatKgDisplay,
    parse: parseKgInput,
    inputMode: "decimal",
    roundInc: (value, step) => +(value + step).toFixed(2),
  };
}

export function SetValueStepper({
  label,
  value,
  step,
  min = 0,
  onChange,
  editable = false,
  kind,
  fontSize = 18,
  minWidth,
}: SetValueStepperProps) {
  const formatters = useMemo(() => defaultFormatters(kind), [kind]);
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(formatters.edit(value));
  }, [value, focused, formatters]);

  const dec = () => {
    const next = formatters.roundInc(value, -step);
    onChange(kind === "kg" ? Math.max(min, +next.toFixed(2)) : Math.max(min, next));
  };
  const inc = () => onChange(Math.max(min, formatters.roundInc(value, step)));

  const commitDraft = () => {
    const parsed = formatters.parse(draft);
    if (parsed !== null) onChange(Math.max(min, parsed));
    setDraft(formatters.edit(parsed ?? value));
    setFocused(false);
  };

  const displayWidth =
    minWidth ??
    (editable
      ? kind === "reps"
        ? 32
        : kind === "durationSec" || kind === "distanceM"
          ? 52
          : 48
      : fontSize >= 20
        ? 34
        : 22);

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button type="button" onClick={dec} style={mMini}>
          –
        </button>
        {editable ? (
          <input
            type="text"
            inputMode={formatters.inputMode}
            value={focused ? draft : formatters.display(value)}
            onFocus={() => {
              setFocused(true);
              setDraft(formatters.edit(value));
            }}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDraft();
              }
            }}
            style={{
              width: displayWidth,
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize,
              fontVariantNumeric: "tabular-nums",
              textAlign: "center",
              background: M.card,
              border: "1px solid " + M.line2,
              borderRadius: 8,
              color: M.fg,
              padding: "2px 4px",
              outline: "none",
            }}
          />
        ) : (
          <span
            style={{
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize,
              fontVariantNumeric: "tabular-nums",
              minWidth: displayWidth,
              textAlign: "center",
            }}
          >
            {formatters.display(value)}
          </span>
        )}
        <button type="button" onClick={inc} style={mMini}>
          +
        </button>
      </div>
      {label && (
        <div style={{ fontSize: 9, letterSpacing: 1, color: M.mut2, fontWeight: 700, marginTop: 2 }}>{label}</div>
      )}
    </div>
  );
}
