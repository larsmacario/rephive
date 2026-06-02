import { useEffect, useMemo, useState } from "react";
import { M } from "../theme";
import type { SessionExercise } from "../data";
import { sessionMetrics } from "../lib/engine";
import { updateSession, useExercises, useSession } from "../lib/db";
import { usePreferences } from "../lib/preferences";
import { Icon } from "../components/Icon";
import { MTag } from "../components/widgets";
import { SessionExerciseEditor } from "../components/SessionExerciseEditor";

export interface SessionEditScreenProps {
  sessionId: string;
  onBack: () => void;
  onSave: () => void;
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const fieldLabel: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.5,
  color: M.mut,
  fontWeight: 700,
  marginBottom: 8,
};

const fieldInput: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid " + M.line,
  background: M.card,
  color: M.fg,
  fontSize: 15,
  fontWeight: 600,
  outline: "none",
  boxSizing: "border-box",
};

export function SessionEditScreen({ sessionId, onBack, onSave }: SessionEditScreenProps) {
  const { data: session, loading, error } = useSession(sessionId);
  const { data: library, loading: libraryLoading, reload: reloadExercises } = useExercises();
  const { preferences } = usePreferences();
  const [name, setName] = useState("");
  const [performedAt, setPerformedAt] = useState("");
  const [dur, setDur] = useState("0");
  const [isPr, setIsPr] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const metrics = useMemo(() => sessionMetrics(exercises), [exercises]);

  useEffect(() => {
    if (!session || initialized) return;
    setName(session.name);
    setPerformedAt(toDatetimeLocal(session.performedAt));
    setDur(String(session.dur));
    setIsPr(session.pr);
    setTags([...session.tags]);
    setExercises(session.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })));
    setInitialized(true);
  }, [session, initialized]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleSave = async () => {
    if (!session) return;
    const durationMin = Math.max(1, Math.round(Number(dur) || 0));
    const trimmedName = name.trim() || session.name;

    setSaving(true);
    setSaveError(null);
    try {
      await updateSession(session.id, {
        name: trimmedName,
        tags,
        durationMin,
        volumeKg: metrics.volumeKg,
        setCount: metrics.setCount,
        isPr,
        performedAt: new Date(performedAt).toISOString(),
        exercises: exercises.map((e) => ({
          name: e.name,
          note: e.note,
          supersetId: e.supersetId,
          metric: e.metric,
          sets: e.sets,
        })),
      });
      onSave();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !initialized) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: M.mut, fontSize: 14 }}>
        Session wird geladen…
      </div>
    );
  }

  if (error || !session) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 22 }}>
        <div style={{ color: M.mut, fontSize: 14 }}>{error ?? "Session nicht gefunden."}</div>
        <button
          onClick={onBack}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: "none",
            background: M.acc,
            color: M.accInk,
            fontFamily: M.disp,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Zurück
        </button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "2px 22px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: M.mut, display: "flex" }}>
          <Icon name="chevL" size={24} stroke={2.2} />
        </button>
        <span style={{ fontSize: 12, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>SESSION BEARBEITEN</span>
        <button
          disabled={saving || exercises.length === 0}
          onClick={handleSave}
          style={{
            background: "none",
            border: "none",
            cursor: saving || exercises.length === 0 ? "not-allowed" : "pointer",
            fontFamily: M.disp,
            fontWeight: 700,
            color: M.acc,
            fontSize: 16,
            letterSpacing: 0.5,
            opacity: saving || exercises.length === 0 ? 0.5 : 1,
          }}
        >
          SAVE
        </button>
      </div>

      {saveError && <div style={{ padding: "0 22px 8px", color: "#ff8a8a", fontSize: 13 }}>{saveError}</div>}

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 22px 16px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={fieldLabel}>NAME</div>
          <input value={name} onChange={(e) => setName(e.target.value)} style={fieldInput} />
        </div>

        <div>
          <div style={fieldLabel}>DATUM & UHRZEIT</div>
          <input
            type="datetime-local"
            value={performedAt}
            onChange={(e) => setPerformedAt(e.target.value)}
            style={fieldInput}
          />
        </div>

        <div>
          <div style={fieldLabel}>DAUER (MIN)</div>
          <input type="number" min={1} value={dur} onChange={(e) => setDur(e.target.value)} style={fieldInput} />
        </div>

        <div>
          <div style={fieldLabel}>TAGS</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => removeTag(t)}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
              >
                <MTag>{t} ×</MTag>
              </button>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="Tag hinzufügen…"
              style={{ ...fieldInput, flex: "1 1 120px", minWidth: 100, padding: "8px 12px", fontSize: 13 }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsPr((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderRadius: 12,
            border: "1px solid " + (isPr ? M.acc : M.line),
            background: isPr ? M.accSoft : M.card,
            cursor: "pointer",
            color: M.fg,
          }}
        >
          <span style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 15 }}>Personal Record (PR)</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.6,
              color: isPr ? M.accInk : M.mut,
              background: isPr ? M.acc : M.line2,
              padding: "4px 10px",
              borderRadius: 6,
            }}
          >
            {isPr ? "AN" : "AUS"}
          </span>
        </button>

        <div>
          <div style={fieldLabel}>ÜBUNGEN & SÄTZE</div>
          <SessionExerciseEditor
            exercises={exercises}
            onChange={setExercises}
            library={library ?? []}
            libraryLoading={libraryLoading}
            onLibraryChange={() => reloadExercises()}
            defaultSets={preferences.defaultSets}
            defaultReps={preferences.defaultReps}
          />
        </div>
      </div>
    </div>
  );
}
