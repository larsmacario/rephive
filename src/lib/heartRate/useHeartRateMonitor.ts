import { useCallback, useEffect, useRef, useState } from "react";
import {
  connectHeartRateMonitor,
  disconnectHeartRateMonitor,
  isHeartRateBleSupported,
  type HeartRateConnectionStatus,
} from "./bleHeartRate";

export function useHeartRateMonitor() {
  const [status, setStatus] = useState<HeartRateConnectionStatus>("idle");
  const [bpm, setBpm] = useState<number | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const isSupported = isHeartRateBleSupported();

  const handleDisconnect = useCallback(() => {
    deviceIdRef.current = null;
    setStatus("idle");
    setDeviceName(null);
    setBpm(null);
  }, []);

  const disconnect = useCallback(async () => {
    const deviceId = deviceIdRef.current;
    if (!deviceId) {
      handleDisconnect();
      return;
    }
    setStatus("disconnecting");
    try {
      await disconnectHeartRateMonitor(deviceId);
    } finally {
      handleDisconnect();
    }
  }, [handleDisconnect]);

  const connect = useCallback(async () => {
    if (!isSupported) {
      setError("Herzfrequenz-Sensoren sind nur in der iOS-App oder in Chrome (Web Bluetooth) verfügbar.");
      return;
    }
    setError(null);
    setStatus("connecting");
    try {
      const session = await connectHeartRateMonitor(
        (nextBpm) => setBpm(nextBpm),
        () => handleDisconnect(),
      );
      deviceIdRef.current = session.deviceId;
      setDeviceName(session.deviceName);
      setStatus("connected");
    } catch (err) {
      handleDisconnect();
      const message =
        err instanceof Error ? err.message : "Verbindung zum Herzfrequenz-Sensor fehlgeschlagen.";
      if (message.toLowerCase().includes("cancel")) {
        setError(null);
      } else {
        setError(message);
      }
    }
  }, [handleDisconnect, isSupported]);

  useEffect(() => {
    return () => {
      const deviceId = deviceIdRef.current;
      if (deviceId) {
        void disconnectHeartRateMonitor(deviceId);
        deviceIdRef.current = null;
      }
    };
  }, []);

  return {
    status,
    bpm,
    deviceName,
    error,
    isSupported,
    isConnected: status === "connected",
    isBusy: status === "connecting" || status === "disconnecting",
    connect,
    disconnect,
    clearError: () => setError(null),
  };
}
