import { useEffect, useState } from "react";
import { M } from "../theme";
import { Icon } from "../components/Icon";
import { useAuth } from "../lib/auth";
import { submitSupportRequest, type SupportCategory } from "../lib/support";
import { MButton } from "../components/MButton";
import { SCROLL_BOTTOM_PADDING } from "../lib/responsive";

const CATEGORIES = [
  { id: "bug", label: "Bug" },
  { id: "question", label: "Frage" },
  { id: "feedback", label: "Feedback" },
  { id: "account", label: "Konto" },
  { id: "other", label: "Sonstiges" },
] as const;

type CategoryId = SupportCategory;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid " + M.line,
  background: M.card,
  color: M.fg,
  fontFamily: M.body,
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontSize: 13,
  letterSpacing: 1.2,
  color: M.mut,
  fontWeight: 700,
};

export interface SupportScreenProps {
  onBack: () => void;
}

export function SupportScreen({ onBack }: SupportScreenProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState<CategoryId>("question");
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedEmail.includes("@")) {
      setError("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }
    if (trimmedMessage.length < 10) {
      setError("Bitte beschreibe dein Anliegen etwas genauer (mindestens 10 Zeichen).");
      return;
    }
    if (!user?.id) {
      setError("Du musst angemeldet sein, um eine Anfrage zu senden.");
      return;
    }

    setSubmitting(true);
    try {
      await submitSupportRequest({
        userId: user.id,
        category,
        contactEmail: trimmedEmail,
        message: trimmedMessage,
      });
      setSent(true);
    } catch {
      setError("Die Anfrage konnte nicht gesendet werden. Bitte versuche es später erneut.");
    } finally {
      setSubmitting(false);
    }
  };

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
        <MButton type="button" onClick={onBack} variant="ghost" size="icon" aria-label="Zurück">
          <Icon name="chevL" size={20} stroke={2.2} color={M.mut} />
        </MButton>
        <span style={{ fontSize: 13, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>SUPPORT</span>
        <span style={{ width: 24 }} />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: `4px 22px ${SCROLL_BOTTOM_PADDING}px`,
        }}
      >
        {sent ? (
          <div
            style={{
              marginTop: 24,
              padding: "24px 20px",
              borderRadius: 16,
              background: M.card,
              border: "1px solid " + M.line2,
              textAlign: "center",
            }}
          >
            <Icon name="check" size={32} stroke={2.5} color={M.acc} />
            <p
              style={{
                margin: "16px 0 8px",
                fontFamily: M.disp,
                fontSize: 24,
                fontWeight: 700,
                color: M.fg,
              }}
            >
              Danke!
            </p>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: M.mut }}>
              Deine Anfrage ist bei uns eingegangen. Wir melden uns per E-Mail an{" "}
              {email.trim() || "deine Adresse"}.
            </p>
            <MButton type="button" onClick={onBack} variant="primary" size="md" fullWidth style={{ marginTop: 20 }}>
              Zurück
            </MButton>
          </div>
        ) : (
          <>
            <p style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.55, color: M.mut }}>
              Beschreib kurz dein Anliegen — wir melden uns per E-Mail.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 18 }}>
                <span style={labelStyle}>THEMA</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {CATEGORIES.map((c) => {
                    const active = category === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategory(c.id)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 999,
                          border: "1px solid " + (active ? M.acc : M.line2),
                          background: active ? "color-mix(in oklab, " + M.acc + " 18%, transparent)" : M.panel,
                          color: active ? M.acc : M.mut,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle} htmlFor="support-email">
                  DEINE E-MAIL
                </label>
                <input
                  id="support-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle} htmlFor="support-message">
                  NACHRICHT
                </label>
                <textarea
                  id="support-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={6}
                  placeholder="Was ist passiert? Was hast du erwartet?"
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: 140,
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {error ? (
                <p style={{ margin: "0 0 12px", fontSize: 14, color: "#f87171" }}>{error}</p>
              ) : null}

              <MButton type="submit" disabled={submitting} variant="primary" size="md" fullWidth loading={submitting}>
                {submitting ? "Wird gesendet …" : "Absenden"}
              </MButton>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
