import { useState } from "react";
import { M } from "../theme";
import { fmt, TIMER_DEFAULTS, TIMER_MODES, type TimerMode } from "../lib/engine";
import { createAiConsentGrant, hasAiConsent, usePreferences } from "../lib/preferences";
import { TimerSoundPackPicker } from "../components/TimerSoundPackPicker";
import { Icon } from "../components/Icon";
import { TimerConfigPanel } from "../components/TimerConfigPanel";
import { MStepper, MSwitch } from "../components/widgets";
import { MButton } from "../components/MButton";
import { SCROLL_BOTTOM_PADDING } from "../lib/responsive";
import { BottomSheet } from "../components/BottomSheet";
import { AiConsentStep } from "../components/AiConsentStep";
import { OwnerLabsSection } from "../components/settings/OwnerLabsSection";
import { useAuth } from "../lib/auth";
import { isOwnerLabsVisible } from "../lib/ownerLabs";

export interface SettingsScreenProps {
  onBack: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 13,
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

function SettingRow({
  label,
  hint,
  children,
  last,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 0",
        borderBottom: last ? "none" : "1px solid " + M.line2,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>{label}</div>
        {hint && <div style={{ color: M.mut, fontSize: 13, marginTop: 3 }}>{hint}</div>}
      </div>
      <div style={{ flex: "0 0 auto" }}>{children}</div>
    </div>
  );
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { profile } = useAuth();
  const showOwnerLabs = isOwnerLabsVisible(profile);
  const { preferences, updatePreferences, saving } = usePreferences();
  const [timerMode, setTimerMode] = useState<TimerMode>("emom");
  const [aiConsentSheetOpen, setAiConsentSheetOpen] = useState(false);

  const legalBaseUrl = (import.meta.env.VITE_LEGAL_BASE_URL ?? "https://rephive.app").replace(/\/$/, "");
  const openDatenschutz = () => {
    window.open(`${legalBaseUrl}/datenschutz`, "_blank", "noopener,noreferrer");
  };

  const aiConsentGranted = hasAiConsent(preferences);

  const handleAiConsentToggle = (enabled: boolean) => {
    if (!enabled) {
      updatePreferences({ aiConsent: null }, true);
      return;
    }
    setAiConsentSheetOpen(true);
  };

  const handleGrantAiConsent = async () => {
    try {
      await updatePreferences({ aiConsent: createAiConsentGrant() }, true);
      setAiConsentSheetOpen(false);
    } catch {
      // saving state resets via preferences provider
    }
  };

  const timerCfg = preferences.timerDefaults[timerMode];
  const setTimerCfg = (p: Partial<typeof timerCfg>) => {
    updatePreferences({
      timerDefaults: {
        [timerMode]: { ...preferences.timerDefaults[timerMode], ...p },
      },
    });
  };

  const resetTimerDefaults = () => {
    updatePreferences({ timerDefaults: JSON.parse(JSON.stringify(TIMER_DEFAULTS)) }, true);
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
        <MButton onClick={onBack} variant="ghost" size="icon" aria-label="Zurück">
          <Icon name="chevL" size={20} stroke={2.2} color={M.mut} />
        </MButton>
        <span style={{ fontSize: 13, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>EINSTELLUNGEN</span>
        <span style={{ width: 24, fontSize: 13, color: saving ? M.acc : "transparent", fontWeight: 700 }}>
          {saving ? "…" : ""}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: `0 22px ${SCROLL_BOTTOM_PADDING}px` }}>
        <Section title="TRAINING">
          <SettingRow label="Pausenzeit" hint="Pause nach abgehaktem Satz">
            <MStepper
              value={preferences.restSeconds}
              min={30}
              max={180}
              step={15}
              fmt={fmt}
              onChange={(v) => updatePreferences({ restSeconds: v })}
            />
          </SettingRow>
          <SettingRow label="Auto-Pause" hint="Pause automatisch nach Satz starten">
            <MSwitch
              checked={preferences.autoRest}
              onChange={(v) => updatePreferences({ autoRest: v }, true)}
            />
          </SettingRow>
          <SettingRow label="Gewichtssprung Oberkörper" hint="Inkrement bei Double Progression (z. B. Brust, Rücken)">
            <MStepper
              value={preferences.weightIncrementUpperKg}
              min={1}
              max={10}
              step={0.5}
              fmt={(v) => `${v} kg`}
              onChange={(v) => updatePreferences({ weightIncrementUpperKg: v }, true)}
            />
          </SettingRow>
          <SettingRow label="Gewichtssprung Unterkörper" hint="Inkrement bei Bein- und Hüftübungen" last>
            <MStepper
              value={preferences.weightIncrementLowerKg}
              min={2.5}
              max={10}
              step={0.5}
              fmt={(v) => `${v} kg`}
              onChange={(v) => updatePreferences({ weightIncrementLowerKg: v }, true)}
            />
          </SettingRow>
        </Section>

        <Section title="WORKOUT-BUILDER">
          <SettingRow label="Standard-Sätze">
            <MStepper
              value={preferences.defaultSets}
              min={1}
              max={10}
              onChange={(v) => updatePreferences({ defaultSets: v })}
            />
          </SettingRow>
          <SettingRow label="Standard-Wiederholungen" last>
            <MStepper
              value={preferences.defaultReps}
              min={1}
              max={30}
              onChange={(v) => updatePreferences({ defaultReps: v })}
            />
          </SettingRow>
        </Section>

        <Section title="DATEN & KI">
          <SettingRow
            label="KI-Datennutzung für Trainingspläne"
            hint="Einwilligung zur Übermittlung deiner Trainingsdaten an Anthropic für KI-Pläne. Widerruf stoppt neue Generierungen; bestehende Pläne bleiben erhalten."
            last
          >
            <MSwitch checked={aiConsentGranted} onChange={handleAiConsentToggle} />
          </SettingRow>
        </Section>

        {showOwnerLabs ? (
          <Section title="LABS">
            <OwnerLabsSection />
          </Section>
        ) : null}

        <Section title="INTERVAL-TIMER">
          <TimerSoundPackPicker
            enabled={preferences.timerSounds}
            packId={preferences.timerSoundPack}
            onEnabledChange={(v) => updatePreferences({ timerSounds: v }, true)}
            onPackChange={(id) => updatePreferences({ timerSoundPack: id }, true)}
          />
          <div
            style={{
              display: "flex",
              gap: 6,
              background: M.panel,
              padding: 4,
              borderRadius: 12,
              border: "1px solid " + M.line2,
              marginBottom: 14,
              marginTop: 16,
            }}
          >
            {TIMER_MODES.map((m) => (
              <MButton
                key={m.id}
                onClick={() => setTimerMode(m.id)}
                variant={timerMode === m.id ? "primary" : "ghost"}
                size="sm"
                style={{
                  flex: 1,
                  fontFamily: M.disp,
                  fontSize: 13,
                  letterSpacing: 0.3,
                  ...(timerMode === m.id ? null : { color: M.mut }),
                }}
              >
                {m.name}
              </MButton>
            ))}
          </div>
          <TimerConfigPanel mode={timerMode} cfg={timerCfg} setCfg={setTimerCfg} layout="wrap" />
          <MButton
            onClick={resetTimerDefaults}
            variant="secondary"
            size="sm"
            fullWidth
            style={{ marginTop: 14, color: M.mut, fontFamily: M.body, fontWeight: 600 }}
          >
            Auf Werkseinstellungen zurücksetzen
          </MButton>
        </Section>

        <div style={{ fontSize: 13, color: M.mut2, textAlign: "center", paddingTop: 4 }}>
          Änderungen werden automatisch gespeichert
        </div>
      </div>

      <BottomSheet
        open={aiConsentSheetOpen}
        onClose={() => setAiConsentSheetOpen(false)}
        position="absolute"
        zIndex={40}
        aria-label="KI-Einwilligung"
      >
        <AiConsentStep
          onOpenPrivacy={openDatenschutz}
          onAccept={handleGrantAiConsent}
          onBack={() => setAiConsentSheetOpen(false)}
          showActions
          saving={saving}
        />
      </BottomSheet>
    </div>
  );
}
