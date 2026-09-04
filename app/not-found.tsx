import { Inter } from 'next/font/google';
import Link from 'next/link';

import './globals.css';

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter', display: 'swap' });

/**
 * Auffangseite für Adressen außerhalb des Sprachroutings. Sie rendert eigene
 * `<html>`/`<body>`-Elemente, weil das Layout auf oberster Ebene bewusst nur
 * durchreicht.
 */
export default function GlobalNotFound() {
  return (
    <html lang="sq" className={inter.variable}>
      <body className="bg-background text-foreground font-sans antialiased">
        <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
          <svg viewBox="0 0 48 48" className="size-14" role="img" aria-label="LEVIZ">
            <rect width="48" height="48" rx="12" fill="#2F5BFF" />
            <g fill="#FFFFFF">
              <path
                d="M0 0 H16 L28 46 L40 0 H56 L34 72 H22 Z"
                transform="translate(10 12) scale(0.5)"
              />
              <path
                d="M0 0 H16 L28 46 L40 0 H56 L34 72 H22 Z"
                transform="translate(10 4) scale(0.5)"
                opacity="0.35"
              />
            </g>
          </svg>
          <p className="mt-8 text-sm font-semibold text-[#2F5BFF]">404</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Kjo faqe nuk u gjet
          </h1>
          <Link
            href="/"
            className="mt-8 rounded-lg bg-[#2F5BFF] px-6 py-3 text-sm font-medium text-white"
          >
            LEVIZ
          </Link>
        </div>
      </body>
    </html>
  );
}
