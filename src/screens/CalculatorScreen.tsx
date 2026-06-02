import { useState, useMemo } from "react";
import { M } from "../theme";
import { Icon } from "../components/Icon";
import { calculateOneRepMax, getPercentageBreakdown } from "../lib/oneRepMax";

export interface CalculatorScreenProps {
  onBack: () => void;
}

export function CalculatorScreen({ onBack }: CalculatorScreenProps) {
  const [weightInput, setWeightInput] = useState<number>(100);
  const [repsInput, setRepsInput] = useState<number>(5);
  const [weightDraft, setWeightDraft] = useState<string>("100");
  const [repsDraft, setRepsDraft] = useState<string>("5");
  const [showFormulas, setShowFormulas] = useState<boolean>(false);

  // Synchronize weight inputs (numeric value and text input string)
  const handleWeightChange = (newVal: number) => {
    const clamped = Math.max(0, Math.min(999, newVal));
    setWeightInput(clamped);
    setWeightDraft(clamped.toString());
  };

  const handleRepsChange = (newVal: number) => {
    const clamped = Math.max(1, Math.min(30, newVal));
    setRepsInput(clamped);
    setRepsDraft(clamped.toString());
  };

  // Perform Calculations
  const estimates = useMemo(() => {
    return calculateOneRepMax(weightInput, repsInput);
  }, [weightInput, repsInput]);

  const percentageTable = useMemo(() => {
    return getPercentageBreakdown(estimates.epley);
  }, [estimates.epley]);

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          padding: "2px 22px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: M.mut, display: "flex" }}
        >
          <Icon name="chevL" size={24} stroke={2.2} />
        </button>
        <span style={{ fontSize: 12, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>1RM RECHNER</span>
        <span style={{ width: 24 }} />
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "0 22px 24px",
        }}
      >
        {/* Input Card */}
        <div
          style={{
            background: M.card,
            border: "1px solid " + M.line2,
            borderRadius: 18,
            padding: "16px 16px 18px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", gap: 16 }}>
            {/* Weight Input */}
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: 11,
                  letterSpacing: 1,
                  color: M.mut,
                  fontWeight: 700,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                GEWICHT (KG)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  type="button"
                  onClick={() => handleWeightChange(weightInput - 2.5)}
                  style={{
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
                  }}
                >
                  <span style={{ fontWeight: 700 }}>-</span>
                </button>
                <input
                  type="text"
                  inputMode="decimal"
                  value={weightDraft}
                  onChange={(e) => {
                    setWeightDraft(e.target.value);
                    const val = parseFloat(e.target.value.replace(",", "."));
                    if (!isNaN(val)) {
                      setWeightInput(Math.max(0, Math.min(999, val)));
                    }
                  }}
                  onBlur={() => {
                    setWeightDraft(weightInput.toString());
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: 36,
                    fontFamily: M.disp,
                    fontWeight: 700,
                    fontSize: 20,
                    textAlign: "center",
                    background: M.panel,
                    border: "1px solid " + M.line,
                    borderRadius: 10,
                    color: M.fg,
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleWeightChange(weightInput + 2.5)}
                  style={{
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
                  }}
                >
                  <span style={{ fontWeight: 700 }}>+</span>
                </button>
              </div>
            </div>

            {/* Reps Input */}
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: 11,
                  letterSpacing: 1,
                  color: M.mut,
                  fontWeight: 700,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                WIEDERHOLUNGEN
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  type="button"
                  onClick={() => handleRepsChange(repsInput - 1)}
                  style={{
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
                  }}
                >
                  <span style={{ fontWeight: 700 }}>-</span>
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={repsDraft}
                  onChange={(e) => {
                    setRepsDraft(e.target.value);
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setRepsInput(Math.max(1, Math.min(30, val)));
                    }
                  }}
                  onBlur={() => {
                    setRepsDraft(repsInput.toString());
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: 36,
                    fontFamily: M.disp,
                    fontWeight: 700,
                    fontSize: 20,
                    textAlign: "center",
                    background: M.panel,
                    border: "1px solid " + M.line,
                    borderRadius: 10,
                    color: M.fg,
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleRepsChange(repsInput + 1)}
                  style={{
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
                  }}
                >
                  <span style={{ fontWeight: 700 }}>+</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 1RM Result Card */}
        <div
          style={{
            borderRadius: 20,
            padding: "20px 18px",
            background: "linear-gradient(160deg, color-mix(in oklab, var(--mom-acc, oklch(0.87 0.21 143)) 18%, #151915), #121512)",
            border: "1px solid " + M.line,
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: 1.4, color: M.acc, fontWeight: 700 }}>
            GESCHÄTZTES MAXIMUM (1RM)
          </div>
          <div
            style={{
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 60,
              lineHeight: 1,
              marginTop: 10,
              color: M.acc,
            }}
          >
            {estimates.epley} <span style={{ fontSize: 24, fontWeight: 600 }}>kg</span>
          </div>
          <div style={{ fontSize: 12, color: M.mut, marginTop: 8 }}>
            Berechnet nach der Epley-Formel
          </div>
        </div>

        {/* Formula Comparison */}
        <div
          style={{
            background: M.card,
            border: "1px solid " + M.line2,
            borderRadius: 18,
            padding: "12px 16px",
            marginBottom: 16,
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
              justifyContent: "between",
              cursor: "pointer",
              color: M.fg,
            }}
          >
            <span style={{ flex: 1, textAlign: "left", fontSize: 12.5, fontWeight: 600, color: M.fg }}>
              Formel-Vergleich
            </span>
            <Icon name={showFormulas ? "chevD" : "chevR"} size={16} color={M.mut} />
          </button>

          {showFormulas && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid " + M.line2, paddingTop: 10 }}>
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
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderTop: "1px solid " + M.line2, paddingTop: 6 }}>
                <span style={{ color: M.mut, fontWeight: 700 }}>Durchschnitt:</span>
                <span style={{ color: M.acc, fontWeight: 700 }}>{estimates.average} kg</span>
              </div>
            </div>
          )}
        </div>

        {/* Percentage Breakdown */}
        <div>
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
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span
                      style={{
                        fontFamily: M.disp,
                        fontWeight: 700,
                        fontSize: 17,
                        color: row.percentage === 100 ? M.acc : M.fg,
                      }}
                    >
                      {row.percentage}%
                    </span>
                    <span style={{ fontSize: 11.5, color: M.mut }}>des 1RM</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: M.disp,
                        fontWeight: 700,
                        fontSize: 18,
                        color: row.percentage === 100 ? M.acc : M.fg,
                      }}
                    >
                      {row.weight} kg
                    </div>
                    <div style={{ fontSize: 10.5, color: M.mut2, fontWeight: 600 }}>
                      ~ {row.reps} {row.reps === 1 ? "Wdh." : "Wdh."}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
