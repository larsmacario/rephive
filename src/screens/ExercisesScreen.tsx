import { useEffect, useMemo, useState } from "react";
import type { LibraryExercise } from "../data";
import { deleteExercise, useExercises } from "../lib/db";
import { normalizeMuscleGroup, metricShort } from "../lib/exerciseCatalog";
import { MuscleGroupSelect } from "../components/MuscleGroupSelect";
import { M } from "../theme";
import { CatalogStandardLock } from "../components/CatalogStandardLock";
import { Icon } from "../components/Icon";
import { AlertSheet } from "../components/AlertSheet";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { ExerciseFormSheet } from "../components/ExerciseFormSheet";
import { FLOAT_NAV_SCROLL_BOTTOM_GAP } from "../components/FloatNav";
import { MButton } from "../components/MButton";

export interface ExercisesScreenProps {
  refreshKey?: number;
}

export function ExercisesScreen({ refreshKey = 0 }: ExercisesScreenProps) {
  const { data: exercises, loading, error, reload } = useExercises();
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryExercise | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LibraryExercise | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [alertSheet, setAlertSheet] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    reload();
  }, [refreshKey, reload]);

  const list = exercises ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((ex) => {
      if (groupFilter && normalizeMuscleGroup(ex.group) !== groupFilter) return false;
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [list, query, groupFilter]);

  const ownedCount = list.filter((e) => e.userId !== null).length;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (ex: LibraryExercise) => {
    if (!ex.userId) return;
    setEditing(ex);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.userId || deleteBusy) return;
    const ex = deleteTarget;
    setDeleteBusy(true);
    try {
      await deleteExercise(ex.id);
      setDeleteTarget(null);
      reload();
    } catch (e) {
      setAlertSheet({
        title: "Löschen fehlgeschlagen",
        message: e instanceof Error ? e.message : "Löschen fehlgeschlagen.",
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
      <div
        style={{
          padding: "4px 22px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 30, lineHeight: 1 }}>Übungen</div>
          <div style={{ fontSize: 12.5, color: M.mut, marginTop: 3, fontWeight: 600 }}>
            {loading ? "…" : `${list.length} Übungen · ${ownedCount} eigene`}
          </div>
        </div>
        <MButton onClick={openCreate} variant="primary" size="icon" aria-label="Übung erstellen">
          <Icon name="plus" size={18} stroke={2.6} color={M.accInk} />
        </MButton>
      </div>

      <div style={{ padding: "0 22px 10px" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen…"
          style={{
            width: "100%",
            padding: "11px 14px",
            borderRadius: 12,
            border: "1px solid " + M.line,
            background: M.card,
            color: M.fg,
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div style={{ marginTop: 10 }}>
          <MuscleGroupSelect mode="filter" value={groupFilter} onChange={setGroupFilter} />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: `0 22px ${FLOAT_NAV_SCROLL_BOTTOM_GAP}px`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {loading && <div style={{ color: M.mut, fontSize: 14 }}>Übungen werden geladen…</div>}
        {error && <div style={{ color: "#ff8a8a", fontSize: 14 }}>{error}</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ color: M.mut, fontSize: 14, textAlign: "center", marginTop: 24 }}>
            Keine Übungen gefunden.
          </div>
        )}
        {filtered.map((ex) => {
          const isOwned = ex.userId !== null;
          return (
            <div
              key={ex.id}
              style={{
                background: M.card,
                border: "1px solid " + M.line2,
                borderRadius: 14,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => openEdit(ex)}
                disabled={!isOwned}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "none",
                  border: "none",
                  cursor: isOwned ? "pointer" : "default",
                  textAlign: "left",
                  padding: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: M.disp,
                      fontWeight: 700,
                      fontSize: 18,
                      lineHeight: 1.1,
                      color: M.fg,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ex.name}
                  </span>
                  {!isOwned && <CatalogStandardLock />}
                </div>
                <div style={{ fontSize: 12.5, color: M.mut, marginTop: 4, fontWeight: 600 }}>
                  {ex.group} · {ex.equip} · {metricShort(ex.metric)}
                </div>
              </button>
              {isOwned && (
                <MButton
                  type="button"
                  onClick={() => setDeleteTarget(ex)}
                  variant="ghost"
                  size="icon"
                  aria-label="Löschen"
                  style={{ color: M.mut2 }}
                >
                  <Icon name="trash" size={16} stroke={2} />
                </MButton>
              )}
            </div>
          );
        })}
      </div>

      <ExerciseFormSheet
        open={formOpen}
        exercise={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => reload()}
      />

      {alertSheet && (
        <AlertSheet
          title={alertSheet.title}
          message={alertSheet.message}
          onClose={() => setAlertSheet(null)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmDialog
          title="Übung löschen?"
          message={
            <>
              Möchtest du <strong style={{ color: M.fg }}>{deleteTarget.name}</strong> wirklich löschen?
            </>
          }
          busy={deleteBusy}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
