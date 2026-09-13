import { NextResponse } from 'next/server';

/**
 * https://levizz.com/.well-known/apple-app-site-association
 *
 * Damit oeffnet iOS einen Link auf levizz.com in der App statt im Browser
 * (Universal Links). Apple holt die Datei beim Installieren der App und
 * prueft: JSON, ohne Endung, ohne Umleitung, ueber HTTPS. next.config.ts
 * leitet den Pfad hierher um.
 *
 * Gebraucht wird die Team-ID des Apple-Entwicklerkontos (zehn Zeichen). Ohne
 * sie gibt es keine halbe Datei, sondern 404 -- eine falsche Datei wuerde
 * Apple fuer Stunden zwischenspeichern.
 */
export const dynamic = 'force-static';

export function GET(): NextResponse {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  if (!teamId) {
    return NextResponse.json({ error: 'not-configured', hint: 'APPLE_TEAM_ID setzen' }, { status: 404 });
  }

  const appId = `${teamId}.com.levizz.app`;

  return NextResponse.json(
    {
      applinks: {
        // Alles, was die App kennt: Fahrzeuge in drei Sprachen, Merkliste,
        // Suche, Inserate. Was sie nicht kennt, zeigt sie selbst per
        // Weiterleitung auf die Website -- deshalb duerfen alle Pfade rein,
        // bis auf die Anmeldung, die im Browser bleiben soll.
        details: [
          {
            appIDs: [appId],
            components: [
              { '/': '/hyr*', exclude: true },
              { '/': '/anmelden*', exclude: true },
              { '/': '/login*', exclude: true },
              { '/': '/api/*', exclude: true },
              { '/': '/*' },
            ],
          },
        ],
      },
      webcredentials: { apps: [appId] },
    },
    { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' } },
  );
}
