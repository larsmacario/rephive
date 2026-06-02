import { useEffect, useState } from "react";
import { formatKgDisplay, parseKgInput } from "../lib/exerciseSets";
import { M, mMini } from "../theme";

export interface SetValueStepperProps {
  label?: string;
  value: number;
  step: number;
  min?: number;
  onChange: (value: number) => void;
  editable?: boolean;
  fontSize?: number;
  minWidth?: number;
}

export function SetValueStepper({
  label,
  value,
  step,
  min = 0,
  onChange,
  editable = false,
  fontSize = 18,
  minWidth,
}: SetValueStepperProps) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(formatKgDisplay(value));
  }, [value, focused]);

  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(+(value + step).toFixed(2));

  const commitDraft = () => {
    const parsed = parseKgInput(draft);
    if (parsed !== null) onChange(parsed);
    setDraft(formatKgDisplay(parsed ?? value));
    setFocused(false);
  };

  const displayWidth = minWidth ?? (editable ? 48 : fontSize >= 20 ? 34 : 22);

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <button type="button" onClick={dec} style={mMini}>
          –
        </button>
        {editable ? (
          <input
            type="text"
            inputMode="decimal"
            value={focused ? draft : formatKgDisplay(value)}
            onFocus={() => {
              setFocused(true);
              setDraft(formatKgDisplay(value));
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
            {value}
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
