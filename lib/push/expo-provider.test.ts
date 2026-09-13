import { describe, expect, it, vi } from 'vitest';

import { ExpoPushProvider } from './expo-provider';

/**
 * Der Expo-Anbieter gegen ein nachgestelltes fetch: Stueckelung, Kopfzeilen,
 * und wie aus Antworten Tickets und Quittungen werden.
 */
function antwort(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('ExpoPushProvider', () => {
  it('schickt hoechstens 100 Nachrichten je Anfrage und traegt das Zugriffs-Token', async () => {
    const aufrufe: { url: string; body: unknown[]; auth: string | null }[] = [];
    const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as unknown[];
      aufrufe.push({ url: String(url), body, auth: new Headers(init?.headers).get('authorization') });
      return antwort(200, { data: body.map((_, i) => ({ status: 'ok', id: `t-${aufrufe.length}-${i}` })) });
    });

    const provider = new ExpoPushProvider('geheim', fetchFn as unknown as typeof fetch);
    const nachrichten = Array.from({ length: 150 }, (_, i) => ({ to: `ExponentPushToken[${i}]`, title: 'Hallo' }));
    const tickets = await provider.send(nachrichten);

    expect(aufrufe).toHaveLength(2);
    expect(aufrufe[0].body).toHaveLength(100);
    expect(aufrufe[1].body).toHaveLength(50);
    expect(aufrufe[0].auth).toBe('Bearer geheim');
    expect(aufrufe[0].url).toBe('https://exp.host/--/api/v2/push/send');
    expect(tickets).toHaveLength(150);
    expect(tickets.every((t) => t.ok)).toBe(true);
    expect(tickets[0]).toEqual({ to: 'ExponentPushToken[0]', ok: true, ticketId: 't-1-0' });
    expect(tickets[149]).toEqual({ to: 'ExponentPushToken[149]', ok: true, ticketId: 't-2-49' });
  });

  it('haengt Klang und Kanal an und reicht data durch', async () => {
    let gesendet: Record<string, unknown>[] = [];
    const fetchFn = vi.fn(async (_url: unknown, init?: RequestInit) => {
      gesendet = JSON.parse(String(init?.body));
      return antwort(200, { data: [{ status: 'ok', id: 'x' }] });
    });
    await new ExpoPushProvider(undefined, fetchFn as unknown as typeof fetch).send([
      { to: 'ExponentPushToken[a]', title: 'Mesazh i ri', body: 'Përshëndetje', data: { href: '/mesazhet/1', notificationId: 'n1' } },
    ]);
    expect(gesendet[0]).toMatchObject({
      to: 'ExponentPushToken[a]', title: 'Mesazh i ri', body: 'Përshëndetje',
      data: { href: '/mesazhet/1', notificationId: 'n1' }, sound: 'default', channelId: 'default',
    });
  });

  it('ordnet Fehler je Nachricht zu -- DeviceNotRegistered bleibt erkennbar', async () => {
    const fetchFn = vi.fn(async () =>
      antwort(200, {
        data: [
          { status: 'ok', id: 't1' },
          { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } },
          { status: 'error', message: 'kaputt', details: { error: 'IrgendwasNeues' } },
        ],
      }),
    );
    const tickets = await new ExpoPushProvider(undefined, fetchFn as unknown as typeof fetch).send([
      { to: 'a', title: 'x' }, { to: 'b', title: 'x' }, { to: 'c', title: 'x' },
    ]);
    expect(tickets[0]).toEqual({ to: 'a', ok: true, ticketId: 't1' });
    expect(tickets[1]).toEqual({ to: 'b', ok: false, error: 'DeviceNotRegistered', message: 'not registered' });
    expect(tickets[2]).toEqual({ to: 'c', ok: false, error: 'unknown', message: 'kaputt' });
  });

  it('macht aus einem abgelehnten Aufruf keine toten Geraete', async () => {
    const fetchFn = vi.fn(async () => antwort(401, { errors: [{ code: 'UNAUTHORIZED', message: 'bad token' }] }));
    const tickets = await new ExpoPushProvider('falsch', fetchFn as unknown as typeof fetch).send([{ to: 'a', title: 'x' }]);
    expect(tickets[0]).toEqual({ to: 'a', ok: false, error: 'InvalidCredentials', message: 'bad token' });
  });

  it('liest Quittungen und laesst fehlende fuer spaeter', async () => {
    const fetchFn = vi.fn(async () =>
      antwort(200, {
        data: {
          t1: { status: 'ok' },
          t2: { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
        },
      }),
    );
    const quittungen = await new ExpoPushProvider(undefined, fetchFn as unknown as typeof fetch).receipts(['t1', 't2', 't3']);
    expect(quittungen).toEqual([
      { ticketId: 't1', ok: true },
      { ticketId: 't2', ok: false, error: 'DeviceNotRegistered', message: 'gone' },
    ]);
  });
});
