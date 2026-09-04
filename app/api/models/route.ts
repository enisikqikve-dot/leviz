import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

/** Modelle einer Marke für den Inserat-Assistenten. */
export async function GET(request: Request) {
  const brand = new URL(request.url).searchParams.get('brand');
  if (!brand) return NextResponse.json([]);

  const models = await prisma.model.findMany({
    where: { brand: { slug: brand } },
    select: { slug: true, name: true },
    orderBy: [{ popular: 'desc' }, { name: 'asc' }],
  });

  return NextResponse.json(models, {
    // Stammdaten ändern sich selten; eine Stunde Zwischenspeicher genügt.
    headers: { 'cache-control': 'public, max-age=3600, stale-while-revalidate=86400' },
  });
}
