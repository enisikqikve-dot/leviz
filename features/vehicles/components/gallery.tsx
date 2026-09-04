'use client';

import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export type GalleryImage = {
  id: string;
  url: string;
  altText: string | null;
};

/** Ab dieser Wischstrecke gilt die Geste als Blättern und nicht als Wackeln. */
const SWIPE_THRESHOLD = 48;

export function VehicleGallery({
  images,
  title,
}: {
  images: GalleryImage[];
  title: string;
}) {
  const t = useTranslations('vehicleDetail');
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const count = images.length;

  const go = useCallback(
    (direction: 1 | -1) => {
      if (count === 0) return;
      setIndex((current) => (current + direction + count) % count);
    },
    [count],
  );

  // Pfeiltasten blättern, Escape schließt das Vollbild.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') go(1);
      else if (event.key === 'ArrowLeft') go(-1);
      else if (event.key === 'Escape' && fullscreen) setFullscreen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, fullscreen]);

  // Das aktive Vorschaubild in den sichtbaren Bereich holen.
  useEffect(() => {
    const active = thumbRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [index]);

  if (count === 0) {
    return (
      <div className="bg-muted text-muted-foreground flex aspect-[4/3] items-center justify-center rounded-xl">
        {t('noImages')}
      </div>
    );
  }

  const current = images[index];

  const stage = (
    <div
      className="relative h-full w-full"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        const end = event.changedTouches[0]?.clientX;
        if (start === null || end === undefined) return;
        const delta = end - start;
        if (Math.abs(delta) > SWIPE_THRESHOLD) go(delta < 0 ? 1 : -1);
        touchStartX.current = null;
      }}
    >
      <Image
        key={current.id}
        src={current.url}
        alt={current.altText ?? `${title} — ${index + 1}/${count}`}
        fill
        priority={index === 0}
        sizes="(max-width: 1024px) 100vw, 62vw"
        className={cn('object-cover', fullscreen && 'object-contain')}
      />

      {count > 1 ? (
        <>
          <button
            type="button" onClick={() => go(-1)} aria-label={t('previousImage')}
            className="absolute start-3 top-1/2 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button" onClick={() => go(1)} aria-label={t('nextImage')}
            className="absolute end-3 top-1/2 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </>
      ) : null}

      <span
        className="absolute bottom-3 end-3 z-10 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm"
        aria-live="polite"
      >
        {index + 1} / {count}
      </span>
    </div>
  );

  return (
    <div>
      <div className="bg-muted relative aspect-[4/3] overflow-hidden rounded-xl sm:aspect-[16/10]">
        {stage}
        <button
          type="button" onClick={() => setFullscreen(true)} aria-label={t('fullscreen')}
          className="absolute start-3 top-3 z-10 inline-flex size-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
        >
          <Expand className="size-4" aria-hidden />
        </button>
      </div>

      {count > 1 ? (
        <div
          ref={thumbRef}
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label={t('imageList')}
        >
          {images.map((image, position) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={position === index}
              data-active={position === index}
              onClick={() => setIndex(position)}
              className={cn(
                'relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                position === index ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      {fullscreen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('fullscreen')}
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
        >
          <div className="flex justify-end p-4">
            <button
              type="button" onClick={() => setFullscreen(false)} aria-label={t('close')}
              className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="relative flex-1">{stage}</div>
        </div>
      ) : null}
    </div>
  );
}
