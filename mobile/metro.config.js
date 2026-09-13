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

const { getDefaultConfig } = require('expo/metro-config');

const projekt = __dirname;
const wurzel = path.resolve(__dirname, '..');

const config = getDefaultConfig(projekt);

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
