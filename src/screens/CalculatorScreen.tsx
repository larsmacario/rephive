import { M } from "../theme";
import { Icon } from "../components/Icon";
import { OneRmCalculatorBody } from "../components/OneRmCalculatorBody";

export interface CalculatorScreenProps {
  onBack: () => void;
}

export function CalculatorScreen({ onBack }: CalculatorScreenProps) {
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
        <button
          type="button"
          onClick={onBack}
          aria-label="Zurück"
          style={{ background: "none", border: "none", cursor: "pointer", color: M.mut, display: "flex" }}
        >
          <Icon name="chevL" size={24} stroke={2.2} />
        </button>
        <span style={{ fontSize: 12, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>1RM RECHNER</span>
        <span style={{ width: 24 }} />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "0 22px calc(24px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <OneRmCalculatorBody />
      </div>
    </div>
  );
}
