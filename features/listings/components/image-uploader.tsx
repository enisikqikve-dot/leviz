'use client';

import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRef, useState, type DragEvent } from 'react';
import { toast } from 'sonner';

import { compressImage } from '@/features/listings/compress';
import {
  deleteVehicleImageAction, uploadVehicleImageAction,
} from '@/features/listings/upload-actions';
import { ACCEPT_ATTRIBUTE, MAX_IMAGES_PER_LISTING } from '@/lib/storage/validate';
import { cn } from '@/lib/utils';

export type ListingImage = { key: string; url: string };

type Pending = { id: string; name: string; preview: string };

export function ImageUploader({
  images,
  onChange,
}: {
  images: ListingImage[];
  onChange: (next: ListingImage[]) => void;
}) {
  const t = useTranslations('listing.images');
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const remaining = MAX_IMAGES_PER_LISTING - images.length - pending.length;

  async function handleFiles(files: FileList | File[]) {
    const list = [...files].slice(0, Math.max(0, remaining));
    if (list.length === 0) {
      toast.error(t('limitReached', { max: MAX_IMAGES_PER_LISTING }));
      return;
    }

    const entries: Pending[] = list.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      preview: URL.createObjectURL(file),
    }));
    setPending((current) => [...current, ...entries]);

    const uploaded: ListingImage[] = [];

    // Nacheinander statt parallel: auf einer Mobilfunkverbindung kommen
    // gleichzeitige Uploads einander in die Quere.
    for (const [index, file] of list.entries()) {
      const entry = entries[index];

      try {
        const compressed = await compressImage(file);
        const body = new FormData();
        body.append('file', compressed.file);

        const result = await uploadVehicleImageAction(body);

        if (result.ok) uploaded.push(result.data);
        else toast.error(`${file.name}: ${result.error}`);
      } catch {
        toast.error(`${file.name}: ${t('uploadFailed')}`);
      } finally {
        URL.revokeObjectURL(entry.preview);
        setPending((current) => current.filter((item) => item.id !== entry.id));
      }
    }

    if (uploaded.length > 0) onChange([...images, ...uploaded]);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  async function remove(index: number) {
    const image = images[index];
    onChange(images.filter((_, i) => i !== index));
    await deleteVehicleImageAction(image.key);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer.files.length > 0) void handleFiles(event.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={cn(
          'rounded-xl border-2 border-dashed p-8 text-center transition-colors',
          dragActive ? 'border-primary bg-primary/5' : 'border-border',
        )}
      >
        <ImagePlus className="text-muted-foreground mx-auto size-8" aria-hidden />
        <p className="mt-3 text-sm font-medium">{t('dropHere')}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {t('hint', { max: MAX_IMAGES_PER_LISTING })}
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-primary mt-4 text-sm font-medium hover:underline"
        >
          {t('choose')}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </div>

      {images.length > 0 || pending.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={image.key}
              className="group bg-muted relative aspect-[4/3] overflow-hidden rounded-lg border"
            >
              <Image src={image.url} alt="" fill sizes="200px" className="object-cover" />

              {index === 0 ? (
                <span className="bg-featured text-featured-foreground absolute start-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold">
                  <Star className="size-3 fill-current" aria-hidden />
                  {t('mainImage')}
                </span>
              ) : null}

              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2">
                <div className="flex gap-1">
                  <button
                    type="button" onClick={() => move(index, index - 1)}
                    disabled={index === 0} aria-label={t('moveLeft')}
                    className="inline-flex size-7 items-center justify-center rounded-md bg-white/90 text-black disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button" onClick={() => move(index, index + 1)}
                    disabled={index === images.length - 1} aria-label={t('moveRight')}
                    className="inline-flex size-7 items-center justify-center rounded-md bg-white/90 text-black disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </button>
                </div>
                <button
                  type="button" onClick={() => void remove(index)} aria-label={t('remove')}
                  className="bg-destructive inline-flex size-7 items-center justify-center rounded-md text-white"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}

          {pending.map((entry) => (
            <li
              key={entry.id}
              className="bg-muted relative aspect-[4/3] overflow-hidden rounded-lg border"
            >
              {/* Vorschau aus der lokalen Datei, daher bewusst kein next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={entry.preview} alt="" className="size-full object-cover opacity-40" />
              <span className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="text-primary size-6 animate-spin" aria-hidden />
                <span className="sr-only">{t('uploading')}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-muted-foreground text-xs">
        {t('count', { count: images.length, max: MAX_IMAGES_PER_LISTING })}
      </p>
    </div>
  );
}
