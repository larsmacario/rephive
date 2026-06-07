import type { Area } from "react-easy-crop";

const MAX_OUTPUT_SIZE = 512;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Bild konnte nicht geladen werden.")));
    image.src = src;
  });
}

export async function cropImageToBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar.");

  const cropSize = Math.min(pixelCrop.width, pixelCrop.height);
  const outputSize = Math.min(MAX_OUTPUT_SIZE, Math.round(cropSize));

  canvas.width = outputSize;
  canvas.height = outputSize;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Bild konnte nicht exportiert werden."));
      },
      "image/webp",
      0.85,
    );
  });
}
