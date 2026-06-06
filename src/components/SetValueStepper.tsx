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
import type { CSSProperties } from "react";
import { M, mMini } from "../theme";

const MINI_LG: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: "1px solid " + M.line,
  background: M.bg,
  color: M.fg,
  fontSize: 20,
  lineHeight: 1,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: M.body,
  flexShrink: 0,
};

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
  size?: "md" | "lg";
  fullWidth?: boolean;
  /** Track-Karten: Label über dem Feld (stack) vs. darunter (inline). */
  labelOnTop?: boolean;
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
  fontSize,
  minWidth,
  size = "md",
  fullWidth = false,
  labelOnTop = true,
}: SetValueStepperProps) {
  const isLg = size === "lg";
  const isTrackRow = fullWidth && isLg;
  const showLabelAbove = Boolean(label && isTrackRow && labelOnTop);
  const resolvedFontSize = fontSize ?? (isTrackRow ? 28 : isLg ? 28 : 18);
  const miniBtn: CSSProperties = isTrackRow
    ? { ...MINI_LG, width: 40, height: 40, fontSize: 20, borderRadius: 10 }
    : isLg
      ? MINI_LG
      : mMini;
  const rowGap = isTrackRow ? 12 : isLg ? 10 : 6;
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

  const trackInputWidth =
    kind === "reps" ? 48 : kind === "durationSec" || kind === "distanceM" ? 80 : 66;

  const useFlexInput = isTrackRow && labelOnTop;

  const displayWidth =
    minWidth ??
    (useFlexInput
      ? undefined
      : isTrackRow
        ? trackInputWidth
        : editable
        ? isLg
          ? kind === "reps"
            ? 44
            : kind === "durationSec" || kind === "distanceM"
              ? 80
              : 72
          : kind === "reps"
            ? 32
            : kind === "durationSec" || kind === "distanceM"
              ? 52
              : 48
        : resolvedFontSize >= 20
          ? 34
          : 22);

  const inputStyle: CSSProperties = {
    ...(useFlexInput
      ? { flex: 1, minWidth: 0, width: "auto" }
      : {
          width: displayWidth,
          minWidth: displayWidth,
          maxWidth: displayWidth,
        }),
    fontFamily: M.disp,
    fontWeight: 700,
    fontSize: resolvedFontSize,
    fontVariantNumeric: "tabular-nums",
    textAlign: "center",
    background: isTrackRow ? M.card : M.card,
    border: "1px solid " + M.line2,
    borderRadius: isTrackRow ? 12 : isLg ? 10 : 8,
    color: M.fg,
    padding: isTrackRow ? "12px 14px" : isLg ? "4px 6px" : "2px 4px",
    outline: "none",
    minHeight: isTrackRow ? 52 : undefined,
    boxSizing: "border-box",
  };

  const valueStyle: CSSProperties = {
    ...(useFlexInput
      ? { flex: 1, minWidth: 0, width: "auto" }
      : {
          width: displayWidth,
          minWidth: displayWidth,
          maxWidth: displayWidth,
        }),
    fontFamily: M.disp,
    fontWeight: 700,
    fontSize: resolvedFontSize,
    fontVariantNumeric: "tabular-nums",
    textAlign: "center",
    display: isTrackRow ? "flex" : undefined,
    alignItems: isTrackRow ? "center" : undefined,
    justifyContent: isTrackRow ? "center" : undefined,
    minHeight: isTrackRow ? 52 : undefined,
    background: isTrackRow ? M.card : undefined,
    border: isTrackRow ? "1px solid " + M.line2 : undefined,
    borderRadius: isTrackRow ? 12 : undefined,
    boxSizing: "border-box",
  };

  return (
    <div style={{ textAlign: "center", width: fullWidth ? "100%" : undefined }}>
      {showLabelAbove ? (
        <div
          style={{
            fontSize: 11,
            letterSpacing: 1.1,
            color: M.mut,
            fontWeight: 600,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          {label}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: rowGap,
          justifyContent: isTrackRow && labelOnTop ? undefined : isTrackRow ? "center" : fullWidth ? "space-between" : undefined,
          width: fullWidth ? "100%" : undefined,
        }}
      >
        <button type="button" onClick={dec} style={miniBtn} aria-label="Wert verringern">
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
            style={inputStyle}
          />
        ) : (
          <span style={valueStyle}>{formatters.display(value)}</span>
        )}
        <button type="button" onClick={inc} style={miniBtn} aria-label="Wert erhöhen">
          +
        </button>
      </div>
      {label && !showLabelAbove ? (
        <div
          style={{
            fontSize: isLg ? 11 : 9,
            letterSpacing: 1,
            color: M.mut2,
            fontWeight: 700,
            marginTop: isLg ? 6 : 2,
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}
