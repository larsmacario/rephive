import { useEffect, useState } from "react";
import { M } from "../theme";
import { fetchNotesForTarget, type CoachingNote } from "../lib/coaching";
import type { Enums } from "../lib/database.types";

export interface CoachingNotesSectionProps {
  targetType: Enums<"coaching_note_target">;
  targetId: string;
  refreshKey?: number;
}

export function CoachingNotesSection({ targetType, targetId, refreshKey = 0 }: CoachingNotesSectionProps) {
  const [notes, setNotes] = useState<CoachingNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const list = await fetchNotesForTarget(targetType, targetId);
        if (!cancelled) setNotes(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetType, targetId, refreshKey]);

  if (loading || notes.length === 0) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 10 }}>
        COACH-FEEDBACK
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {notes.map((note) => (
          <div
            key={note.id}
            style={{
              background: M.accSoft,
              border: "1px solid " + M.line,
              borderRadius: 14,
              padding: "12px 14px",
            }}
          >
            <div style={{ fontSize: 14, color: M.fg, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{note.body}</div>
            <div style={{ fontSize: 10, color: M.mut, marginTop: 6 }}>
              {new Date(note.created_at).toLocaleString("de-DE")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
