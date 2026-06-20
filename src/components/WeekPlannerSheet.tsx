import { useEffect, useMemo, useState } from "react";
import type { LibraryPlan } from "../data";
import { planDayDisplayName } from "../data";
import { updatePlanTrainingWeekdays } from "../lib/db";
import {
  defaultTrainingWeekdays,
  getPlanTrainingWeekdays,
  resolveUniquePlanDayWeekdays,
  trainingWeekdayLabel,
  trainingWeekdaysFromPlanDayWeekdays,
} from "../lib/trainingWeekdays";
import { M } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { PlanDayWeekdayPicker } from "./PlanDayWeekdayPicker";
import { Icon } from "./Icon";

export interface WeekPlannerSheetProps {
  open: boolean;
  plan: LibraryPlan | null;
  userId: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export function WeekPlannerSheet({ open, plan, userId, onClose, onSaved }: WeekPlannerSheetProps) {
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planDays = plan?.days ?? [];
  const weekdayLabels = useMemo(() => weekdays.map(trainingWeekdayLabel), [weekdays]);

  useEffect(() => {
    if (!open || !plan || planDays.length === 0) return;
    const planWeekdays = getPlanTrainingWeekdays(plan);
    const resolved = resolveUniquePlanDayWeekdays(
      planDays.map((_, index) => planWeekdays?.[index] ?? null),
    );
    setWeekdays(resolved);
    setError(null);
  }, [open, plan?.id, planDays.length]);

  const handleWeekdayChange = (dayIndex: number, weekday: number) => {
    setWeekdays((prev) => {
      const next = [...prev];
      next[dayIndex] = weekday;
      return next;
    });
    setError(null);
  };

  const handleRestoreDefaults = () => {
    if (planDays.length === 0) return;
    setWeekdays(defaultTrainingWeekdays(planDays.length));
    setError(null);
  };

  const handleSave = async () => {
    if (!plan || planDays.length === 0) return;
    const trainingWeekdays = trainingWeekdaysFromPlanDayWeekdays(weekdays);
    if (new Set(trainingWeekdays).size !== trainingWeekdays.length) {
      setError("Jeder Wochentag darf nur einem Workout zugeordnet sein.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updatePlanTrainingWeekdays(userId, plan.id, trainingWeekdays);
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open && !!plan && planDays.length > 0}
      onClose={onClose}
      position="absolute"
      zIndex={40}
      aria-label="Woche planen"
      fitContent={false}
      wrapScroll
    >
      <div style={{ fontSize: 13, letterSpacing: 1.4, color: M.brand, fontWeight: 700, marginBottom: 6 }}>
        WOCHENPLAN
      </div>
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 24, lineHeight: 1.1, marginBottom: 8 }}>
        Deine Woche planen
      </div>
      <div style={{ color: M.mut, fontSize: 14, lineHeight: 1.45, marginBottom: 16 }}>
        Ordne jedem Workout einen Trainingstag zu. Die Zuordnung gilt als Standard für künftige Wochen.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
        {planDays.map((day, index) => (
          <div
            key={day.id}
            style={{
              background: M.card,
              border: "1px solid " + M.line2,
              borderRadius: 16,
              padding: "14px 14px 12px",
            }}
          >
            <div
              style={{
                fontFamily: M.disp,
                fontWeight: 700,
                fontSize: 18,
                lineHeight: 1.1,
                marginBottom: 10,
              }}
            >
              {planDayDisplayName(day, weekdayLabels)}
            </div>
            <div style={{ color: M.mut, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
              {day.exercises?.length ?? 0} Übung{(day.exercises?.length ?? 0) === 1 ? "" : "en"}
            </div>
            <PlanDayWeekdayPicker
              value={weekdays[index] ?? index}
              disabledWeekdays={weekdays.filter((_, i) => i !== index)}
              onChange={(weekday) => handleWeekdayChange(index, weekday)}
              label=""
              compact
            />
          </div>
        ))}
      </div>

      {error ? (
        <div style={{ color: "#ff8a8a", fontSize: 13, marginBottom: 12, lineHeight: 1.4 }}>{error}</div>
      ) : null}

      <MButton
        type="button"
        onClick={handleRestoreDefaults}
        variant="ghost"
        size="sm"
        fullWidth
        style={{ marginBottom: 10, color: M.mut2 }}
      >
        Standard wiederherstellen
      </MButton>
      <MButton
        type="button"
        onClick={handleSave}
        variant="primary"
        size="md"
        fullWidth
        disabled={saving}
        style={{ marginBottom: 10 }}
      >
        <Icon name="check" size={16} color={M.brandInk} /> {saving ? "Speichern…" : "Woche speichern"}
      </MButton>
      <MButton type="button" onClick={onClose} variant="ghost" size="md" fullWidth disabled={saving}>
        Abbrechen
      </MButton>
    </BottomSheet>
  );
}
