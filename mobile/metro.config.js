/**
 * Metro sieht das Hauptprojekt.
 *
 * Der ganze Grund fuer Expo statt Flutter: die App teilt Code mit der Website.
 * Importe mit `@/` zeigen auf die Wurzel des Repositories -- dieselben
 * Aufzaehlungen, dieselbe Preisformatierung, dieselben 1 256 Texte je Sprache.
 * Was sich dort aendert, aendert sich hier mit; nichts wird abgeschrieben.
 *
 * Geteilt werden nur reine Module (zod, JSON, Formatierung). Was Next.js
 * importiert, laesst sich hier nicht laden -- Metro sagt es dann laut.
 */
const path = require('node:path');

const { getPostHogExpoConfig } = require('posthog-react-native/metro');

const projekt = __dirname;
const wurzel = path.resolve(__dirname, '..');

// Die Standardkonfiguration von Expo, plus die Metro-Erweiterung von PostHog:
// sie erzeugt beim Bauen Source Maps mit Kennung, damit ein Absturzbericht
// die echte Zeile zeigt und nicht Zeile 1 von 40 000. Nur beim Bauen auf EAS
// -- in der Entwicklung kostet sie nur Zeit.
const config = getPostHogExpoConfig(projekt, { enabled: process.env.EAS_BUILD === 'true' });

config.watchFolders = [wurzel];

// Abhaengigkeiten zuerst aus mobile/, sonst aus der Wurzel (z. B. zod fuer
// die geteilten Schemas).
config.resolver.nodeModulesPaths = [
  path.join(projekt, 'node_modules'),
  path.join(wurzel, 'node_modules'),
];

// Das Hauptprojekt traegt Ordner, die die App nie braucht und die Metro
// beim Beobachten nur Zeit kosten.
config.resolver.blockList = [
  /[\/]\.next[\/]/,
  /[\/]\.postgres[\/]/,
  /[\/]public[\/]uploads[\/]/,
  /[\/]var[\/]/,
  /[\/]e2e[\/]/,
];

const standard = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    return context.resolveRequest(
      context,
      path.join(wurzel, moduleName.slice(2)),
      platform,
    );
  }
  return (standard ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
