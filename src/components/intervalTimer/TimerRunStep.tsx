import { M } from "../../theme";
import { TIMER_MODES } from "../../lib/engine";
import type { IntervalTimerSession } from "../../lib/intervalTimer/useIntervalTimerSession";
import { timerModeAccent, timerPhaseColor } from "../../lib/intervalTimer/timerModeColors";
import { useBreakpoint, useShortViewport } from "../../lib/responsive";
import { Icon } from "../Icon";
import { HeartRateTrend } from "../HeartRateTrend";
import { MButton } from "../MButton";
import { TimerClockDisplay } from "./TimerClockDisplay";

export interface TimerRunStepProps {
  session: IntervalTimerSession;
  variant: "screen" | "sheet";
}

export function TimerRunStep({ session, variant }: TimerRunStepProps) {
  const isSheet = variant === "sheet";
  const breakpoint = useBreakpoint();
  const isShort = useShortViewport();
  const isCompact = isSheet || breakpoint === "mobile" || isShort;

  const {
    mode,
    T,
    heartRate,
    setHeartRateSheetOpen,
    hrSamples,
    maxHr,
    birthDate,
    saveStatus,
    saveError,
    requestReset,
  } = session;

  const modeMeta = TIMER_MODES.find((m) => m.id === mode)!;
  const modeAccent = timerModeAccent(mode);
  const timerPhaseTextColor = timerPhaseColor(T.kind, modeAccent, T.done);
  const clockCountUp = T.countUp && T.phase !== "prep";
  const digitMinHeight = isCompact ? "min(190px, 29vmin)" : "min(214px, 33vmin)";
  const metaSlotMinHeight = isCompact ? 44 : 52;
  const metaSlotMarginTop = isCompact ? 10 : 14;
  const metaFontSize = isCompact ? "clamp(28px, 7vmin, 40px)" : "clamp(32px, 8vmin, 48px)";
  const labelFontSize = isCompact ? "clamp(22px, 5.5vmin, 32px)" : "clamp(24px, 6vmin, 36px)";
  const digitFontSize = isCompact ? "clamp(120px, 36vmin, 220px)" : "clamp(132px, 40vmin, 260px)";

  const roundMetaContent =
    (mode === "emom" || mode === "tabata") && T.phase !== "prep" ? (
      <>
        RUNDE {String(T.round).padStart(2, "0")}{" "}
        <span style={{ color: M.mut2 }}>/ {String(T.rounds).padStart(2, "0")}</span>
      </>
    ) : mode === "amrap" && T.phase !== "prep" ? (
      <>
        {T.taps} <span style={{ color: M.mut2 }}>RUNDEN</span>
      </>
    ) : null;

  const modeAction = (
    <div
      style={{
        minHeight: mode === "emom" || mode === "tabata" ? 0 : 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: isCompact ? 8 : 12,
        flexShrink: 0,
      }}
    >
      {mode === "amrap" && (
        <MButton
          onClick={T.addTap}
          disabled={!T.running}
          variant="secondary"
          size="md"
          fullWidth
          style={{
            fontFamily: M.disp,
            letterSpacing: 0.6,
            background: T.running ? M.accSoft : M.card,
            color: T.running ? M.fg : M.mut2,
          }}
        >
          + Runde abschließen
        </MButton>
      )}
      {mode === "fortime" && (
        <MButton
          onClick={T.finish}
          disabled={!T.running}
          variant="primary"
          size="md"
          fullWidth
          style={{
            fontFamily: M.disp,
            letterSpacing: 0.6,
            ...(T.running ? null : { background: M.card, color: M.mut2 }),
          }}
        >
          <Icon name="flag" size={15} stroke={2.4} />
          Zeit stoppen
        </MButton>
      )}
    </div>
  );

  const playbackControls = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: isCompact ? 20 : 24,
        flexShrink: 0,
      }}
    >
      <MButton onClick={requestReset} variant="secondary" size="icon" aria-label="Timer zurücksetzen">
        <Icon name="reset" size={16} stroke={2} color={M.mut} />
      </MButton>
      <button
        onClick={T.toggle}
        disabled={T.done}
        style={{
          width: 68,
          height: 68,
          borderRadius: 34,
          border: "none",
          cursor: T.done ? "default" : "pointer",
          background: T.done ? M.card : M.acc,
          color: T.done ? M.mut2 : M.accInk,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: T.running ? `0 0 0 4px ${M.accSoft}, 0 0 18px ${M.accSoft}` : "none",
          transition: "box-shadow .2s",
        }}
      >
        <Icon name={T.running ? "pause" : "play"} size={30} style={{ marginLeft: T.running ? 0 : 3 }} />
      </button>
    </div>
  );

  const header = (
    <div style={{ textAlign: "center", flexShrink: 0, marginBottom: isCompact ? 8 : 12 }}>
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 20, letterSpacing: 1, color: M.fg }}>
        {modeMeta.name}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: isCompact ? 11 : 12,
          letterSpacing: 1.2,
          color: M.mut,
          fontWeight: 600,
        }}
      >
        {modeMeta.blurb.toUpperCase()}
      </div>
    </div>
  );

  const timerBlock = (
    <>
      {(saveStatus === "saved" || saveStatus === "error") && (
        <div
          style={{
            textAlign: "center",
            marginBottom: 12,
            fontSize: 13,
            fontWeight: 600,
            color: saveStatus === "saved" ? M.acc : "#ff8a8a",
          }}
        >
          {saveStatus === "saved" ? "Im Verlauf gespeichert" : saveError}
        </div>
      )}

      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <span
          style={{
            display: "block",
            minHeight: isCompact ? 24 : 28,
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: labelFontSize,
            letterSpacing: 4,
            color: timerPhaseTextColor,
          }}
        >
          {T.label}
        </span>
        <TimerClockDisplay
          seconds={T.bigSeconds}
          countUp={clockCountUp}
          fontSize={digitFontSize}
          color={timerPhaseTextColor}
          minHeight={digitMinHeight}
          marginTop={isCompact ? 2 : 6}
        />
        <div
          aria-hidden={!roundMetaContent}
          style={{
            minHeight: metaSlotMinHeight,
            marginTop: metaSlotMarginTop,
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: metaFontSize,
            letterSpacing: mode === "amrap" ? 1.5 : 2,
            lineHeight: 1,
            color: M.fg,
            visibility: roundMetaContent ? "visible" : "hidden",
          }}
        >
          {roundMetaContent ?? "\u00a0"}
        </div>
      </div>
    </>
  );

  const footerContent = (
    <>
      {modeAction}
      <HeartRateTrend
        bpm={heartRate.bpm}
        connected={heartRate.isConnected}
        deviceName={heartRate.deviceName}
        supported={heartRate.isSupported}
        samples={hrSamples}
        maxHr={maxHr}
        birthDate={birthDate}
        compact
        onConnect={() => setHeartRateSheetOpen(true)}
      />
    </>
  );

  const scrollContent = (
    <>
      {header}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {timerBlock}
      </div>
      {footerContent}
    </>
  );

  if (isSheet) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1, minHeight: 0 }}>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {scrollContent}
        </div>
        <div style={{ flexShrink: 0, paddingTop: 12, paddingBottom: 4 }}>{playbackControls}</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          paddingBottom: 8,
        }}
      >
        {scrollContent}
      </div>
      <div
        style={{
          flexShrink: 0,
          paddingTop: 12,
          paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          borderTop: "1px solid " + M.line2,
          background: M.bg,
        }}
      >
        {playbackControls}
      </div>
    </div>
  );
}
