import { useEffect, useRef, useState } from "react";
import { M } from "../theme";
import { MButton } from "./MButton";
import {
  fetchMessages,
  markMessagesRead,
  sendMessage,
  subscribeToMessages,
  type CoachingMessage,
} from "../lib/coaching";
import { useAuth } from "../lib/auth";

export interface CoachingChatProps {
  relationshipId: string;
  refreshKey?: number;
}

export function CoachingChat({ relationshipId, refreshKey = 0 }: CoachingChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CoachingMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchMessages(relationshipId);
        if (!cancelled) setMessages(list);
        if (user) await markMessagesRead(relationshipId, user.id);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Chat konnte nicht geladen werden.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [relationshipId, refreshKey, user?.id]);

  useEffect(() => {
    return subscribeToMessages(relationshipId, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (user && msg.sender_id !== user.id) {
        void markMessagesRead(relationshipId, user.id);
      }
    });
  }, [relationshipId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!user || !draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const msg = await sendMessage(relationshipId, user.id, draft);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Senden fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 280, flex: 1 }}>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "8px 0",
          maxHeight: 360,
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: M.mut, fontSize: 13, textAlign: "center", padding: 24 }}>
            Noch keine Nachrichten. Schreib die erste!
          </div>
        )}
        {messages.map((msg) => {
          const mine = msg.sender_id === user?.id;
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: mine ? M.accSoft : M.card,
                border: "1px solid " + M.line2,
                borderRadius: 14,
                padding: "10px 12px",
              }}
            >
              <div style={{ fontSize: 14, color: M.fg, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                {msg.body}
              </div>
              <div style={{ fontSize: 10, color: M.mut, marginTop: 4 }}>
                {new Date(msg.created_at).toLocaleString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {error && <div style={{ color: "#ff8a8a", fontSize: 12, marginBottom: 8 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nachricht schreiben…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid " + M.line,
            background: M.card,
            color: M.fg,
            fontFamily: M.body,
            fontSize: 14,
          }}
        />
        <MButton disabled={busy || !draft.trim()} onClick={() => void handleSend()} variant="primary" size="md">
          Senden
        </MButton>
      </div>
    </div>
  );
}
