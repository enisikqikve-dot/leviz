/** Längste Kante nach der Verkleinerung. Reicht für Vollbild auf jedem Gerät. */
export const MAX_EDGE = 1920;
export const JPEG_QUALITY = 0.82;

export type CompressResult = {
  file: File;
  width: number;
  height: number;
  /** Ursprüngliche Größe in Byte, für die Anzeige der Ersparnis. */
  originalSize: number;
};

/**
 * Verkleinert und komprimiert ein Bild im Browser, bevor es hochgeladen wird.
 *
 * Fotos aus Handykameras haben oft 4000 Pixel Kantenlänge und mehrere Megabyte.
 * Ungebremst hochgeladen dauert das über eine Mobilfunkverbindung lange und
 * kostet den Verkäufer Datenvolumen — beides Gründe, warum Inserate ohne Bilder
 * entstehen.
 */
export async function compressImage(file: File): Promise<CompressResult> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    // Ohne Canvas wird das Original genommen; die Serverprüfung greift weiterhin.
    return { file, width: bitmap.width, height: bitmap.height, originalSize: file.size };
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
  });

  if (!blob) {
    return { file, width, height, originalSize: file.size };
  }

  const name = file.name.replace(/\.[^.]+$/, '') || 'foto';

  return {
    file: new File([blob], `${name}.jpg`, { type: 'image/jpeg' }),
    width,
    height,
    originalSize: file.size,
  };
}
