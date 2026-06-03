import { BottomSheet } from "./BottomSheet";
import { OneRmCalculatorBody } from "./OneRmCalculatorBody";
import { M } from "../theme";

export interface OneRmCalculatorSheetProps {
  open: boolean;
  onClose: () => void;
  initialWeight?: number;
  initialReps?: number;
  /** Remount body when open exercise changes (e.g. exercise id). */
  resetKey?: string;
}

export function OneRmCalculatorSheet({
  open,
  onClose,
  initialWeight,
  initialReps,
  resetKey,
}: OneRmCalculatorSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} zIndex={30} aria-label="1RM-Rechner">
      <div
        style={{
          fontFamily: M.disp,
          fontWeight: 700,
          fontSize: 22,
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        1RM-Rechner
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <OneRmCalculatorBody
          key={resetKey}
          compact
          initialWeight={initialWeight}
          initialReps={initialReps}
        />
      </div>
    </BottomSheet>
  );
}
