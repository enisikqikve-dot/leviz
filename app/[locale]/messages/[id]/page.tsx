import type { Metadata } from 'next';
import { ArrowLeft, Ban } from 'lucide-react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { markConversationReadAction } from '@/features/messages/actions';
import { MessageComposer } from '@/features/messages/components/composer';
import { getConversation } from '@/features/messages/queries';
import { getEurToAllRate } from '@/features/search/data';
import { requireUser } from '@/lib/auth/guards';
import { formatPrice } from '@/lib/currency';
import { getCurrency } from '@/lib/currency-server';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

type PageProps = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'messages' });
  return { title: t('title'), robots: { index: false } };
}

export default async function ConversationPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await requireUser();
  const conversation = await getConversation(id, user.id);
  if (!conversation) notFound();

  const t = await getTranslations('messages');
  const [currency, eurToAll] = await Promise.all([getCurrency(), getEurToAllRate()]);

  // Das Öffnen zählt als gelesen.
  void markConversationReadAction(id);

  const time = new Intl.DateTimeFormat(locale === 'sq' ? 'sq-AL' : locale, {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const blocked = conversation.status === 'BLOCKED';

  return (
    <div className="lv-container max-w-3xl py-6 sm:py-10">
      <Link
        href="/messages"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('title')}
      </Link>

      {/* Der Fahrzeugbezug steht immer sichtbar über dem Gespräch. */}
      <Link
        href={{ pathname: '/vehicle/[slug]', params: { slug: conversation.vehicle.slug } }}
        className="bg-card hover:shadow-card mt-4 flex items-center gap-4 rounded-xl border p-4 transition-shadow"
      >
        <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-lg">
          {conversation.vehicle.images[0] ? (
            <Image
              src={conversation.vehicle.images[0].url}
              alt=""
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs">{t('aboutVehicle')}</p>
          <p className="truncate font-semibold">
            {conversation.vehicle.brand.name} {conversation.vehicle.model.name}
          </p>
          <p className="text-sm">
            {formatPrice(conversation.vehicle.priceCents, {
              currency, locale: locale as Locale, eurToAll,
            })}
            {conversation.vehicle.status === 'SOLD' ? ` · ${t('sold')}` : ''}
          </p>
        </div>
      </Link>

      <h1 className="mt-6 text-lg font-semibold">{conversation.counterpartName}</h1>

      <div className="bg-card mt-3 overflow-hidden rounded-xl border">
        <ul className="max-h-[55vh] space-y-3 overflow-y-auto p-4">
          {conversation.messages.map((message) => {
            const mine = message.senderId === user.id;

            return (
              <li key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5',
                    mine
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md',
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                  <p
                    className={cn(
                      'mt-1 text-[11px]',
                      mine ? 'text-primary-foreground/70' : 'text-muted-foreground',
                    )}
                  >
                    {time.format(message.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        {blocked ? (
          <p className="text-muted-foreground border-t p-4 text-center text-sm">
            <Ban className="me-1.5 inline size-4 align-[-3px]" aria-hidden />
            {t('blocked')}
          </p>
        ) : (
          <MessageComposer conversationId={conversation.id} />
        )}
      </div>
    </div>
  );
}
