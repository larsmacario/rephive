import { M } from "../theme";
import { fmt, type TimerCfg, type TimerMode } from "../lib/engine";
import { MStepper } from "./widgets";

export interface TimerConfigPanelProps {
  mode: TimerMode;
  cfg: TimerCfg;
  setCfg: (p: Partial<TimerCfg>) => void;
  disabled?: boolean;
  layout?: "row" | "wrap";
}

export function TimerConfigPanel({
  mode,
  cfg,
  setCfg,
  disabled = false,
  layout = "row",
}: TimerConfigPanelProps) {
  const cell = (label: string, node: React.ReactNode) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
      <span style={{ fontSize: 10.5, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>
        {label}
      </span>
      {node}
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        justifyContent: layout === "row" ? "center" : "flex-start",
        flexWrap: layout === "wrap" ? "wrap" : "nowrap",
        gap: 22,
        padding: "4px 0",
      }}
    >
      {mode === "emom" && (
        <>
          {cell(
            "RUNDEN",
            <MStepper
              value={cfg.rounds!}
              min={1}
              max={30}
              onChange={(v) => setCfg({ rounds: v })}
              disabled={disabled}
            />,
          )}
          {cell(
            "INTERVALL",
            <MStepper
              value={cfg.interval!}
              min={15}
              max={300}
              step={15}
              fmt={fmt}
              onChange={(v) => setCfg({ interval: v })}
              disabled={disabled}
            />,
          )}
        </>
      )}
      {mode === "amrap" &&
        cell(
          "DAUER",
          <MStepper
            value={cfg.total!}
            min={60}
            max={3600}
            step={60}
            fmt={fmt}
            onChange={(v) => setCfg({ total: v })}
            disabled={disabled}
          />,
        )}
      {mode === "tabata" && (
        <>
          {cell(
            "WORK",
            <MStepper
              value={cfg.work!}
              min={5}
              max={120}
              step={5}
              fmt={fmt}
              onChange={(v) => setCfg({ work: v })}
              disabled={disabled}
            />,
          )}
          {cell(
            "REST",
            <MStepper
              value={cfg.rest!}
              min={5}
              max={120}
              step={5}
              fmt={fmt}
              onChange={(v) => setCfg({ rest: v })}
              disabled={disabled}
            />,
          )}
          {cell(
            "RUNDEN",
            <MStepper
              value={cfg.rounds!}
              min={1}
              max={20}
              onChange={(v) => setCfg({ rounds: v })}
              disabled={disabled}
            />,
          )}
        </>
      )}
      {mode === "fortime" &&
        cell(
          "TIME CAP",
          <MStepper
            value={cfg.cap!}
            min={60}
            max={3600}
            step={60}
            fmt={fmt}
            onChange={(v) => setCfg({ cap: v })}
            disabled={disabled}
          />,
        )}
    </div>
  );
}
