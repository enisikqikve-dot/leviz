/**
 * Wie klein ein Foto wird, bevor es den Server sieht -- fuer Browser und App
 * dieselben Zahlen.
 *
 * Fotos aus Handykameras haben oft 4000 Pixel Kantenlaenge und mehrere
 * Megabyte. Ungebremst hochgeladen dauert das ueber Mobilfunk lange, kostet
 * den Verkaeufer Datenvolumen und dem Server bei jeder Umrechnung Speicher.
 * 1920 Pixel reichen fuer Vollbild auf jedem Geraet.
 */
export const MAX_EDGE = 1920;
export const JPEG_QUALITY = 0.82;
