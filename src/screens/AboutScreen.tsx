import { M } from "../theme";
import { Icon } from "../components/Icon";
import { MButton } from "../components/MButton";

export interface AboutScreenProps {
  onBack: () => void;
}

export function AboutScreen({ onBack }: AboutScreenProps) {
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
        <span style={{ fontSize: 12, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>UEBER MICH</span>
        <span style={{ width: 24 }} />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "8px 22px calc(32px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img
            src="/rehive_with_bee.svg"
            alt="rephive"
            style={{ width: 120, height: "auto", margin: "0 auto 16px", display: "block" }}
          />
          <p
            style={{
              margin: 0,
              fontFamily: M.disp,
              fontSize: 28,
              fontWeight: 800,
              lineHeight: 1.1,
              color: M.fg,
            }}
          >
            Keine Ausreden.
            <br />
            <span style={{ color: M.acc }}>Nur Ergebnisse.</span>
          </p>
        </div>

        <div
          style={{
            background: M.card,
            border: "1px solid " + M.line2,
            borderRadius: 16,
            padding: "14px 14px 18px",
            marginBottom: 14,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <img
              src="/lars_von_rephive.png"
              alt="Lars Macario"
              style={{
                display: "block",
                width: "min(200px, 58vw)",
                height: "auto",
                maxHeight: 248,
                objectFit: "contain",
                borderRadius: 12,
                border: "1px solid " + M.line2,
              }}
            />
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.6, color: M.mut }}>
            Ich bin <strong style={{ color: M.fg }}>Lars Macario</strong> — ich baue rephive, weil ich im Gym
            keine Lust auf Umwege habe: Planen, tracken, Timer, Fortschritt sehen. Alles an einem Ort.
          </p>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: M.mut }}>
            rephive ist im <strong style={{ color: M.fg }}>Early Access</strong>. Du nutzt eine App, die noch
            wächst — Feedback hilft mir, das Richtige als Nächstes zu bauen.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {[
            { icon: "dumbbell" as const, text: "Workouts planen und live tracken" },
            { icon: "timer" as const, text: "Interval-Timer ohne Extra-App" },
            { icon: "flame" as const, text: "Verlauf und Stats, die motivieren" },
          ].map((item) => (
            <div
              key={item.text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                borderRadius: 12,
                background: M.panel,
                border: "1px solid " + M.line2,
              }}
            >
              <Icon name={item.icon} size={20} stroke={2} color={M.acc} />
              <span style={{ fontSize: 14, fontWeight: 600, color: M.fg }}>{item.text}</span>
            </div>
          ))}
        </div>

        <p
          style={{
            marginTop: 22,
            textAlign: "center",
            fontSize: 12,
            color: M.mut2,
            letterSpacing: 0.5,
          }}
        >
          Version {__APP_VERSION__} · Made for the iron
        </p>
      </div>
    </div>
  );
}
