import { useEffect, useState } from "react";
import { M } from "../../theme";
import { useAuth } from "../../lib/auth";
import { AppLogo } from "../../components/AppLogo";

type AuthStep = "login" | "signup" | "forgot" | "reset";

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

const btnPrimary: React.CSSProperties = {
  width: "100%",
  padding: "15px 0",
  borderRadius: 14,
  border: "none",
  background: M.acc,
  color: M.accInk,
  fontFamily: M.disp,
  fontWeight: 700,
  fontSize: 19,
  letterSpacing: 1,
  cursor: "pointer",
  marginTop: 8,
};

const linkBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: M.acc,
  fontFamily: M.body,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
};

export function AuthFlow() {
  const auth = useAuth();
  const [step, setStep] = useState<AuthStep>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setError(null);
    setInfo(null);
  }, [step]);

  const submitLogin = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await auth.signIn(email.trim(), password);
    setBusy(false);
    if (err) setError(err);
  };

  const submitSignup = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await auth.signUp(email.trim(), password, displayName.trim() || undefined);
    setBusy(false);
    if (err) setError(err);
  };

  const submitForgot = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await auth.requestPasswordReset(email.trim());
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setInfo("Code wurde an deine E-Mail gesendet.");
    setStep("reset");
  };

  const submitReset = async () => {
    setBusy(true);
    setError(null);
    const { error: verifyErr } = await auth.verifyResetToken(email.trim(), token.trim());
    if (verifyErr) {
      setBusy(false);
      setError(verifyErr);
      return;
    }
    const { error: pwErr } = await auth.updatePassword(newPassword);
    setBusy(false);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    setInfo("Passwort aktualisiert. Du bist eingeloggt.");
    setStep("login");
    setToken("");
    setNewPassword("");
  };

  const titles: Record<AuthStep, string> = {
    login: "Anmelden",
    signup: "Registrieren",
    forgot: "Passwort vergessen",
    reset: "Neues Passwort",
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: M.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 22px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <AppLogo size={52} />
        </div>

        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 26, marginBottom: 18 }}>{titles[step]}</div>

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

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(step === "login" || step === "signup" || step === "forgot" || step === "reset") && (
            <input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={inputStyle}
            />
          )}

          {step === "signup" && (
            <input
              type="text"
              placeholder="Anzeigename (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              style={inputStyle}
            />
          )}

          {(step === "login" || step === "signup") && (
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={step === "signup" ? "new-password" : "current-password"}
              style={inputStyle}
            />
          )}

          {step === "reset" && (
            <>
              <input
                type="text"
                placeholder="6-stelliger Code aus der E-Mail"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
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
            </>
          )}
        </div>

        {step === "login" && (
          <>
            <button disabled={busy} onClick={submitLogin} style={{ ...btnPrimary, opacity: busy ? 0.7 : 1 }}>
              ANMELDEN
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
              <button type="button" style={linkBtn} onClick={() => setStep("forgot")}>
                Passwort vergessen?
              </button>
              <button type="button" style={linkBtn} onClick={() => setStep("signup")}>
                Konto erstellen
              </button>
            </div>
          </>
        )}

        {step === "signup" && (
          <>
            <button disabled={busy} onClick={submitSignup} style={{ ...btnPrimary, opacity: busy ? 0.7 : 1 }}>
              REGISTRIEREN
            </button>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button type="button" style={linkBtn} onClick={() => setStep("login")}>
                Bereits ein Konto? Anmelden
              </button>
            </div>
          </>
        )}

        {step === "forgot" && (
          <>
            <button disabled={busy} onClick={submitForgot} style={{ ...btnPrimary, opacity: busy ? 0.7 : 1 }}>
              CODE SENDEN
            </button>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button type="button" style={linkBtn} onClick={() => setStep("login")}>
                Zurück zur Anmeldung
              </button>
            </div>
          </>
        )}

        {step === "reset" && (
          <>
            <button disabled={busy} onClick={submitReset} style={{ ...btnPrimary, opacity: busy ? 0.7 : 1 }}>
              PASSWORT SPEICHERN
            </button>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button type="button" style={linkBtn} onClick={() => setStep("login")}>
                Zurück zur Anmeldung
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
