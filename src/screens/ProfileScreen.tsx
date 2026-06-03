import { useEffect, useMemo, useState } from "react";
import { M } from "../theme";
import { useAuth } from "../lib/auth";
import { Icon } from "../components/Icon";
import { usePreferences } from "../lib/preferences";

export interface ProfileScreenProps {
  onBack: () => void;
}

type EditableField = "displayName" | "gender" | "birthDate" | "email";

const rowLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: M.mut,
  letterSpacing: 0.2,
};

const rowValueStyle: React.CSSProperties = {
  fontSize: 30,
  color: M.fg,
  fontFamily: M.disp,
  fontWeight: 700,
  lineHeight: 1.1,
  textAlign: "right",
};

const compactInputStyle: React.CSSProperties = {
  width: "100%",
  height: 38,
  borderRadius: 10,
  border: "1px solid " + M.line,
  background: M.panel,
  color: M.fg,
  fontFamily: M.body,
  fontSize: 14,
  padding: "0 10px",
  outline: "none",
  boxSizing: "border-box",
};

const smallOutlineBtn: React.CSSProperties = {
  height: 30,
  borderRadius: 9,
  border: "1px solid " + M.line,
  background: "transparent",
  color: M.fg,
  fontFamily: M.disp,
  fontSize: 13,
  letterSpacing: 0.6,
  fontWeight: 700,
  padding: "0 12px",
  cursor: "pointer",
};

function formatGender(value: "male" | "female" | "other" | null | undefined): string {
  if (value === "male") return "Männlich";
  if (value === "female") return "Weiblich";
  if (value === "other") return "Divers";
  return "—";
}

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatBirthDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "—";
  return `${day}.${month}.${year}`;
}

export function ProfileScreen({ onBack }: ProfileScreenProps) {
  const { user, profile, signOut, updateDisplayName, updateBirthDate, updateEmail, changePassword } = useAuth();
  const { preferences, updatePreferences } = usePreferences();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? "");
  const [gender, setGender] = useState<"male" | "female" | "other" | null>(preferences.gender);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busyName, setBusyName] = useState(false);
  const [busyBirthDate, setBusyBirthDate] = useState(false);
  const [busyEmail, setBusyEmail] = useState(false);
  const [busyPassword, setBusyPassword] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
  }, [profile?.display_name]);

  useEffect(() => {
    setEmail(user?.email ?? "");
  }, [user?.email]);

  useEffect(() => {
    setBirthDate(profile?.birth_date ?? "");
  }, [profile?.birth_date]);

  useEffect(() => {
    setGender(preferences.gender);
  }, [preferences.gender]);

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
    setEditingField(null);
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
    setEditingField(null);
    setInfo("Bestätigungs-Mail wurde an die neue Adresse gesendet.");
  };

  const submitBirthDate = async () => {
    clearFeedback();
    setBusyBirthDate(true);
    const normalized = birthDate.trim() ? birthDate.trim() : null;
    const { error: err } = await updateBirthDate(normalized);
    setBusyBirthDate(false);
    if (err) {
      setError(err);
      return;
    }
    setEditingField(null);
    setInfo("Geburtsdatum gespeichert.");
  };

  const submitGender = async () => {
    clearFeedback();
    updatePreferences({ gender }, true);
    setEditingField(null);
    setInfo("Geschlecht gespeichert.");
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
    setPasswordOpen(false);
  };

  const initial = (displayName || profile?.display_name || "A").charAt(0).toUpperCase();

  const profileRows = useMemo(
    () => [
      { key: "displayName", label: "Name", value: displayName || "—", editable: true },
      { key: "gender", label: "Geschlecht", value: formatGender(preferences.gender), editable: true },
      { key: "birthDate", label: "Geburtsdatum", value: formatBirthDate(profile?.birth_date), editable: true },
      { key: "email", label: "Email", value: user?.email ?? "—", editable: true, copyable: true },
      { key: "userId", label: "Nutzer-IDs", value: user?.id ?? "—", editable: false, copyable: true },
      {
        key: "role",
        label: "Rolle",
        value: typeof profile?.role === "string" ? capitalizeFirst(profile.role) : "User",
        editable: false,
      },
    ],
    [displayName, preferences.gender, profile?.birth_date, profile?.role, user?.email, user?.id],
  );

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setInfo(`${label} kopiert.`);
    } catch {
      setError(`${label} konnte nicht kopiert werden.`);
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
            INFORMATIONEN
          </div>
          <div
            style={{
              background: M.card,
              border: "1px solid " + M.line2,
              borderRadius: 16,
              padding: "6px 14px",
            }}
          >
            {profileRows.map((row, idx) => {
              const isEditing = editingField === row.key;
              const showDivider = idx < profileRows.length - 1;

              return (
                <div key={row.key}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minHeight: 58,
                      padding: "6px 0",
                    }}
                  >
                    <div style={{ flex: 1.05 }}>
                      <div style={rowLabelStyle}>{row.label}</div>
                    </div>
                    <div style={{ flex: 1.35, minWidth: 0 }}>
                      <div style={{ ...rowValueStyle, fontSize: row.key === "email" || row.key === "userId" ? 23 : 30, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.value}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      {row.copyable && typeof row.value === "string" && row.value !== "—" && (
                        <button
                          onClick={() => copyValue(row.value, row.label)}
                          style={{ background: "none", border: "none", color: M.mut2, cursor: "pointer", display: "flex" }}
                          aria-label={`${row.label} kopieren`}
                        >
                          <Icon name="copy" size={15} stroke={1.8} />
                        </button>
                      )}
                      {row.editable && (
                        <button
                          onClick={() => {
                            clearFeedback();
                            setEditingField(isEditing ? null : (row.key as EditableField));
                          }}
                          style={{ background: "none", border: "none", color: M.mut2, cursor: "pointer", display: "flex" }}
                          aria-label={`${row.label} bearbeiten`}
                        >
                          <Icon name="edit" size={15} stroke={2} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && row.key === "displayName" && (
                    <div style={{ padding: "0 0 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Anzeigename"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        autoComplete="name"
                        style={compactInputStyle}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button onClick={() => setEditingField(null)} style={smallOutlineBtn}>
                          ABBRECHEN
                        </button>
                        <button
                          disabled={busyName}
                          onClick={submitDisplayName}
                          style={{ ...smallOutlineBtn, border: "none", background: M.acc, color: M.accInk, cursor: busyName ? "wait" : "pointer" }}
                        >
                          SPEICHERN
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && row.key === "gender" && (
                    <div style={{ padding: "0 0 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <select
                        value={gender ?? ""}
                        onChange={(e) => setGender((e.target.value || null) as "male" | "female" | "other" | null)}
                        style={compactInputStyle}
                      >
                        <option value="">Bitte wählen</option>
                        <option value="male">Männlich</option>
                        <option value="female">Weiblich</option>
                        <option value="other">Divers</option>
                      </select>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button onClick={() => setEditingField(null)} style={smallOutlineBtn}>
                          ABBRECHEN
                        </button>
                        <button onClick={submitGender} style={{ ...smallOutlineBtn, border: "none", background: M.acc, color: M.accInk }}>
                          SPEICHERN
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && row.key === "email" && (
                    <div style={{ padding: "0 0 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <input
                        type="email"
                        placeholder="E-Mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        style={compactInputStyle}
                      />
                      <div style={{ fontSize: 12, color: M.mut, lineHeight: 1.45 }}>
                        Nach dem Speichern erhältst du eine Bestätigungs-Mail an die neue Adresse.
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button onClick={() => setEditingField(null)} style={smallOutlineBtn}>
                          ABBRECHEN
                        </button>
                        <button
                          disabled={busyEmail}
                          onClick={submitEmail}
                          style={{ ...smallOutlineBtn, border: "none", background: M.acc, color: M.accInk, cursor: busyEmail ? "wait" : "pointer" }}
                        >
                          SPEICHERN
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && row.key === "birthDate" && (
                    <div style={{ padding: "0 0 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        style={compactInputStyle}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button onClick={() => setEditingField(null)} style={smallOutlineBtn}>
                          ABBRECHEN
                        </button>
                        <button
                          disabled={busyBirthDate}
                          onClick={submitBirthDate}
                          style={{
                            ...smallOutlineBtn,
                            border: "none",
                            background: M.acc,
                            color: M.accInk,
                            cursor: busyBirthDate ? "wait" : "pointer",
                          }}
                        >
                          SPEICHERN
                        </button>
                      </div>
                    </div>
                  )}

                  {showDivider && <div style={{ height: 1, background: M.line2 }} />}
                </div>
              );
            })}

            <div style={{ height: 1, background: M.line2 }} />

            <button
              onClick={() => setPasswordOpen((v) => !v)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: M.fg,
                padding: "12px 0 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ ...rowLabelStyle, color: M.fg }}>Passwort ändern</span>
              <Icon name={passwordOpen ? "chevD" : "chevR"} size={16} stroke={2.2} color={M.mut} />
            </button>

            {passwordOpen && (
              <div style={{ padding: "0 0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="password"
                  placeholder="Aktuelles Passwort"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  style={compactInputStyle}
                />
                <input
                  type="password"
                  placeholder="Neues Passwort"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  style={compactInputStyle}
                />
                <input
                  type="password"
                  placeholder="Neues Passwort bestätigen"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  style={compactInputStyle}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    disabled={busyPassword}
                    onClick={submitPassword}
                    style={{ ...smallOutlineBtn, border: "none", background: M.acc, color: M.accInk, cursor: busyPassword ? "wait" : "pointer" }}
                  >
                    PASSWORT SPEICHERN
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1.5,
              color: M.mut,
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            AKTIONEN
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => setInfo("Kauf-Wiederherstellung folgt im nächsten Schritt.")}
              style={{
                ...smallOutlineBtn,
                width: "100%",
                height: 42,
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              Kauf wiederherstellen
              <Icon name="chevR" size={14} stroke={2.1} color={M.mut} />
            </button>
            <button
              onClick={() => void signOut()}
              style={{
                ...smallOutlineBtn,
                width: "100%",
                height: 42,
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              Abmelden
              <Icon name="chevR" size={14} stroke={2.1} color={M.mut} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
