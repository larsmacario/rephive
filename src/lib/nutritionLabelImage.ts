const MAX_DIMENSION_PX = 1200;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild konnte nicht geladen werden."));
    };
    img.src = url;
  });
}

export async function fileToBase64Jpeg(
  file: File,
  maxDimensionPx = MAX_DIMENSION_PX,
): Promise<{ base64: string; mediaType: "image/jpeg" | "image/png" }> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxDimensionPx / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar.");
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const base64 = dataUrl.split(",")[1] ?? "";
  if (!base64) throw new Error("Bild-Kodierung fehlgeschlagen.");
  return { base64, mediaType: "image/jpeg" };
}
