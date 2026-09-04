import { describe, expect, it } from 'vitest';

import { detectImageFormat, MAX_IMAGE_BYTES, validateImage } from './validate';

/** Baut Testbytes: Signatur vorne, danach Füllmaterial. */
function bytes(signature: number[], length = 64): Uint8Array {
  const buffer = new Uint8Array(length);
  buffer.set(signature, 0);
  return buffer;
}

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0]);
const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = bytes([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')]);
const AVIF = bytes([0, 0, 0, 0x20, ...ascii('ftyp'), ...ascii('avif')]);
const HEIC = bytes([0, 0, 0, 0x20, ...ascii('ftyp'), ...ascii('heic')]);

describe('detectImageFormat', () => {
  it('erkennt die unterstuetzten Formate an den ersten Bytes', () => {
    expect(detectImageFormat(JPEG)).toBe('jpeg');
    expect(detectImageFormat(PNG)).toBe('png');
    expect(detectImageFormat(WEBP)).toBe('webp');
    expect(detectImageFormat(AVIF)).toBe('avif');
  });

  it('erkennt iPhone-Fotos gesondert', () => {
    expect(detectImageFormat(HEIC)).toBe('heic');
  });

  it('gibt bei unbekanntem Inhalt null zurueck', () => {
    expect(detectImageFormat(bytes(ascii('MZ\x90\x00')))).toBeNull();
    expect(detectImageFormat(bytes(ascii('<?php')))).toBeNull();
    expect(detectImageFormat(new Uint8Array(4))).toBeNull();
  });
});

describe('validateImage', () => {
  it('nimmt gueltige Bilder an', () => {
    const result = validateImage(JPEG);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.mime).toBe('image/jpeg');
  });

  it('weist leere Dateien ab', () => {
    expect(validateImage(new Uint8Array(0))).toEqual({ ok: false, error: 'empty' });
  });

  it('weist zu grosse Dateien ab', () => {
    const huge = new Uint8Array(MAX_IMAGE_BYTES + 1);
    huge.set([0xff, 0xd8, 0xff], 0);
    expect(validateImage(huge)).toEqual({ ok: false, error: 'tooLarge' });
  });

  it('nennt iPhone-Fotos beim Namen statt nur abzulehnen', () => {
    expect(validateImage(HEIC)).toEqual({ ok: false, error: 'heicNotSupported' });
  });

  it('laesst eine umbenannte ausfuehrbare Datei nicht durch', () => {
    // Eine EXE mit der Endung .jpg meldet der Browser als image/jpeg.
    const exe = bytes(ascii('MZ'), 2048);
    expect(validateImage(exe)).toEqual({ ok: false, error: 'unsupportedFormat' });
  });

  it('laesst ein Skript mit Bildendung nicht durch', () => {
    expect(validateImage(bytes(ascii('#!/bin/sh'), 512)))
      .toEqual({ ok: false, error: 'unsupportedFormat' });
  });
});
