import { useEffect, useState } from "react";
import type { LibraryExercise } from "../data";
import { useAuth } from "../lib/auth";
import { createExercise, updateExercise, type ExerciseInput } from "../lib/db";
import {
  DEFAULT_EXERCISE_METRIC,
  DEFAULT_MUSCLE_GROUP,
  EQUIPMENT_OPTIONS,
  metricLabel,
  normalizeMuscleGroup,
  type ExerciseMetric,
} from "../lib/exerciseCatalog";
import { M } from "../theme";
import { MuscleGroupPicker, initialMuscleGroupFromStored } from "./MuscleGroupPicker";
import { MetricCategorySheet } from "./MetricCategorySheet";
import { Icon } from "./Icon";
export interface ExerciseFormSheetProps {
  open: boolean;
  exercise?: LibraryExercise | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ExerciseFormSheet({ open, exercise, onClose, onSaved }: ExerciseFormSheetProps) {
  const { user } = useAuth();
  const isEdit = Boolean(exercise?.userId);
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<string>(DEFAULT_MUSCLE_GROUP);
  const [muscleGroupRaw, setMuscleGroupRaw] = useState<string | undefined>();
  const [equipment, setEquipment] = useState<string>(EQUIPMENT_OPTIONS[0]);
  const [metric, setMetric] = useState<ExerciseMetric>(DEFAULT_EXERCISE_METRIC);
  const [metricSheetOpen, setMetricSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (exercise) {
      setName(exercise.name);
      const mg = initialMuscleGroupFromStored(exercise.group);
      setMuscleGroup(mg.value);
      setMuscleGroupRaw(mg.rawValue);
      setEquipment(exercise.equip);
      setMetric(exercise.metric);
    } else {
      setName("");
      setMuscleGroup(DEFAULT_MUSCLE_GROUP);
      setMuscleGroupRaw(undefined);
      setEquipment(EQUIPMENT_OPTIONS[0]);
      setMetric(DEFAULT_EXERCISE_METRIC);
    }
    setError(null);
  }, [open, exercise]);

  if (!open) return null;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Bitte einen Namen eingeben.");
      return;
    }
    if (!user) return;
    const input: ExerciseInput = {
      name: trimmed,
      muscleGroup: normalizeMuscleGroup(muscleGroup),
      equipment,
      metric,
    };
    setSaving(true);
    setError(null);
    try {
      if (isEdit && exercise) {
        await updateExercise(exercise.id, input);
      } else {
        await createExercise(user.id, input);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const chipRow = (
    label: string,
    options: readonly string[],
    value: string,
    onChange: (v: string) => void,
  ) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((opt) => {
          const on = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid " + (on ? M.acc : M.line2),
                background: on ? M.accSoft : M.card,
                color: on ? M.acc : M.fg,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,7,5,.6)",
        backdropFilter: "blur(4px)",
        zIndex: 25,
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
          padding: "16px 18px 28px",
          maxHeight: "85%",
          overflowY: "auto",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: M.line, margin: "0 auto 14px" }} />
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, marginBottom: 16 }}>
          {isEdit ? "Übung bearbeiten" : "Übung anlegen"}
        </div>
        <label style={{ display: "block", marginBottom: 14 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 6 }}>
            NAME
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Bankdrücken"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid " + M.line,
              background: M.card,
              color: M.fg,
              fontSize: 15,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </label>
        <MuscleGroupPicker
          value={muscleGroup}
          rawValue={muscleGroupRaw}
          onChange={(g) => {
            setMuscleGroup(g);
            setMuscleGroupRaw(undefined);
          }}
        />
        {chipRow("GERÄT", EQUIPMENT_OPTIONS, equipment, setEquipment)}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 6 }}>
            KATEGORIE
          </div>
          <button
            type="button"
            onClick={() => setMetricSheetOpen(true)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid " + M.line,
              background: M.card,
              color: M.fg,
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {metricLabel(metric)}
            </span>
            <Icon name="chevR" size={18} color={M.mut2} stroke={2.2} />
          </button>
        </div>
        <MetricCategorySheet
          open={metricSheetOpen}
          value={metric}
          onChange={setMetric}
          onClose={() => setMetricSheetOpen(false)}
        />
        {error && <div style={{ color: "#ff8a8a", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button
          disabled={saving}
          onClick={handleSave}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 14,
            border: "none",
            background: M.acc,
            color: M.accInk,
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: 0.8,
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Speichern…" : "SPEICHERN"}
        </button>
      </div>
    </div>
  );
}
