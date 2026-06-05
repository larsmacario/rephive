import { useEffect, useMemo, useState } from "react";
import type { LibraryExercise } from "../data";
import { useAuth } from "../lib/auth";
import { metricShort } from "../lib/exerciseCatalog";
import { isAppOwner } from "../lib/roles";
import { M } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { CatalogStandardLock } from "./CatalogStandardLock";
import { ExerciseVideoSheet } from "./ExerciseVideoSheet";
import { Icon } from "./Icon";
import { MButton } from "./MButton";

export interface ExerciseDetailSheetProps {
  open: boolean;
  exercise: LibraryExercise | null;
  onClose: () => void;
  onEdit: (exercise: LibraryExercise) => void;
}

function canEditExercise(
  exercise: LibraryExercise,
  userId: string | undefined,
  owner: boolean,
): boolean {
  if (!userId) return false;
  if (exercise.userId === userId) return true;
  if (exercise.userId === null && owner) return true;
  return false;
}

export function ExerciseDetailSheet({ open, exercise, onClose, onEdit }: ExerciseDetailSheetProps) {
  const { user, profile } = useAuth();
  const [videoOpen, setVideoOpen] = useState(false);
  const owner = isAppOwner(profile);

  const canEdit = useMemo(
    () => (exercise ? canEditExercise(exercise, user?.id, owner) : false),
    [exercise, user?.id, owner],
  );

  useEffect(() => {
    if (!open) setVideoOpen(false);
  }, [open]);

  if (!exercise) return null;

  const isGlobal = exercise.userId === null;
  const steps = exercise.executionStepsDe ?? [];
  const description =
    exercise.descriptionDe?.trim() || "Keine Beschreibung hinterlegt.";

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        zIndex={22}
        aria-label={`Übung: ${exercise.name}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontFamily: M.disp,
                    fontWeight: 700,
                    fontSize: 24,
                    lineHeight: 1.15,
                    color: M.fg,
                  }}
                >
                  {exercise.name}
                </div>
                {isGlobal && <CatalogStandardLock />}
              </div>
              {exercise.nameEn && (
                <div style={{ fontSize: 13, color: M.mut2, marginTop: 4, fontWeight: 600 }}>
                  {exercise.nameEn}
                </div>
              )}
              <div style={{ fontSize: 12.5, color: M.mut, marginTop: 6, fontWeight: 600 }}>
                {exercise.group} · {exercise.equip} · {metricShort(exercise.metric)}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              style={{
                background: "none",
                border: "none",
                color: M.mut2,
                cursor: "pointer",
                padding: 4,
                display: "flex",
                flexShrink: 0,
              }}
            >
              <Icon name="x" size={22} stroke={2.2} />
            </button>
          </div>

          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 6 }}>
              BESCHREIBUNG
            </div>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: M.fg, whiteSpace: "pre-wrap" }}>
              {description}
            </p>
          </div>

          {steps.length > 0 && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 8 }}>
                AUSFÜHRUNG
              </div>
              <ol
                style={{
                  margin: 0,
                  paddingLeft: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: M.fg,
                }}
              >
                {steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {exercise.youtubeUrl && (
            <MButton type="button" variant="secondary" size="md" fullWidth onClick={() => setVideoOpen(true)}>
              Video ansehen
            </MButton>
          )}

          {canEdit && (
            <MButton
              type="button"
              variant="primary"
              size="md"
              fullWidth
              onClick={() => {
                onEdit(exercise);
                onClose();
              }}
            >
              Bearbeiten
            </MButton>
          )}
        </div>
      </BottomSheet>

      {exercise.youtubeUrl && (
        <ExerciseVideoSheet
          open={videoOpen}
          exerciseName={exercise.name}
          youtubeUrl={exercise.youtubeUrl}
          onClose={() => setVideoOpen(false)}
        />
      )}
    </>
  );
}
