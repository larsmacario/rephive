import { Capacitor } from "@capacitor/core";
import { BleClient } from "@capacitor-community/bluetooth-le";
import {
  HEART_RATE_MEASUREMENT_CHARACTERISTIC,
  HEART_RATE_SERVICE,
  parseHeartRateMeasurement,
} from "./heartRateService";

export type HeartRateConnectionStatus = "idle" | "connecting" | "connected" | "disconnecting";

let initialized = false;

export function isHeartRateBleSupported(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  await BleClient.initialize();
  initialized = true;
}

export interface HeartRateBleSession {
  deviceId: string;
  deviceName: string;
}

export async function connectHeartRateMonitor(
  onBpm: (bpm: number) => void,
  onDisconnect: () => void,
): Promise<HeartRateBleSession> {
  await ensureInitialized();

  const device = await BleClient.requestDevice({
    services: [HEART_RATE_SERVICE],
    optionalServices: [HEART_RATE_SERVICE],
  });

  await BleClient.connect(device.deviceId, () => {
    onDisconnect();
  });

  await BleClient.startNotifications(
    device.deviceId,
    HEART_RATE_SERVICE,
    HEART_RATE_MEASUREMENT_CHARACTERISTIC,
    (value) => {
      const bpm = parseHeartRateMeasurement(value);
      if (bpm != null) onBpm(bpm);
    },
  );

  return {
    deviceId: device.deviceId,
    deviceName: device.name || "Herzfrequenz-Sensor",
  };
}

export async function disconnectHeartRateMonitor(deviceId: string): Promise<void> {
  try {
    await BleClient.stopNotifications(
      deviceId,
      HEART_RATE_SERVICE,
      HEART_RATE_MEASUREMENT_CHARACTERISTIC,
    );
  } catch {
    // ignore if already stopped
  }
  try {
    await BleClient.disconnect(deviceId);
  } catch {
    // ignore if already disconnected
  }
}
