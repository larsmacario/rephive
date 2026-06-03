import { useEffect, useState } from "react";
import type { LibraryExercise } from "../data";
import { useAuth } from "../lib/auth";
import { createExercise, deleteExercise, updateExercise, type ExerciseInput } from "../lib/db";
import {
  CATALOG_UNSELECTED,
  DEFAULT_EXERCISE_METRIC,
  isLegacyMuscleGroup,
  metricLabel,
  normalizeMuscleGroup,
  type ExerciseMetric,
} from "../lib/exerciseCatalog";
import { M } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { EquipmentSelect } from "./EquipmentSelect";
import { MuscleGroupSelect, initialMuscleGroupFromStored } from "./MuscleGroupSelect";
import { MetricCategorySheet } from "./MetricCategorySheet";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { isValidYouTubeUrl, normalizeYouTubeUrl } from "../lib/youtube";
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
  const [muscleGroup, setMuscleGroup] = useState<string>(CATALOG_UNSELECTED);
  const [muscleGroupRaw, setMuscleGroupRaw] = useState<string | undefined>();
  const [equipment, setEquipment] = useState<string>(CATALOG_UNSELECTED);
  const [metric, setMetric] = useState<ExerciseMetric>(DEFAULT_EXERCISE_METRIC);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [metricSheetOpen, setMetricSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
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
      setYoutubeUrl(exercise.youtubeUrl ?? "");
    } else {
      setName("");
      setMuscleGroup(CATALOG_UNSELECTED);
      setMuscleGroupRaw(undefined);
      setEquipment(CATALOG_UNSELECTED);
      setMetric(DEFAULT_EXERCISE_METRIC);
      setYoutubeUrl("");
    }
    setError(null);
    setDeleteConfirmOpen(false);
  }, [open, exercise]);

  const handleDelete = async () => {
    if (!exercise?.id || !exercise.userId || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteExercise(exercise.id);
      setDeleteConfirmOpen(false);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      setDeleteConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Bitte einen Namen eingeben.");
      return;
    }
    if (!muscleGroup.trim()) {
      setError("Bitte eine Muskelgruppe wählen.");
      return;
    }
    if (!equipment.trim()) {
      setError("Bitte ein Gerät wählen.");
      return;
    }
    const youtubeTrimmed = youtubeUrl.trim();
    let normalizedYoutube: string | null = null;
    if (youtubeTrimmed) {
      if (!isValidYouTubeUrl(youtubeTrimmed)) {
        setError("Ungültiger YouTube-Link.");
        return;
      }
      normalizedYoutube = normalizeYouTubeUrl(youtubeTrimmed);
    }
    if (!user) return;
    const input: ExerciseInput = {
      name: trimmed,
      muscleGroup: normalizeMuscleGroup(muscleGroup),
      equipment,
      metric,
      youtubeUrl: normalizedYoutube,
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

  const formTitle = isEdit ? "Übung bearbeiten" : "Übung anlegen";
  const legacyHint =
    muscleGroupRaw && muscleGroupRaw !== muscleGroup && isLegacyMuscleGroup(muscleGroupRaw)
      ? muscleGroupRaw
      : null;

  return (
    <>
    <BottomSheet open={open} onClose={onClose} zIndex={25} aria-label={formTitle}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, marginBottom: 16, flexShrink: 0 }}>
          {formTitle}
        </div>
        <label style={{ display: "block", marginBottom: 14, flexShrink: 0 }}>
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

        <div style={{ display: "flex", gap: 10, marginBottom: legacyHint ? 6 : 14, flexShrink: 0 }}>
          <MuscleGroupSelect
            mode="form"
            embedded
            value={muscleGroup}
            rawValue={muscleGroupRaw}
            onChange={(g) => {
              setMuscleGroup(g);
              setMuscleGroupRaw(undefined);
            }}
          />
          <EquipmentSelect embedded value={equipment} onChange={setEquipment} />
        </div>
        {legacyHint && (
          <div style={{ fontSize: 12, color: M.mut2, marginBottom: 14, flexShrink: 0 }}>
            Früher: {legacyHint}
          </div>
        )}

        <label style={{ display: "block", marginBottom: 14, flexShrink: 0 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 6 }}>
            YOUTUBE-LINK (OPTIONAL)
          </div>
          <input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
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

        <div style={{ marginBottom: 14, flexShrink: 0 }}>
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
        {error && (
          <div style={{ color: "#ff8a8a", fontSize: 13, marginBottom: 12, flexShrink: 0 }}>{error}</div>
        )}
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button
            type="button"
            disabled={saving || deleting}
            onClick={handleSave}
            style={{
              flex: 1,
              padding: "14px 0",
              borderRadius: 14,
              border: "none",
              background: M.acc,
              color: M.accInk,
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: 0.8,
              cursor: saving || deleting ? "wait" : "pointer",
              opacity: saving || deleting ? 0.7 : 1,
            }}
          >
            {saving ? "Speichern…" : "SPEICHERN"}
          </button>
          {isEdit && (
            <button
              type="button"
              disabled={saving || deleting}
              onClick={() => setDeleteConfirmOpen(true)}
              aria-label="Übung löschen"
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                border: "1px solid " + M.line,
                background: "transparent",
                color: M.mut2,
                cursor: saving || deleting ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: saving || deleting ? 0.6 : 0.65,
                flexShrink: 0,
              }}
            >
              <Icon name="trash" size={18} stroke={2} color={M.mut2} />
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
    {deleteConfirmOpen && exercise && (
      <DeleteConfirmDialog
        title="Übung löschen?"
        message={
          <>
            Möchtest du <strong style={{ color: M.fg }}>{exercise.name}</strong> wirklich löschen?
          </>
        }
        busy={deleting}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    )}
    </>
  );
}
