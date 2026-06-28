import { OneRmCalculatorBody } from "../components/OneRmCalculatorBody";
import { SCROLL_BOTTOM_PADDING } from "../lib/responsive";
import { ScreenBackHeader } from "../components/ScreenScroll";

export interface CalculatorScreenProps {
  onBack: () => void;
}

export function CalculatorScreen({ onBack }: CalculatorScreenProps) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <ScreenBackHeader onBack={onBack} title="1RM RECHNER" />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: `0 22px ${SCROLL_BOTTOM_PADDING}px`,
        }}
      >
        <OneRmCalculatorBody />
      </div>
    </div>
  );
}
