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
import { isAppOwner } from "../lib/roles";
import { M } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { EquipmentSelect } from "./EquipmentSelect";
import { MuscleGroupSelect, initialMuscleGroupFromStored } from "./MuscleGroupSelect";
import { MetricCategorySheet } from "./MetricCategorySheet";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { isValidYouTubeUrl, normalizeYouTubeUrl } from "../lib/youtube";
import { Icon } from "./Icon";
import { MButton } from "./MButton";

export interface ExerciseFormSheetProps {
  open: boolean;
  exercise?: LibraryExercise | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ExerciseFormSheet({ open, exercise, onClose, onSaved }: ExerciseFormSheetProps) {
  const { user, profile } = useAuth();
  const owner = isAppOwner(profile);
  const isGlobalEdit = Boolean(exercise && exercise.userId === null && owner);
  const isOwnedEdit = Boolean(exercise?.userId);
  const isEdit = isOwnedEdit || isGlobalEdit;
  const canDelete = isOwnedEdit;
  const [name, setName] = useState("");
  const [descriptionDe, setDescriptionDe] = useState("");
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
      setDescriptionDe(exercise.descriptionDe ?? "");
      const mg = initialMuscleGroupFromStored(exercise.group);
      setMuscleGroup(mg.value);
      setMuscleGroupRaw(mg.rawValue);
      setEquipment(exercise.equip);
      setMetric(exercise.metric);
      setYoutubeUrl(exercise.youtubeUrl ?? "");
    } else {
      setName("");
      setDescriptionDe("");
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
    if (!user || !exercise?.id || !exercise.userId || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteExercise(user.id, exercise.id);
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
      descriptionDe: descriptionDe.trim() || null,
    };
    setSaving(true);
    setError(null);
    try {
      if (isEdit && exercise) {
        await updateExercise(user.id, exercise.id, input);
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

        <label style={{ display: "block", marginBottom: 14, flexShrink: 0 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 6 }}>
            BESCHREIBUNG (DE)
          </div>
          <textarea
            value={descriptionDe}
            onChange={(e) => setDescriptionDe(e.target.value)}
            placeholder="Kurze Beschreibung der Übung…"
            rows={3}
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
              resize: "vertical",
              minHeight: 72,
              fontFamily: "inherit",
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
          <MButton
            type="button"
            onClick={() => setMetricSheetOpen(true)}
            variant="secondary"
            size="md"
            fullWidth
            style={{
              justifyContent: "space-between",
              padding: "0 14px",
              background: M.card,
              textAlign: "left",
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {metricLabel(metric)}
            </span>
            <Icon name="chevR" size={18} color={M.mut2} stroke={2.2} />
          </MButton>
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
          <MButton
            type="button"
            disabled={saving || deleting}
            onClick={handleSave}
            variant="primary"
            size="md"
            style={{ flex: 1 }}
          >
            {saving ? "Speichern…" : "SPEICHERN"}
          </MButton>
          {canDelete && (
            <MButton
              type="button"
              disabled={saving || deleting}
              onClick={() => setDeleteConfirmOpen(true)}
              aria-label="Übung löschen"
              variant="secondary"
              size="icon"
              style={{ flexShrink: 0, width: 40, height: 40 }}
            >
              <Icon name="trash" size={18} stroke={2} color={M.mut2} />
            </MButton>
          )}
        </div>
      </div>
    </BottomSheet>
    <DeleteConfirmDialog
      open={deleteConfirmOpen && !!exercise}
      title="Übung löschen?"
      message={
        exercise ? (
          <>
            Möchtest du <strong style={{ color: M.fg }}>{exercise.name}</strong> wirklich löschen?
          </>
        ) : null
      }
      busy={deleting}
      onCancel={() => setDeleteConfirmOpen(false)}
      onConfirm={handleDelete}
    />
    </>
  );
}
