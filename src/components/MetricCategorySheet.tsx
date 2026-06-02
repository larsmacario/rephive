import { EXERCISE_METRICS, metricLabel, type ExerciseMetric } from "../lib/exerciseCatalog";
import { M } from "../theme";
import { Icon } from "./Icon";

export interface MetricCategorySheetProps {
  open: boolean;
  value: ExerciseMetric;
  onChange: (metric: ExerciseMetric) => void;
  onClose: () => void;
}

export function MetricCategorySheet({ open, value, onChange, onClose }: MetricCategorySheetProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,7,5,.6)",
        backdropFilter: "blur(4px)",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: M.panel,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTop: "1px solid " + M.line,
          maxHeight: "70%",
          overflowY: "auto",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: M.line, margin: "12px auto" }} />
        <div
          style={{
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: 20,
            textAlign: "center",
            padding: "4px 18px 12px",
          }}
        >
          Kategorie
        </div>
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
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
