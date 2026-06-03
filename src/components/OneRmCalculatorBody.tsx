import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { M } from "../theme";
import { Icon } from "./Icon";
import { KG_STEP, clampKg, formatKgDisplay } from "../lib/exerciseSets";
import {
  calculateOneRepMax,
  getPercentageBreakdown,
  ONE_RM_DEFAULT_REPS,
  ONE_RM_DEFAULT_WEIGHT,
} from "../lib/oneRepMax";

export interface OneRmCalculatorBodyProps {
  initialWeight?: number;
  initialReps?: number;
  compact?: boolean;
}

const stepBtn: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: "1px solid " + M.line,
  background: M.panel,
  color: M.fg,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

interface CalculatorStepperProps {
  label: string;
  value: number;
  displayValue: string;
  step: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function CalculatorStepper({ label, value, displayValue, step, min, max, onChange }: CalculatorStepperProps) {
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(Math.min(max, +(value + step).toFixed(2)));

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: 0.6,
          color: M.mut,
          fontWeight: 700,
          marginBottom: 6,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button type="button" onClick={dec} style={stepBtn} aria-label={`${label} verringern`}>
          <span style={{ fontWeight: 700 }}>−</span>
        </button>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: M.panel,
            border: "1px solid " + M.line,
            borderRadius: 10,
          }}
        >
          <span
            style={{
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 20,
              color: M.fg,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {displayValue}
          </span>
        </div>
        <button type="button" onClick={inc} style={stepBtn} aria-label={`${label} erhöhen`}>
          <span style={{ fontWeight: 700 }}>+</span>
        </button>
      </div>
    </div>
  );
}

export function OneRmCalculatorBody({
  initialWeight = ONE_RM_DEFAULT_WEIGHT,
  initialReps = ONE_RM_DEFAULT_REPS,
  compact = false,
}: OneRmCalculatorBodyProps) {
  const [weightInput, setWeightInput] = useState(initialWeight);
  const [repsInput, setRepsInput] = useState(initialReps);
  const [showFormulas, setShowFormulas] = useState(false);

  useEffect(() => {
    setWeightInput(initialWeight);
    setRepsInput(initialReps);
  }, [initialWeight, initialReps]);

  const handleWeightChange = (newVal: number) => {
    setWeightInput(clampKg(Math.max(0, Math.min(999, newVal))));
  };

  const handleRepsChange = (newVal: number) => {
    setRepsInput(Math.max(1, Math.min(30, Math.round(newVal))));
  };

  const estimates = useMemo(() => calculateOneRepMax(weightInput, repsInput), [weightInput, repsInput]);
  const percentageTable = useMemo(() => getPercentageBreakdown(estimates.epley), [estimates.epley]);

  const blockGap = compact ? 12 : 16;
  const heroFontSize = compact ? 48 : 60;

  return (
    <>
      <div
        style={{
          background: M.card,
          border: "1px solid " + M.line2,
          borderRadius: 18,
          padding: compact ? "14px 14px 16px" : "16px 16px 18px",
          marginBottom: blockGap,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          <CalculatorStepper
            label="GEWICHT (KG)"
            value={weightInput}
            displayValue={formatKgDisplay(weightInput)}
            step={KG_STEP}
            min={0}
            max={999}
            onChange={handleWeightChange}
          />
          <CalculatorStepper
            label="WIEDERHOLUNGEN"
            value={repsInput}
            displayValue={String(repsInput)}
            step={1}
            min={1}
            max={30}
            onChange={handleRepsChange}
          />
        </div>
      </div>

      <div
        style={{
          borderRadius: 20,
          padding: compact ? "16px 14px" : "20px 18px",
          background:
            "linear-gradient(160deg, color-mix(in oklab, var(--mom-acc, oklch(0.87 0.21 143)) 18%, #151915), #121512)",
          border: "1px solid " + M.line,
          marginBottom: blockGap,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 1.4, color: M.acc, fontWeight: 700 }}>
          GESCHÄTZTES MAXIMUM (1RM)
        </div>
        <div
          style={{
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: heroFontSize,
            lineHeight: 1,
            marginTop: 10,
            color: M.acc,
          }}
        >
          {estimates.epley} <span style={{ fontSize: compact ? 20 : 24, fontWeight: 600 }}>kg</span>
        </div>
        <div style={{ fontSize: 12, color: M.mut, marginTop: 8 }}>Berechnet nach der Epley-Formel</div>
      </div>

      <div
        style={{
          background: M.card,
          border: "1px solid " + M.line2,
          borderRadius: 18,
          padding: "12px 16px",
          marginBottom: blockGap,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setShowFormulas(!showFormulas)}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            cursor: "pointer",
            color: M.fg,
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 600, color: M.fg }}>Formel-Vergleich</span>
          <Icon name={showFormulas ? "chevD" : "chevR"} size={16} color={M.mut} />
        </button>

        {showFormulas && (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              borderTop: "1px solid " + M.line2,
              paddingTop: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: M.mut }}>Epley:</span>
              <span style={{ color: M.fg, fontWeight: 600 }}>{estimates.epley} kg</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: M.mut }}>Brzycki:</span>
              <span style={{ color: M.fg, fontWeight: 600 }}>{estimates.brzycki} kg</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: M.mut }}>Lander:</span>
              <span style={{ color: M.fg, fontWeight: 600 }}>{estimates.lander} kg</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: M.mut }}>Lombardi:</span>
              <span style={{ color: M.fg, fontWeight: 600 }}>{estimates.lombardi} kg</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                borderTop: "1px solid " + M.line2,
                paddingTop: 8,
                marginTop: 2,
              }}
            >
              <span style={{ color: M.mut, fontWeight: 700 }}>Durchschnitt:</span>
              <span style={{ color: M.acc, fontWeight: 700 }}>{estimates.average} kg</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 1.4,
            color: M.mut,
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          BELASTUNGSGRENZEN & WIEDERHOLUNGEN
        </div>
        <div
          style={{
            background: M.card,
            border: "1px solid " + M.line2,
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          {percentageTable.map((row, idx) => {
            const isEven = idx % 2 === 0;
            const isMax = row.percentage === 100;
            const accent = isMax ? M.acc : M.fg;
            const repsColor = isMax ? M.acc : M.mut2;
            return (
              <div
                key={row.percentage}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: isEven ? M.card : M.line2,
                  borderBottom: idx === percentageTable.length - 1 ? "none" : "1px solid " + M.line2,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: M.disp,
                      fontWeight: 700,
                      fontSize: 17,
                      color: accent,
                    }}
                  >
                    {row.percentage}%
                  </span>
                  <span style={{ fontSize: 11.5, color: isMax ? M.acc : M.mut }}>des 1RM</span>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                  <div
                    style={{
                      fontFamily: M.disp,
                      fontWeight: 700,
                      fontSize: 18,
                      color: accent,
                    }}
                  >
                    {formatKgDisplay(row.weight)} kg
                  </div>
                  <div style={{ fontSize: 10.5, color: repsColor, fontWeight: 600, marginTop: 2 }}>
                    ~ {row.reps} Wdh.
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
