import { useState } from "react";
import { M } from "../theme";
import { LibraryScreen } from "./LibraryScreen";
import { ExercisesScreen } from "./ExercisesScreen";

export type WorkoutsHubView = "workouts" | "exercises";

export interface WorkoutsHubScreenProps {
  onOpenBuilder: () => void;
  onOpenWorkout: (workoutId: string) => void;
  refreshKey?: number;
}

export function WorkoutsHubScreen({
  onOpenBuilder,
  onOpenWorkout,
  refreshKey = 0,
}: WorkoutsHubScreenProps) {
  const [view, setView] = useState<WorkoutsHubView>("workouts");

  const segBtn = (id: WorkoutsHubView, label: string) => {
    const on = view === id;
    return (
      <button
        type="button"
        onClick={() => setView(id)}
        style={{
          flex: 1,
          padding: "10px 0",
          borderRadius: 10,
          border: "none",
          background: on ? M.acc : "transparent",
          color: on ? M.accInk : M.mut,
          fontFamily: M.disp,
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: 0.4,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 22px 0" }}>
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 4,
            borderRadius: 12,
            background: M.card,
            border: "1px solid " + M.line2,
          }}
        >
          {segBtn("workouts", "Workouts")}
          {segBtn("exercises", "Übungen")}
        </div>
      </div>
      {view === "workouts" ? (
        <LibraryScreen
          onOpenBuilder={onOpenBuilder}
          onOpenWorkout={onOpenWorkout}
          refreshKey={refreshKey}
        />
      ) : (
        <ExercisesScreen refreshKey={refreshKey} />
      )}
    </div>
  );
}
