import { EXERCISE_METRICS, metricLabel, type ExerciseMetric } from "../lib/exerciseCatalog";
import { M } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { Icon } from "./Icon";

export interface MetricCategorySheetProps {
  open: boolean;
  value: ExerciseMetric;
  onChange: (metric: ExerciseMetric) => void;
  onClose: () => void;
}

export function MetricCategorySheet({ open, value, onChange, onClose }: MetricCategorySheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} zIndex={30} aria-label="Kategorie">
      <div
        style={{
          fontFamily: M.disp,
          fontWeight: 700,
          fontSize: 20,
          textAlign: "center",
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        Kategorie
      </div>
      <div style={{ margin: "0 -18px" }}>
        {EXERCISE_METRICS.map((m, i) => {
          const selected = value === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onChange(m.id);
                onClose();
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "16px 20px",
                border: "none",
                borderTop: i > 0 ? "1px solid " + M.line2 : "none",
                background: "transparent",
                color: M.fg,
                fontSize: 16,
                fontWeight: selected ? 600 : 400,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {metricLabel(m.id)}
              </span>
              {selected && <Icon name="check" size={20} color={M.acc} stroke={2.4} />}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
