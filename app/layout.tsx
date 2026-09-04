import type { ReactNode } from 'react';

/**
 * Sämtliche Seiten liegen unter `app/[locale]`, das die eigentliche Wurzel mit
 * `<html>` und `<body>` rendert. Dieses Layout existiert nur, weil Next.js für
 * die sprachunabhängige `not-found.tsx` ein Layout auf oberster Ebene verlangt.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
