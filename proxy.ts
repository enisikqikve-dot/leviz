import createMiddleware from 'next-intl/middleware';
import { routing } from '@/lib/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Greift auf allen Seitenpfaden, aber nicht auf API-Routen, Next-Interna
  // oder Dateien mit Endung. Der Punkt steht als [.] in der Zeichenklasse,
  // damit kein Escape noetig ist.
  matcher: ['/((?!api|_next|_vercel|.*[.].*).*)'],
};
