'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { fail, fromZod, ok, type ActionResult } from '@/lib/action-result';
import { requireAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { refreshRankScores } from '@/features/vehicles/rank';

/** Gibt ein Inserat frei, das in der Prüfung hing. */
export async function approveVehicleAction(vehicleId: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, sellerId: true, slug: true, title: true },
  });
  if (!vehicle) return fail('Kjo shpallje nuk u gjet');

  await prisma.$transaction([
    prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        status: 'ACTIVE',
        publishedAt: new Date(),
        moderatedAt: new Date(),
        moderatedById: admin.id,
        // Die Auffälligkeiten sind geprüft und damit erledigt.
        flaggedReason: null,
      },
    }),
    prisma.notification.create({
      data: {
        userId: vehicle.sellerId,
        type: 'LISTING_APPROVED',
        title: 'Shpallja u aprovua',
        body: vehicle.title,
        href: `/vetura/${vehicle.slug}`,
        data: { vehicleId: vehicle.id },
      },
    }),
  ]);

  revalidatePath('/admin/vehicles');
  return ok();
}

const rejectSchema = z.object({
  vehicleId: z.string().min(1),
  reason: z.string().trim().min(3, 'Bitte gib einen Grund an').max(500),
});

/** Lehnt ein Inserat ab. Der Verkäufer erfährt den Grund. */
export async function rejectVehicleAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = rejectSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: parsed.data.vehicleId },
    select: { id: true, sellerId: true, slug: true, title: true },
  });
  if (!vehicle) return fail('Kjo shpallje nuk u gjet');

  await prisma.$transaction([
    prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        status: 'REJECTED',
        moderatedAt: new Date(),
        moderatedById: admin.id,
        moderationNote: parsed.data.reason,
      },
    }),
    prisma.notification.create({
      data: {
        userId: vehicle.sellerId,
        type: 'LISTING_REJECTED',
        title: 'Shpallja u refuzua',
        body: parsed.data.reason,
        data: { vehicleId: vehicle.id },
      },
    }),
  ]);

  revalidatePath('/admin/vehicles');
  return ok();
}

const reportActionSchema = z.object({
  reportId: z.string().min(1),
  action: z.enum(['APPROVED', 'HIDDEN', 'DELETED', 'DISMISSED']),
  resolution: z.string().trim().max(500).optional().or(z.literal('')),
});

/**
 * Bearbeitet eine Meldung.
 *
 * `APPROVED` heißt: die Meldung war unbegründet, das Inserat bleibt. `HIDDEN`
 * nimmt das Fahrzeug aus der Suche, `DELETED` entfernt es ganz.
 */
export async function resolveReportAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = reportActionSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const report = await prisma.report.findUnique({
    where: { id: parsed.data.reportId },
    select: { id: true, vehicleId: true, vehicle: { select: { sellerId: true, title: true } } },
  });
  if (!report) return fail('Ky raportim nuk u gjet');

  const { action, resolution } = parsed.data;

  await prisma.report.update({
    where: { id: report.id },
    data: {
      status: action === 'DISMISSED' ? 'DISMISSED' : 'RESOLVED',
      action: action === 'DISMISSED' ? 'APPROVED' : action,
      handledById: admin.id,
      handledAt: new Date(),
      resolution: resolution || null,
    },
  });

  if (action === 'HIDDEN') {
    await prisma.vehicle.update({
      where: { id: report.vehicleId },
      data: { status: 'REJECTED', moderatedById: admin.id, moderatedAt: new Date() },
    });
  } else if (action === 'DELETED') {
    await prisma.vehicle.delete({ where: { id: report.vehicleId } });
  }

  revalidatePath('/admin/reports');
  return ok();
}

/** Setzt die Verifizierung eines Händlers. */
export async function setDealerVerificationAction(
  dealerId: string,
  verified: boolean,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const dealer = await prisma.dealer.findUnique({
    where: { id: dealerId },
    select: { id: true, userId: true, companyName: true },
  });
  if (!dealer) return fail('Ky autosallon nuk u gjet');

  await prisma.$transaction([
    prisma.dealer.update({
      where: { id: dealerId },
      data: {
        verification: verified ? 'VERIFIED' : 'UNVERIFIED',
        verifiedAt: verified ? new Date() : null,
      },
    }),
    prisma.dealerVerification.create({
      data: {
        dealerId,
        status: verified ? 'VERIFIED' : 'REJECTED',
        reviewedById: admin.id,
        reviewedAt: new Date(),
        documentUrls: [],
      },
    }),
    ...(verified
      ? [
          prisma.notification.create({
            data: {
              userId: dealer.userId,
              type: 'DEALER_VERIFIED' as const,
              title: 'Autosalloni u verifikua',
              body: dealer.companyName,
            },
          }),
        ]
      : []),
  ]);

  // Die Verifizierung fließt in die Reihung ein.
  const vehicles = await prisma.vehicle.findMany({
    where: { dealerId },
    select: { id: true },
  });
  await refreshRankScores(vehicles.map((vehicle) => vehicle.id));

  revalidatePath('/admin/dealers');
  return ok();
}

const suspendSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().min(3).max(500),
});

/** Sperrt einen Nutzer. Seine Inserate verschwinden aus der Suche. */
export async function suspendUserAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = suspendSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, role: true },
  });
  if (!target) return fail('Ky përdorues nuk u gjet');

  // Ein Administrator darf sich weder selbst noch andere Administratoren
  // aussperren — sonst lässt sich die Plattform versehentlich verriegeln.
  if (target.id === admin.id) return fail('Nuk mund të pezulloni veten');
  if (target.role === 'ADMIN' || target.role === 'SUPER_ADMIN') {
    return fail('Administratorët nuk mund të pezullohen');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: target.id },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspendedReason: parsed.data.reason,
      },
    }),
    // Sitzungen beenden, damit die Sperre sofort greift.
    prisma.session.deleteMany({ where: { userId: target.id } }),
    prisma.vehicle.updateMany({
      where: { sellerId: target.id, status: 'ACTIVE' },
      data: { status: 'PAUSED' },
    }),
  ]);

  revalidatePath('/admin/users');
  return ok();
}

/** Hebt eine Sperre auf. Inserate bleiben pausiert und müssen neu aktiviert werden. */
export async function unsuspendUserAction(userId: string): Promise<ActionResult> {
  await requireAdmin();

  const updated = await prisma.user.updateMany({
    where: { id: userId, status: 'SUSPENDED' },
    data: { status: 'ACTIVE', suspendedAt: null, suspendedReason: null },
  });

  if (updated.count === 0) return fail('Ky përdorues nuk u gjet');

  revalidatePath('/admin/users');
  return ok();
}

const settingsSchema = z.object({
  'currency.eurToAll': z.coerce.number().min(1).max(1000),
  'listing.defaultDurationDays': z.coerce.number().int().min(7).max(365),
  'moderation.suspiciousPriceFloorCents': z.coerce.number().int().min(0).max(10_000_000),
  'search.pageSize': z.coerce.number().int().min(6).max(96),
  'search.defaultRadiusKm': z.coerce.number().int().min(5).max(1000),
});

/**
 * Speichert die Plattform-Einstellungen.
 *
 * Diese Werte sind bewusst nicht im Code verdrahtet: ein neuer Euro-Lek-Kurs
 * oder eine andere Prüfschwelle darf keine Neuveröffentlichung erfordern.
 */
export async function saveSettingsAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  await prisma.$transaction(
    Object.entries(parsed.data).map(([key, value]) =>
      prisma.platformSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    ),
  );

  revalidatePath('/', 'layout');
  return ok();
}

/** Hebt eine Marke in den Filtern hervor oder nimmt sie zurück. */
export async function toggleBrandPopularAction(brandId: string): Promise<ActionResult> {
  await requireAdmin();

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { popular: true },
  });
  if (!brand) return fail('Kjo markë nuk u gjet');

  await prisma.brand.update({
    where: { id: brandId },
    data: { popular: !brand.popular },
  });

  revalidatePath('/admin/brands');
  return ok();
}

/** Grenzen und Preis eines Pakets. Alle Werte sind hier änderbar. */
const packageSchema = z.object({
  id: z.string().min(1),
  priceCents: z.number().int().min(0).max(10_000_00),
  // `null` bedeutet unbegrenzt; das gilt nur für die oberste Händlerstufe.
  listingLimit: z.number().int().min(1).max(100_000).nullable(),
  listingDurationDays: z.number().int().min(1).max(365),
  photoLimit: z.number().int().min(1).max(100),
  featuredScore: z.number().int().min(0).max(100),
  featuredDays: z.number().int().min(0).max(365),
  active: z.boolean(),
});

/**
 * Speichert ein Paket.
 *
 * Preise gehören in die Datenbank, nicht in den Code: eine Preisänderung darf
 * keine Neuveröffentlichung der Anwendung verlangen.
 */
export async function savePackageAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = packageSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const { id, ...values } = parsed.data;

  const existing = await prisma.package.findUnique({
    where: { id },
    select: { tier: true },
  });
  if (!existing) return fail('Kjo pako nuk u gjet');

  // Die kostenlose Stufe ist die Rückfallebene für jedes Konto ohne Abo. Ein
  // Preis darauf oder ein Abschalten würde neue Nutzer aussperren.
  if (existing.tier === 'FREE' && (values.priceCents > 0 || !values.active)) {
    return fail('Pakoja falas nuk mund të ketë çmim dhe nuk mund të çaktivizohet');
  }

  await prisma.package.update({ where: { id }, data: values });

  revalidatePath('/admin/packages');
  revalidatePath('/pricing');
  return ok();
}

/**
 * Schickt einem Konto den Link zum Zuruecksetzen des Passworts.
 *
 * Das ist die ehrliche Antwort auf "ich komme nicht mehr rein". Das Passwort
 * selbst kann niemand nachschlagen -- in der Datenbank steht ein Argon2id-Hash,
 * eine Einbahnstrasse. Und das soll so bleiben: wird die Datenbank je
 * gestohlen, sind die Passwoerter der Kunden trotzdem sicher.
 *
 * Der Verwalter setzt auch kein neues. Sonst kennte er es, koennte sich als
 * der Nutzer anmelden, und niemand koennte spaeter unterscheiden, wer
 * gehandelt hat. Der Nutzer waehlt es selbst, ueber einen Link, der eine
 * Stunde gilt.
 */
export async function sendPasswordResetForUserAction(
  userId: string,
): Promise<ActionResult> {
  await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, locale: true },
  });

  if (!user) return fail('Ky perdorues nuk u gjet');
  if (!user.email) return fail('errorNoEmail');

  const { randomBytes, createHash } = await import('node:crypto');
  const token = randomBytes(32).toString('base64url');

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    },
  });

  const locale = (user.locale as 'sq' | 'de' | 'en') ?? 'sq';
  const prefix = locale === 'sq' ? '' : `/${locale}`;
  const path =
    locale === 'sq'
      ? '/rivendos-fjalekalimin'
      : locale === 'de'
        ? '/passwort-zuruecksetzen'
        : '/reset-password';

  const { passwordResetEmail } = await import('@/lib/email/templates');
  const { sendEmail, EMAIL_FROM } = await import('@/lib/email');
  const { siteConfig } = await import('@/lib/site');

  const template = passwordResetEmail(
    locale,
    `${siteConfig.url}${prefix}${path}?token=${token}`,
  );

  await sendEmail({
    to: user.email,
    subject: template.subject,
    text: template.text,
    replyTo: EMAIL_FROM,
  });

  return ok();
}
