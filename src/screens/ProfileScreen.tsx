import { useEffect, useState } from "react";
import { M } from "../theme";
import { useAuth } from "../lib/auth";
import { Icon } from "../components/Icon";

export interface ProfileScreenProps {
  onBack: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid " + M.line,
  background: M.panel,
  color: M.fg,
  fontFamily: M.body,
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  width: "100%",
  padding: "13px 0",
  borderRadius: 12,
  border: "none",
  background: M.acc,
  color: M.accInk,
  fontFamily: M.disp,
  fontWeight: 700,
  fontSize: 16,
  letterSpacing: 0.8,
  cursor: "pointer",
  marginTop: 12,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1.5,
          color: M.mut,
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div
        style={{
          background: M.card,
          border: "1px solid " + M.line2,
          borderRadius: 16,
          padding: "16px 16px 14px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ProfileScreen({ onBack }: ProfileScreenProps) {
  const { user, profile, updateDisplayName, updateEmail, changePassword } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busyName, setBusyName] = useState(false);
  const [busyEmail, setBusyEmail] = useState(false);
  const [busyPassword, setBusyPassword] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
  }, [profile?.display_name]);

  useEffect(() => {
    setEmail(user?.email ?? "");
  }, [user?.email]);

  const clearFeedback = () => {
    setError(null);
    setInfo(null);
  };

  const submitDisplayName = async () => {
    clearFeedback();
    setBusyName(true);
    const { error: err } = await updateDisplayName(displayName);
    setBusyName(false);
    if (err) {
      setError(err);
      return;
    }
    setInfo("Anzeigename gespeichert.");
  };

  const submitEmail = async () => {
    clearFeedback();
    setBusyEmail(true);
    const { error: err } = await updateEmail(email);
    setBusyEmail(false);
    if (err) {
      setError(err);
      return;
    }
    setInfo("Bestätigungs-Mail wurde an die neue Adresse gesendet.");
  };

  const submitPassword = async () => {
    clearFeedback();
    if (newPassword !== confirmPassword) {
      setError("Neues Passwort und Bestätigung stimmen nicht überein.");
      return;
    }
    setBusyPassword(true);
    const { error: err } = await changePassword(currentPassword, newPassword);
    setBusyPassword(false);
    if (err) {
      setError(err);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setInfo("Passwort wurde aktualisiert.");
  };

  const initial = (displayName || profile?.display_name || "A").charAt(0).toUpperCase();

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
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: M.mut, display: "flex" }}
        >
          <Icon name="chevL" size={24} stroke={2.2} />
        </button>
        <span style={{ fontSize: 12, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>PROFIL</span>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            background: M.accSoft,
            border: "1px solid " + M.line,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: M.disp,
            fontWeight: 700,
            color: M.acc,
            fontSize: 15,
          }}
        >
          {initial}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 22px 24px" }}>
        {error && (
          <div
            style={{
              background: "rgba(255,80,80,.12)",
              border: "1px solid rgba(255,80,80,.25)",
              borderRadius: 12,
              padding: "12px 14px",
              color: "#ff8a8a",
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}
        {info && (
          <div
            style={{
              background: M.accSoft,
              border: "1px solid " + M.line,
              borderRadius: 12,
              padding: "12px 14px",
              color: M.acc,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {info}
          </div>
        )}

        <Section title="ANZEIGENAME">
          <input
            type="text"
            placeholder="Anzeigename"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            style={inputStyle}
          />
          <button
            disabled={busyName}
            onClick={submitDisplayName}
            style={{ ...btnPrimary, opacity: busyName ? 0.7 : 1, cursor: busyName ? "wait" : "pointer" }}
          >
            SPEICHERN
          </button>
        </Section>

        <Section title="E-MAIL">
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            style={inputStyle}
          />
          <div style={{ fontSize: 12, color: M.mut, marginTop: 10, lineHeight: 1.45 }}>
            Nach dem Speichern erhältst du eine Bestätigungs-Mail an die neue Adresse.
          </div>
          <button
            disabled={busyEmail}
            onClick={submitEmail}
            style={{ ...btnPrimary, opacity: busyEmail ? 0.7 : 1, cursor: busyEmail ? "wait" : "pointer" }}
          >
            E-MAIL ÄNDERN
          </button>
        </Section>

        <Section title="PASSWORT">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="password"
              placeholder="Aktuelles Passwort"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Neues Passwort"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Neues Passwort bestätigen"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              style={inputStyle}
            />
          </div>
          <button
            disabled={busyPassword}
            onClick={submitPassword}
            style={{ ...btnPrimary, opacity: busyPassword ? 0.7 : 1, cursor: busyPassword ? "wait" : "pointer" }}
          >
            PASSWORT SPEICHERN
          </button>
        </Section>
      </div>
    </div>
  );
}
