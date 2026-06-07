import { M } from "../theme";
import { Icon } from "../components/Icon";
import { MButton } from "../components/MButton";
import {
  BLOCK_ACCENT,
  BLOCK_GUIDE_HINTS,
  BLOCK_LABELS,
  BLOCK_ORDER,
  type TrainingBlockType,
} from "../lib/planBlocks";

export interface AboutScreenProps {
  onBack: () => void;
}

const BLOCK_ABOUT: Record<
  TrainingBlockType,
  { what: string; why: string; efficient: string }
> = {
  warmup: {
    what: "Leichtes Cardio — Rudergerät, Laufband, Fahrrad oder Seilspringen. Du steigerst Puls und Körpertemperatur langsam, ohne dich vor dem eigentlichen Training zu erschöpfen.",
    why: "Ein gutes Warm-up bereitet Gelenke, Sehnen und das Nervensystem auf Belastung vor. Du bewegst dich sicherer, die Technik sitzt schneller — und das Verletzungsrisiko sinkt spürbar, besonders bei schweren Hauptübungen.",
    efficient:
      "Plane 5–8 Minuten (10–12 Min ab 50+). Intensität: du kannst noch locker sprechen. Im Track einfach abhaken — nicht überspringen, auch wenn du „schon warm“ bist.",
  },
  skill: {
    what: "Gezieltes Üben von Bewegungsmustern aus dem Kraft-Block — z. B. Kniebeuge-Tiefe, Hinge-Technik oder Schulterposition beim Drücken. Leichte Last oder nur Körpergewicht, Fokus auf saubere Wiederholungen.",
    why: "Schwere Sätze verzeihen schlechte Technik nicht. Der Skill-Block schafft Muskelgedächtnis und Stabilität, bevor es ernst wird — so überträgst du mehr Kraft und trainierst langfristig gesünder.",
    efficient:
      "Kein Ego-Lifting: lieber leichter und langsam als schnell und unsauber. 2–3 Übungen reichen. Wenn die Zeit knapp ist, Skill nicht streichen — lieber eine Übung weniger im Kraft-Block.",
  },
  strength: {
    what: "Hauptübungen (Squat, Bankdrücken, Kreuzheben o. Ä.) plus Assistance-Arbeit für Schwachstellen. Hier zählst du Sätze, Wiederholungen und Gewicht — der Kern deines Trainings für Kraft und Muskelaufbau.",
    why: "Progressive Überladung passiert hier: mehr Gewicht, mehr Wiederholungen oder mehr Qualität über die Wochen. Das ist der Baustein, der deinen Körper wirklich verändert — alles andere unterstützt ihn.",
    efficient:
      "Auto-Pilot schlägt Sätze aus deiner letzten Session vor — ein Tap zum Bestätigen. Fokus auf Hauptlifts, Assistance nur wo nötig. Pausen-Timer startet automatisch nach jedem Satz.",
  },
  metcon: {
    what: "Kondition zum Abschluss — typisch als AMRAP (so viele Runden wie möglich), EMOM (jede Minute eine Aufgabe) oder Circuit. Kurz, intensiv, oft mit Körpergewicht oder leichten Gewichten.",
    why: "MetCon verbessert Ausdauer, Work Capacity und Fettstoffwechsel — ohne dein Krafttraining zu ersetzen. Je nach Ziel dosiert: ergänzend bei Muskelaufbau, etwas kräftiger bei Fettabbau.",
    efficient:
      "Bei wenig Zeit oder reinem Kraft-Fokus: weglassen oder im Tracking überspringen. Im manuellen Plan-Builder ist MetCon opt-in. Bei Reha oder Schmerzen lieber ganz weg — Kraft und Skill reichen.",
  },
};

const EFFICIENCY_TIPS = [
  {
    title: "Reihenfolge einhalten",
    text: "Warm-up → Skill → Kraft → MetCon — so ist jede Einheit komplett und vorhersehbar.",
  },
  {
    title: "Bausteine flexibel",
    text: "Im Tracking einzelne Bausteine überspringen, wenn die Zeit knapp ist.",
  },
  {
    title: "MetCon nach Bedarf",
    text: "Standard in KI-Plänen; im manuellen Builder ohne MetCon starten und bei Bedarf hinzufügen.",
  },
];

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
        <span style={{ fontSize: 12, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>UEBER REPHIVE</span>
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
            padding: "14px 16px 18px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1.4,
              color: M.mut,
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            WARUM REPHIVE?
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.6, color: M.mut }}>
            Training soll wirken, nicht Zeit fressen. rephive bündelt Plan, Live-Tracking, Timer und Fortschritt
            an einem Ort — ohne jedes Mal neu zu planen. Mit{" "}
            <strong style={{ color: M.fg }}>TurboTracking</strong> startest du über den Plus-Button in Sekunden:
            letztes Workout wiederholen oder Übungen aus der Bibliothek — auch ohne festen Plan.
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.6, color: M.mut }}>
            Jede Einheit folgt derselben Struktur aus vier Bausteinen. Der{" "}
            <strong style={{ color: M.fg }}>Auto-Pilot</strong> übernimmt die Progression im Kraft-Block — du
            bestätigst nur.
          </p>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: M.mut }}>
            rephive ist im <strong style={{ color: M.fg }}>Early Access</strong> und wächst noch. Feedback hilft,
            das Richtige als Nächstes zu bauen.
          </p>
        </div>

        <div
          style={{
            fontSize: 11,
            letterSpacing: 1.4,
            color: M.mut,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          DIE 4 BAUSTEINE
        </div>

        <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
          {BLOCK_ORDER.map((block, index) => {
            const accent = BLOCK_ACCENT[block];
            const about = BLOCK_ABOUT[block];
            return (
              <div
                key={block}
                style={{
                  background: M.card,
                  border: "1px solid " + M.line2,
                  borderRadius: 14,
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      flex: "0 0 auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: M.brandSoft,
                      color: M.brand,
                      fontFamily: M.disp,
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                    aria-hidden
                  >
                    {index + 1}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: accent,
                      }}
                    >
                      {BLOCK_LABELS[block]}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: M.mut2,
                        marginTop: 3,
                        lineHeight: 1.4,
                      }}
                    >
                      {BLOCK_GUIDE_HINTS[block]}
                    </div>
                    <p style={{ margin: "10px 0 8px", fontSize: 14, lineHeight: 1.55, color: M.mut }}>
                      <strong style={{ color: M.fg, fontWeight: 600 }}>Was:</strong> {about.what}
                    </p>
                    <p style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.55, color: M.mut }}>
                      <strong style={{ color: M.fg, fontWeight: 600 }}>Warum:</strong> {about.why}
                    </p>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: M.mut2 }}>
                      <strong style={{ color: M.fg, fontWeight: 600 }}>Effizient:</strong> {about.efficient}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontSize: 11,
            letterSpacing: 1.4,
            color: M.mut,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          EFFIZIENT NUTZEN
        </div>

        <div style={{ display: "grid", gap: 10, marginBottom: 22 }}>
          {EFFICIENCY_TIPS.map((tip) => (
            <div
              key={tip.title}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                background: M.panel,
                border: "1px solid " + M.line2,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: M.fg, marginBottom: 4 }}>{tip.title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.45, color: M.mut }}>{tip.text}</div>
            </div>
          ))}
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: M.mut2,
            letterSpacing: 0.5,
            margin: 0,
          }}
        >
          Version {__APP_VERSION__} · Made for the iron
        </p>
        <p
          style={{
            marginTop: 8,
            textAlign: "center",
            fontSize: 12,
            color: M.mut2,
          }}
        >
          Entwickelt von Lars Macario
        </p>
      </div>
    </div>
  );
}
