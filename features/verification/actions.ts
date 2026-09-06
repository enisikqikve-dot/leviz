'use server';

import { revalidatePath } from 'next/cache';

import { fail, fromZod, ok, type ActionResult } from '@/lib/action-result';
import { requireAdmin, requireUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { RATE_LIMITS, rateLimiter } from '@/lib/rate-limit';
import {
  DOCUMENT_EXTENSION, MAX_DOCUMENT_BYTES, validateDocument,
} from '@/lib/storage/document';
import { buildDocumentKey, putDocument, removeDocument } from '@/lib/storage/private-store';

import {
  REQUIRED_DOCUMENTS, reviewSchema, verificationSchema, type DocumentType,
} from './schemas';

/**
 * Nimmt einen Antrag auf Prüfung entgegen.
 *
 * Die Belege kommen in derselben Übertragung wie die Angaben, nicht vorab
 * einzeln. So entstehen keine Ausweiskopien im Speicher, zu denen es später
 * gar keinen Antrag gibt — bei Fahrzeugfotos wäre das gleichgültig, hier
 * nicht.
 */
export async function submitVerificationAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();

  const { limit, windowMs } = RATE_LIMITS.verification;
  const attempt = await rateLimiter.check(`verification:${user.id}`, limit, windowMs);
  if (!attempt.success) return fail('errorTooMany');

  const parsed = verificationSchema.safeParse({
    kind: formData.get('kind'),
    legalName: formData.get('legalName'),
    addressLine: formData.get('addressLine'),
    postalCode: formData.get('postalCode'),
    city: formData.get('city'),
    companyName: formData.get('companyName'),
    registrationNumber: formData.get('registrationNumber'),
  });
  if (!parsed.success) return fromZod(parsed.error.issues);

  const konto = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { dealer: { select: { id: true } } },
  });

  // Ein Händlerantrag ohne Händlerkonto ergäbe einen Nachweis über eine Firma,
  // die auf der Seite gar nicht auftritt.
  if (parsed.data.kind === 'DEALER' && !konto.dealer) return fail('errorNoDealer');

  const offen = await prisma.verificationRequest.count({
    where: { userId: user.id, status: 'PENDING' },
  });
  if (offen > 0) return fail('errorAlreadyPending');

  // Erst alle Belege prüfen, dann schreiben: bricht es beim dritten ab, sollen
  // die ersten beiden nicht schon auf der Platte liegen.
  const belege: {
    type: DocumentType;
    bytes: Uint8Array;
    mime: string;
    extension: string;
  }[] = [];

  for (const type of REQUIRED_DOCUMENTS[parsed.data.kind]) {
    const datei = formData.get(`document:${type}`);

    if (!(datei instanceof File) || datei.size === 0) return fail(`errorMissing.${type}`);
    if (datei.size > MAX_DOCUMENT_BYTES) return fail('errorTooLarge');

    const bytes = new Uint8Array(await datei.arrayBuffer());
    const geprueft = validateDocument(bytes);

    if (!geprueft.ok) return fail(`errorFile.${geprueft.error}`);

    belege.push({
      type,
      bytes,
      mime: geprueft.mime,
      extension: DOCUMENT_EXTENSION[geprueft.format],
    });
  }

  const geschrieben: string[] = [];

  try {
    const eintraege = belege.map((beleg) => {
      const key = buildDocumentKey(user.id, beleg.extension);
      geschrieben.push(key);

      return {
        key,
        bytes: beleg.bytes,
        row: {
          type: beleg.type,
          storageKey: key,
          contentType: beleg.mime,
          sizeBytes: beleg.bytes.byteLength,
        },
      };
    });

    for (const eintrag of eintraege) {
      await putDocument(eintrag.key, eintrag.bytes);
    }

    await prisma.$transaction([
      prisma.verificationRequest.create({
        data: {
          userId: user.id,
          kind: parsed.data.kind,
          legalName: parsed.data.legalName,
          addressLine: parsed.data.addressLine,
          postalCode: parsed.data.postalCode,
          city: parsed.data.city,
          companyName: parsed.data.companyName,
          registrationNumber: parsed.data.registrationNumber,
          documents: { create: eintraege.map((eintrag) => eintrag.row) },
        },
      }),
      prisma.user.update({ where: { id: user.id }, data: { verification: 'PENDING' } }),
      ...(parsed.data.kind === 'DEALER' && konto.dealer
        ? [
            prisma.dealer.update({
              where: { id: konto.dealer.id },
              data: { verification: 'PENDING' },
            }),
          ]
        : []),
    ]);
  } catch (error) {
    // Ohne dieses Aufräumen bliebe bei einem Fehler eine Ausweiskopie liegen,
    // auf die nichts mehr zeigt — und die deshalb auch nie gelöscht wird.
    for (const key of geschrieben) await removeDocument(key);
    throw error;
  }

  revalidatePath('/dashboard/verification');
  revalidatePath('/admin/verifications');
  return ok();
}

/** Entscheidet über einen Antrag. Nur für die Verwaltung. */
export async function reviewVerificationAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const antrag = await prisma.verificationRequest.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      userId: true,
      kind: true,
      status: true,
      companyName: true,
      user: { select: { dealer: { select: { id: true } } } },
    },
  });

  if (!antrag) return fail('errorNotFound');

  // Zwei Verwalter können denselben Antrag offen haben. Wer als Zweiter
  // klickt, soll die Entscheidung des Ersten nicht überschreiben.
  if (antrag.status !== 'PENDING') return fail('errorAlreadyDecided');

  const bestaetigt = parsed.data.decision === 'VERIFIED';
  const jetzt = new Date();

  await prisma.$transaction([
    prisma.verificationRequest.update({
      where: { id: antrag.id },
      data: {
        status: parsed.data.decision,
        note: parsed.data.note,
        reviewedById: admin.id,
        reviewedAt: jetzt,
      },
    }),
    prisma.user.update({
      where: { id: antrag.userId },
      data: {
        verification: parsed.data.decision,
        verifiedAt: bestaetigt ? jetzt : null,
      },
    }),
    ...(antrag.kind === 'DEALER' && antrag.user.dealer
      ? [
          prisma.dealer.update({
            where: { id: antrag.user.dealer.id },
            data: {
              verification: parsed.data.decision,
              verifiedAt: bestaetigt ? jetzt : null,
            },
          }),
        ]
      : []),
    prisma.notification.create({
      data: {
        userId: antrag.userId,
        type: bestaetigt ? 'IDENTITY_VERIFIED' : 'IDENTITY_REJECTED',
        title: bestaetigt ? 'Identiteti u verifikua' : 'Verifikimi nuk u pranua',
        // Bei einer Ablehnung steht der Grund in der Nachricht — sonst lädt
        // der Antragsteller dasselbe noch einmal hoch.
        body: parsed.data.note ?? antrag.companyName,
      },
    }),
  ]);

  revalidatePath('/admin/verifications');
  revalidatePath('/dashboard/verification');
  return ok();
}
