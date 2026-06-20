import { M } from "../theme";
import { fmt, type TimerCfg, type TimerMode } from "../lib/engine";
import { MStepper } from "./widgets";

export interface TimerConfigPanelProps {
  mode: TimerMode;
  cfg: TimerCfg;
  setCfg: (p: Partial<TimerCfg>) => void;
  disabled?: boolean;
  layout?: "row" | "wrap" | "stack";
  size?: "default" | "lg";
}

export function TimerConfigPanel({
  mode,
  cfg,
  setCfg,
  disabled = false,
  layout = "row",
  size = "default",
}: TimerConfigPanelProps) {
  const isStack = layout === "stack";
  const stepperSize = size;

  const cell = (label: string, node: React.ReactNode) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: isStack ? 12 : 7,
        width: isStack ? "100%" : undefined,
        padding: isStack ? "8px 0" : undefined,
      }}
    >
      <span
        style={{
          fontSize: isStack ? 14 : 13,
          letterSpacing: 1.5,
          color: M.mut,
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      {node}
    </div>
  );

  const stepperProps = { disabled, size: stepperSize };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isStack ? "column" : "row",
        justifyContent: isStack ? "center" : layout === "row" ? "center" : "flex-start",
        alignItems: isStack ? "stretch" : undefined,
        flexWrap: layout === "wrap" ? "wrap" : "nowrap",
        gap: isStack ? 20 : 22,
        padding: isStack ? "8px 0" : "4px 0",
        width: "100%",
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
              {...stepperProps}
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
              {...stepperProps}
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
            {...stepperProps}
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
              {...stepperProps}
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
              {...stepperProps}
            />,
          )}
          {cell(
            "RUNDEN",
            <MStepper
              value={cfg.rounds!}
              min={1}
              max={20}
              onChange={(v) => setCfg({ rounds: v })}
              {...stepperProps}
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
            {...stepperProps}
          />,
        )}
    </div>
  );
}
