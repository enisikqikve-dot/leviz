'use server';

import { revalidatePath } from 'next/cache';

import { getLocale } from 'next-intl/server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { getPathname } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { getPaymentProvider, signWebhookPayload } from '@/lib/payments';
import { siteConfig } from '@/lib/site';

/**
 * Wohin der Browser nach dem Start der Zahlung geht.
 *
 * Der Mock-Anbieter bezahlt auf einer eigenen Seite, deren Pfad je Sprache
 * uebersetzt ist — deshalb reicht die Kennung, nicht die fertige Adresse.
 * Ein echter Anbieter schickt eine vollstaendige, fremde Adresse.
 */
export type CheckoutTarget =
  | { kind: 'internal'; paymentId: string }
  /**
   * `fields` gesetzt heisst: die Bezahlseite erwartet ein abgeschicktes
   * Formular, keinen blossen Aufruf. So arbeiten die gehosteten Seiten der
   * Banken — Betrag, Rueckkehradressen und Pruefsumme gehoeren nicht in eine
   * Adresszeile, wo sie im Verlauf und in Serverprotokollen landen.
   */
  | { kind: 'external'; url: string; fields?: Record<string, string> };

/**
 * Startet eine Zahlung.
 *
 * Der Betrag kommt immer aus der Datenbank, nie aus dem Formular — sonst
 * koennte der Browser den Preis bestimmen. Gewaehrt wird erst nach dem
 * signierten Rueckruf des Anbieters.
 */
async function startCheckout(
  userId: string,
  packageId: string,
  vehicleId: string | null,
  description: string,
): Promise<ActionResult<CheckoutTarget>> {
  const pkg = await prisma.package.findFirst({
    where: { id: packageId, active: true },
    select: { id: true, priceCents: true, nameSq: true },
  });
  if (!pkg) return fail('Kjo pako nuk u gjet');
  if (pkg.priceCents <= 0) return fail('Kjo pako nuk kërkon pagesë');

  const payment = await prisma.payment.create({
    data: {
      userId,
      packageId: pkg.id,
      vehicleId,
      amountCents: pkg.priceCents,
      currency: 'EUR',
      status: 'PENDING',
      description,
      provider: getPaymentProvider().name,
    },
    select: { id: true },
  });

  // Die Rueckkehradressen entstehen hier, weil nur der Server die eigene
  // Domäne kennt und die Pfade je Sprache verschieden heissen.
  const locale = await getLocale();
  const absolute = (href: '/dashboard/billing' | '/pricing') =>
    `${siteConfig.url}${getPathname({ href, locale: locale as Locale })}`;

  const session = await getPaymentProvider().createCheckout({
    paymentId: payment.id,
    amountCents: pkg.priceCents,
    currency: 'EUR',
    description,
    successUrl: absolute('/dashboard/billing'),
    cancelUrl: absolute('/pricing'),
    locale,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerPaymentId: session.providerPaymentId, provider: session.provider },
  });

  return ok(
    session.url.startsWith('/')
      ? { kind: 'internal', paymentId: payment.id }
      : { kind: 'external', url: session.url, fields: session.fields },
  );
}

/** Bucht ein Paket fuer das eigene Konto. */
export async function startPackageCheckoutAction(
  packageId: string,
): Promise<ActionResult<CheckoutTarget>> {
  const user = await requireUser();

  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    select: { nameSq: true },
  });

  return startCheckout(user.id, packageId, null, `Pako: ${pkg?.nameSq ?? packageId}`);
}

/** Bucht eine Hervorhebung fuer ein eigenes Inserat. */
export async function startFeatureCheckoutAction(
  vehicleId: string,
  packageId: string,
): Promise<ActionResult<CheckoutTarget>> {
  const user = await requireUser();

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, title: true, sellerId: true, status: true },
  });
  if (!vehicle) return fail('Kjo shpallje nuk u gjet');

  // Hervorheben darf nur, wem das Inserat gehoert.
  if (vehicle.sellerId !== user.id) return fail('Kjo shpallje nuk të përket');

  // Ein pausiertes oder abgelehntes Inserat wuerde trotz Bezahlung nicht erscheinen.
  if (vehicle.status !== 'ACTIVE') return fail('Vetëm shpalljet aktive mund të theksohen');

  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    select: { featuredDays: true, isDealerPackage: true },
  });
  if (!pkg || pkg.featuredDays <= 0) return fail('Kjo pako nuk ofron theksim');

  return startCheckout(user.id, packageId, vehicle.id, `Theksim: ${vehicle.title}`);
}

/**
 * Schliesst eine Zahlung des Mock-Anbieters ab.
 *
 * Der Rueckruf geht ueber dieselbe Route wie beim echten Anbieter, mit echter
 * Signatur. Dadurch ist der Weg, ueber den spaeter Stripe Geld bestaetigt,
 * schon jetzt in Benutzung — und nicht erst am Tag der Umstellung.
 */
export async function confirmMockPaymentAction(
  paymentId: string,
  outcome: 'SUCCEEDED' | 'FAILED',
): Promise<ActionResult> {
  const user = await requireUser();

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, userId: true, status: true, provider: true },
  });
  if (!payment || payment.userId !== user.id) return fail('Kjo pagesë nuk u gjet');
  if (payment.provider !== 'mock') return fail('Kjo pagesë nuk kryhet këtu');
  if (payment.status !== 'PENDING') return fail('Kjo pagesë është kryer tashmë');

  const body = JSON.stringify({
    paymentId: payment.id,
    providerPaymentId: `mock_${payment.id}`,
    status: outcome,
    ...(outcome === 'FAILED' ? { failureReason: 'Pagesa u anulua nga përdoruesi' } : {}),
  });

  const response = await fetch(`${siteConfig.url}/api/webhooks/payments`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-leviz-signature': signWebhookPayload(body),
    },
    body,
    cache: 'no-store',
  });

  if (!response.ok) return fail('Pagesa nuk u konfirmua');

  revalidatePath('/dashboard/billing');
  revalidatePath('/dashboard/listings');
  revalidatePath('/pricing');

  return ok();
}

/**
 * Kuendigt das laufende Abo zum Periodenende.
 *
 * Sofortiges Beenden waere gegenueber jemandem, der bereits bezahlt hat,
 * nicht angemessen.
 */
export async function cancelSubscriptionAction(): Promise<ActionResult> {
  const user = await requireUser();

  const subscription = await prisma.subscription.findFirst({
    where: { userId: user.id, status: { in: ['ACTIVE', 'TRIALING'] } },
    orderBy: { currentPeriodStart: 'desc' },
    select: { id: true },
  });
  if (!subscription) return fail('Nuk ke pako aktive');

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: true, canceledAt: new Date() },
  });

  revalidatePath('/dashboard/billing');
  return ok();
}

/** Nimmt eine Kuendigung zurueck, solange die Periode noch laeuft. */
export async function resumeSubscriptionAction(): Promise<ActionResult> {
  const user = await requireUser();

  const subscription = await prisma.subscription.findFirst({
    where: { userId: user.id, status: { in: ['ACTIVE', 'TRIALING'] }, cancelAtPeriodEnd: true },
    orderBy: { currentPeriodStart: 'desc' },
    select: { id: true, currentPeriodEnd: true },
  });
  if (!subscription) return fail('Nuk ka anulim për të tërhequr');
  if (subscription.currentPeriodEnd <= new Date()) return fail('Periudha ka skaduar');

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: false, canceledAt: null },
  });

  revalidatePath('/dashboard/billing');
  return ok();
}
