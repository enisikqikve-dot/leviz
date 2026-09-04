// Next.js liest .env von selbst ein, Vitest nicht. Ohne diese Zeile fehlt den
// Integrationstests die DATABASE_URL.
import 'dotenv/config';

import '@testing-library/jest-dom/vitest';
