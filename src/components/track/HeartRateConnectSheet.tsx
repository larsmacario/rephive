import { M } from "../../theme";
import { BottomSheet } from "../BottomSheet";
import { MButton } from "../MButton";
import { Icon } from "../Icon";
import type { HeartRateConnectionStatus } from "../../lib/heartRate/bleHeartRate";

export interface HeartRateConnectSheetProps {
  open: boolean;
  onClose: () => void;
  status: HeartRateConnectionStatus;
  bpm: number | null;
  deviceName: string | null;
  isSupported: boolean;
  isBusy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function HeartRateConnectSheet({
  open,
  onClose,
  status,
  bpm,
  deviceName,
  isSupported,
  isBusy,
  onConnect,
  onDisconnect,
}: HeartRateConnectSheetProps) {
  const connected = status === "connected";

  return (
    <BottomSheet open={open} onClose={onClose} position="absolute" zIndex={40} aria-label="Herzfrequenz-Sensor">
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, color: M.fg, marginBottom: 8 }}>
        Herzfrequenz-Sensor
      </div>
      <p style={{ color: M.mut, fontSize: 14, lineHeight: 1.45, margin: "0 0 18px" }}>
        Koppel einen BLE-Brustgurt oder ein Fitness-Armband mit Heart-Rate-Service (z. B. Polar, Garmin, Wahoo).
      </p>

      {!isSupported ? (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            background: M.panel,
            border: "1px solid " + M.line2,
            color: M.mut,
            fontSize: 14,
            lineHeight: 1.45,
            marginBottom: 16,
          }}
        >
          Bluetooth-Herzfrequenz ist in Safari nicht verfügbar. Nutze die rephive iOS-App oder Chrome mit Web Bluetooth.
        </div>
      ) : connected ? (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            background: M.panel,
            border: "1px solid " + M.brandBorder,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="heart" size={20} fill={M.brand} color={M.brand} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: M.fg, fontSize: 15 }}>{deviceName ?? "Sensor verbunden"}</div>
              <div style={{ color: M.mut, fontSize: 13, marginTop: 4 }}>
                {bpm != null ? `${bpm} bpm` : "Warte auf Messwert…"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            background: M.panel,
            border: "1px solid " + M.line2,
            color: M.mut,
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          {status === "connecting"
            ? "Gerätewahl wird geöffnet…"
            : "Noch kein Sensor verbunden. Tippe unten, um ein Gerät auszuwählen."}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {connected ? (
          <MButton type="button" variant="secondary" size="md" fullWidth disabled={isBusy} onClick={onDisconnect}>
            Verbindung trennen
          </MButton>
        ) : (
          <MButton
            type="button"
            variant="primary"
            size="md"
            fullWidth
            disabled={!isSupported || isBusy}
            onClick={onConnect}
          >
            <Icon name="heart" size={16} color={M.brandInk} /> Sensor verbinden
          </MButton>
        )}
        <MButton type="button" variant="ghost" size="md" fullWidth onClick={onClose}>
          Schließen
        </MButton>
      </div>
    </BottomSheet>
  );
}
