import type { Metadata } from 'next';
import { MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { getConversations } from '@/features/messages/queries';
import { getEurToAllRate } from '@/features/search/data';
import { daysSince } from '@/features/vehicles/format';
import { requireUser } from '@/lib/auth/guards';
import { formatPrice } from '@/lib/currency';
import { getCurrency } from '@/lib/currency-server';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'messages' });
  return { title: t('title'), robots: { index: false } };
}

export default async function MessagesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireUser();
  const t = await getTranslations('messages');
  const tv = await getTranslations('vehicles');

  const [conversations, currency, eurToAll] = await Promise.all([
    getConversations(user.id),
    getCurrency(),
    getEurToAllRate(),
  ]);

  const unread = conversations.filter((entry) => entry.unread).length;

  return (
    <div className="lv-container py-8 sm:py-12">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
        {unread > 0 ? (
          <p className="text-primary text-sm font-medium">{t('unread', { count: unread })}</p>
        ) : null}
      </header>

      {conversations.length === 0 ? (
        <div className="bg-surface mt-8 flex flex-col items-center rounded-xl border px-6 py-20 text-center">
          <span className="bg-muted text-muted-foreground inline-flex size-14 items-center justify-center rounded-full">
            <MessageSquare className="size-7" aria-hidden />
          </span>
          <h2 className="mt-6 text-lg font-semibold">{t('empty')}</h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">{t('emptyHint')}</p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/search">{t('browse')}</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-8 space-y-2">
          {conversations.map((conversation) => {
            const age = conversation.lastMessage
              ? daysSince(conversation.lastMessage.createdAt)
              : null;

            return (
              <li key={conversation.id}>
                <Link
                  href={{ pathname: '/messages/[id]', params: { id: conversation.id } }}
                  className={cn(
                    'bg-card hover:shadow-card-hover flex items-center gap-4 rounded-xl border p-4 transition-shadow',
                    conversation.unread && 'border-primary/40 bg-primary/[0.03]',
                  )}
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
                    <div className="flex items-center gap-2">
                      <p className={cn('truncate', conversation.unread && 'font-semibold')}>
                        {conversation.counterpartName}
                      </p>
                      {conversation.unread ? (
                        <span className="bg-primary size-2 shrink-0 rounded-full" aria-hidden />
                      ) : null}
                    </div>

                    <p className="text-muted-foreground truncate text-sm">
                      {conversation.vehicle.brand.name} {conversation.vehicle.model.name}
                      {conversation.vehicle.status === 'SOLD' ? ` · ${t('sold')}` : ''}
                    </p>

                    {conversation.lastMessage ? (
                      <p className="text-muted-foreground mt-1 truncate text-sm">
                        {conversation.lastMessage.senderId === user.id ? `${t('you')}: ` : ''}
                        {conversation.lastMessage.body}
                      </p>
                    ) : null}
                  </div>

                  <div className="hidden shrink-0 text-end sm:block">
                    <p className="text-sm font-semibold whitespace-nowrap">
                      {formatPrice(conversation.vehicle.priceCents, {
                        currency, locale: locale as Locale, eurToAll,
                      })}
                    </p>
                    {age !== null ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {age === 0
                          ? tv('listedToday')
                          : age === 1
                            ? tv('listedYesterday')
                            : tv('listedDaysAgo', { days: age })}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
