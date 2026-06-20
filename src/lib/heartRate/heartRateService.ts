export const HEART_RATE_SERVICE = "0000180d-0000-1000-8000-00805f9b34fb";
export const HEART_RATE_MEASUREMENT_CHARACTERISTIC = "00002a37-0000-1000-8000-00805f9b34fb";

/** Parse BLE Heart Rate Measurement characteristic (GATT 0x2A37). */
export function parseHeartRateMeasurement(value: DataView): number | null {
  if (value.byteLength < 2) return null;
  const flags = value.getUint8(0);
  const rate16Bits = flags & 0x1;
  const heartRate = rate16Bits > 0 ? value.getUint16(1, true) : value.getUint8(1);
  if (!Number.isFinite(heartRate) || heartRate <= 0 || heartRate > 250) return null;
  return heartRate;
}

export function formatTrackElapsed(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatTrackVolume(volumeKg: number): { value: string; unit: string } {
  if (volumeKg >= 1000) {
    return { value: (volumeKg / 1000).toFixed(1), unit: "t" };
  }
  return { value: String(Math.round(volumeKg)), unit: "kg" };
}
