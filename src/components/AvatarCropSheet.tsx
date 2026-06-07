import { useCallback, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { M } from "../theme";
import { cropImageToBlob } from "../lib/cropImage";

export interface AvatarCropSheetProps {
  open: boolean;
  imageSrc: string | null;
  busy?: boolean;
  onClose: () => void;
  onSave: (blob: Blob) => Promise<void>;
}

export function AvatarCropSheet({ open, imageSrc, busy = false, onClose, onSave }: AvatarCropSheetProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels || busy || saving) return;
    setSaving(true);
    try {
      const blob = await cropImageToBlob(imageSrc, croppedAreaPixels);
      await onSave(blob);
    } finally {
      setSaving(false);
    }
  };

  const isBusy = busy || saving;

  return (
    <BottomSheet
      open={open && !!imageSrc}
      onClose={onClose}
      position="absolute"
      zIndex={35}
      aria-label="Profilbild zuschneiden"
      fitContent={false}
      wrapScroll={false}
      lockBodyScroll
      maxHeight="min(92dvh, 92vh)"
    >
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 20, marginBottom: 14, flexShrink: 0 }}>
        Profilbild zuschneiden
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "min(52vw, 280px)",
          borderRadius: 16,
          overflow: "hidden",
          background: M.bg,
          flexShrink: 0,
        }}
      >
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        )}
      </div>

      <div style={{ padding: "16px 4px 8px", flexShrink: 0 }}>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom"
          style={{ width: "100%", accentColor: M.acc }}
        />
      </div>

      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
        <MButton type="button" onClick={onClose} variant="ghost" size="md" fullWidth disabled={isBusy}>
          Abbrechen
        </MButton>
        <MButton
          type="button"
          onClick={handleSave}
          variant="primary"
          size="md"
          fullWidth
          disabled={isBusy || !croppedAreaPixels}
        >
          {isBusy ? "Speichern…" : "Speichern"}
        </MButton>
      </div>
    </BottomSheet>
  );
}
