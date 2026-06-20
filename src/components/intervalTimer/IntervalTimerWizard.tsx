import { useState } from "react";
import { M } from "../../theme";
import type { SaveSessionInput } from "../../lib/db";
import { useIntervalTimerSession } from "../../lib/intervalTimer/useIntervalTimerSession";
import { TimerTypeStep } from "./TimerTypeStep";
import { TimerSettingsStep } from "./TimerSettingsStep";
import { TimerRunStep } from "./TimerRunStep";
import { TimerLeaveSheet } from "../TimerLeaveSheet";
import { HeartRateConnectSheet } from "../track/HeartRateConnectSheet";
import { AlertSheet } from "../AlertSheet";
import { MButton } from "../MButton";
import { Icon } from "../Icon";

export type WizardStep = "type" | "settings" | "run";

const STEP_INDEX: Record<WizardStep, number> = { type: 1, settings: 2, run: 3 };

export interface IntervalTimerWizardProps {
  onSaveSession: (input: SaveSessionInput) => Promise<void>;
  variant?: "screen" | "sheet";
  onExit?: () => void;
  showHeader?: boolean;
}

export function IntervalTimerWizard({
  onSaveSession,
  variant = "screen",
  onExit,
  showHeader = false,
}: IntervalTimerWizardProps) {
  const [step, setStep] = useState<WizardStep>("type");
  const session = useIntervalTimerSession({ onSaveSession });
  const {
    mode,
    setMode,
    cfg,
    setCfg,
    T,
    heartRate,
    heartRateSheetOpen,
    setHeartRateSheetOpen,
    leaveAction,
    leaveCopy,
    confirmLeaveAction,
    requestBackFromRun,
    timerIdle,
  } = session;

  const handleBack = () => {
    if (step === "type") {
      if (!timerIdle) {
        session.setLeaveAction({ kind: "back" });
        return;
      }
      setStep("type");
      onExit?.();
      return;
    }
    if (step === "settings") {
      setStep("type");
      return;
    }
    if (step === "run" && requestBackFromRun()) {
      setStep("settings");
    }
  };

  const handleConfirmLeave = () => {
    confirmLeaveAction(() => {
      if (step === "run") {
        setStep("settings");
      } else {
        setStep("type");
        onExit?.();
      }
    });
  };

  const stepLabel = `Schritt ${STEP_INDEX[step]} / 3`;

  const header = showHeader ? (
    <div
      style={{
        padding: "2px 0 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}
    >
      <MButton type="button" variant="ghost" size="icon" onClick={handleBack} aria-label="Zurück">
        <Icon name="chevL" size={20} stroke={2.2} color={M.mut} />
      </MButton>
      <div style={{ textAlign: "center" }}>
        <span style={{ fontSize: 13, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>INTERVALL TIMER</span>
        <div style={{ fontSize: 11, color: M.mut2, marginTop: 2, fontWeight: 600 }}>{stepLabel}</div>
      </div>
      <span style={{ width: 40 }} aria-hidden />
    </div>
  ) : null;

  const body = (
    <>
      {step === "type" && (
        <TimerTypeStep
          mode={mode}
          onSelect={(id) => {
            setMode(id);
            setStep("settings");
          }}
        />
      )}
      {step === "settings" && (
        <TimerSettingsStep
          mode={mode}
          cfg={cfg}
          setCfg={setCfg}
          disabled={!T.idle}
          onBack={() => setStep("type")}
          onNext={() => setStep("run")}
        />
      )}
      {step === "run" && <TimerRunStep session={session} variant={variant} />}
    </>
  );

  const overlays = (
    <>
      <TimerLeaveSheet
        open={!!leaveAction && !!leaveCopy}
        message={leaveCopy?.message}
        confirmLabel={leaveCopy?.confirmLabel}
        onConfirm={handleConfirmLeave}
        onCancel={() => session.setLeaveAction(null)}
      />
      <HeartRateConnectSheet
        open={heartRateSheetOpen}
        onClose={() => setHeartRateSheetOpen(false)}
        status={heartRate.status}
        bpm={heartRate.bpm}
        deviceName={heartRate.deviceName}
        isSupported={heartRate.isSupported}
        isBusy={heartRate.isBusy}
        onConnect={() => void heartRate.connect()}
        onDisconnect={() => void heartRate.disconnect()}
      />
      <AlertSheet
        open={!!heartRate.error}
        title="Herzfrequenz"
        message={heartRate.error ?? ""}
        icon="alertCircle"
        onClose={heartRate.clearError}
      />
    </>
  );

  if (variant === "sheet") {
    return (
      <>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div style={{ fontSize: 12, color: M.mut, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>
            {stepLabel}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{body}</div>
        </div>
        {overlays}
      </>
    );
  }

  return (
    <>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {header}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{body}</div>
      </div>
      {overlays}
    </>
  );
}
