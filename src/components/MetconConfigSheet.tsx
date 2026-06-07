import { useEffect, useState, type ReactNode } from "react";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { MStepper } from "./widgets";
import { FORMAT_LABELS, type BlockFormat } from "../lib/planBlocks";
import {
  formatMetconBlockBadge,
  METCON_DEFAULTS,
  normalizeMetconConfig,
  type MetconConfig,
  type MetconFormat,
} from "../lib/metcon";
import { M } from "../theme";

const METCON_FORMATS: MetconFormat[] = ["amrap", "emom", "circuit"];

export interface MetconConfigSheetProps {
  open: boolean;
  initialConfig?: MetconConfig | null;
  onClose: () => void;
  onConfirm: (config: MetconConfig) => void;
}

function configFromDraft(format: MetconFormat, draft: Partial<MetconConfig>): MetconConfig {
  return normalizeMetconConfig(format, { format, ...draft });
}

export function MetconConfigSheet({ open, initialConfig, onClose, onConfirm }: MetconConfigSheetProps) {
  const [format, setFormat] = useState<MetconFormat>("amrap");
  const [durationMin, setDurationMin] = useState(10);
  const [rounds, setRounds] = useState(12);
  const [intervalSec, setIntervalSec] = useState(60);
  const [circuitRounds, setCircuitRounds] = useState(3);
  const [workSec, setWorkSec] = useState(45);
  const [restSec, setRestSec] = useState(15);
  const [restBetweenRoundsSec, setRestBetweenRoundsSec] = useState(60);
  const [prepSec, setPrepSec] = useState(5);

  useEffect(() => {
    if (!open) return;
    const base = initialConfig ? normalizeMetconConfig(initialConfig.format, initialConfig) : METCON_DEFAULTS.amrap;
    setFormat(base.format);
    setDurationMin(Math.round((base.durationSec ?? METCON_DEFAULTS.amrap.durationSec!) / 60));
    setRounds(base.rounds ?? METCON_DEFAULTS.emom.rounds!);
    setIntervalSec(base.intervalSec ?? METCON_DEFAULTS.emom.intervalSec!);
    setCircuitRounds(base.rounds ?? METCON_DEFAULTS.circuit.rounds!);
    setWorkSec(base.workSec ?? METCON_DEFAULTS.circuit.workSec!);
    setRestSec(base.restSec ?? METCON_DEFAULTS.circuit.restSec!);
    setRestBetweenRoundsSec(base.restBetweenRoundsSec ?? METCON_DEFAULTS.circuit.restBetweenRoundsSec!);
    setPrepSec(base.prepSec ?? 5);
  }, [open, initialConfig]);

  const previewConfig = (): MetconConfig => {
    if (format === "amrap") {
      return configFromDraft("amrap", { durationSec: durationMin * 60, prepSec });
    }
    if (format === "emom") {
      return configFromDraft("emom", { rounds, intervalSec, prepSec });
    }
    return configFromDraft("circuit", {
      rounds: circuitRounds,
      workSec,
      restSec,
      restBetweenRoundsSec,
      prepSec,
    });
  };

  const handleConfirm = () => {
    onConfirm(previewConfig());
    onClose();
  };

  const fieldRow = (label: string, node: ReactNode) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid " + M.line2,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: M.fg }}>{label}</span>
      {node}
    </div>
  );

  return (
    <BottomSheet open={open} onClose={onClose} zIndex={25} aria-label="MetCon konfigurieren">
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, marginBottom: 4 }}>MetCon</div>
      <div style={{ color: M.mut, fontSize: 12, marginBottom: 16 }}>
        Format und Timer — {formatMetconBlockBadge(previewConfig())}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {METCON_FORMATS.map((f) => (
          <MButton
            key={f}
            type="button"
            variant={format === f ? "primary" : "secondary"}
            size="sm"
            onClick={() => setFormat(f)}
            style={{ flex: "1 1 auto", minWidth: 88 }}
          >
            {FORMAT_LABELS[f as BlockFormat]}
          </MButton>
        ))}
      </div>

      {format === "amrap" && fieldRow("Dauer (Min)", <MStepper value={durationMin} onChange={setDurationMin} min={5} max={30} />)}
      {format === "emom" && (
        <>
          {fieldRow("Runden", <MStepper value={rounds} onChange={setRounds} min={4} max={30} />)}
          {fieldRow("Intervall (Sek.)", <MStepper value={intervalSec} onChange={setIntervalSec} min={30} max={120} step={5} />)}
        </>
      )}
      {format === "circuit" && (
        <>
          {fieldRow("Runden", <MStepper value={circuitRounds} onChange={setCircuitRounds} min={2} max={8} />)}
          {fieldRow("Work (Sek.)", <MStepper value={workSec} onChange={setWorkSec} min={20} max={90} step={5} />)}
          {fieldRow("Rest (Sek.)", <MStepper value={restSec} onChange={setRestSec} min={5} max={60} step={5} />)}
          {fieldRow(
            "Pause zwischen Runden (Sek.)",
            <MStepper value={restBetweenRoundsSec} onChange={setRestBetweenRoundsSec} min={15} max={120} step={5} />,
          )}
        </>
      )}
      {fieldRow("Prep (Sek.)", <MStepper value={prepSec} onChange={setPrepSec} min={0} max={15} />)}

      <MButton type="button" variant="primary" size="md" fullWidth onClick={handleConfirm} style={{ marginTop: 20 }}>
        Übernehmen
      </MButton>
    </BottomSheet>
  );
}
