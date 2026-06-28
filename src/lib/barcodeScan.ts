import { Capacitor } from "@capacitor/core";

export type ScanEanFailureReason =
  | "web_unsupported"
  | "permission_denied"
  | "cancelled"
  | "native_plugin_missing"
  | "unknown";

export type ScanEanResult =
  | { ok: true; ean: string }
  | { ok: false; reason: ScanEanFailureReason; message: string };

async function scanWithPlugin(): Promise<ScanEanResult> {
  const { BarcodeScanner, BarcodeFormat } = await import("@capacitor-mlkit/barcode-scanning");

  if (!Capacitor.isNativePlatform()) {
    const { supported } = await BarcodeScanner.isSupported();
    if (!supported) {
      return {
        ok: false,
        reason: "web_unsupported",
        message: "Barcode-Scan wird in diesem Browser nicht unterstützt — EAN manuell eingeben.",
      };
    }
  }

  const { camera } = await BarcodeScanner.checkPermissions();
  if (camera !== "granted" && camera !== "limited") {
    const req = await BarcodeScanner.requestPermissions();
    if (req.camera !== "granted" && req.camera !== "limited") {
      return {
        ok: false,
        reason: "permission_denied",
        message: "Kamera-Zugriff verweigert — EAN manuell eingeben oder in den Einstellungen erlauben.",
      };
    }
  }

  const result = await BarcodeScanner.scan({
    formats: [BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE],
  });

  const raw = result.barcodes?.[0]?.rawValue ?? result.barcodes?.[0]?.displayValue;
  if (!raw) {
    return {
      ok: false,
      reason: "cancelled",
      message: "Kein Barcode erkannt — erneut scannen oder EAN eingeben.",
    };
  }

  return { ok: true, ean: raw.replace(/\D/g, "") };
}

export async function scanEan(): Promise<ScanEanResult> {
  if (!Capacitor.isNativePlatform()) {
    await import("barcode-detector/polyfill");
  }

  try {
    return await scanWithPlugin();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const lower = message.toLowerCase();

    if (lower.includes("cancel") || lower.includes("dismiss")) {
      return { ok: false, reason: "cancelled", message: "Scan abgebrochen." };
    }
    if (lower.includes("permission") || lower.includes("denied")) {
      return {
        ok: false,
        reason: "permission_denied",
        message: "Kamera-Zugriff verweigert — EAN manuell eingeben.",
      };
    }
    if (
      Capacitor.isNativePlatform() &&
      (lower.includes("not implemented") || lower.includes("unavailable") || lower.includes("plugin"))
    ) {
      return {
        ok: false,
        reason: "native_plugin_missing",
        message:
          "Barcode-Plugin nicht geladen — App neu bauen (Xcode: App.xcworkspace öffnen, nicht .xcodeproj).",
      };
    }

    return {
      ok: false,
      reason: "unknown",
      message: message || "Scan fehlgeschlagen — EAN manuell eingeben.",
    };
  }
}
