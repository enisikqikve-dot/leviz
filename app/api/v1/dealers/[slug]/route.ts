import { getDealerBySlug } from '@/features/dealers/queries';
import { handle, notFound, ok } from '@/lib/api/respond';

/**
 * GET /api/v1/dealers/{slug} -> das Haendlerprofil: Kontakt, Oeffnungszeiten,
 * Bewertungen, Bestandszahl. Den Bestand selbst liefert
 * GET /vehicles?dealer={slug} -- dieselbe Liste wie die Suche, seitenweise.
 */
export const GET = handle(async (_request, { params }) => {
  const { slug } = await params;

  const dealer = await getDealerBySlug(slug);
  if (!dealer) throw notFound('dealer');

  return ok({
    id: dealer.id,
    slug: dealer.slug,
    companyName: dealer.companyName,
    description: dealer.description,
    logoUrl: dealer.logoUrl,
    coverUrl: dealer.coverUrl,
    website: dealer.website,
    phone: dealer.phone,
    publicEmail: dealer.publicEmail,
    addressLine: dealer.addressLine,
    postalCode: dealer.postalCode,
    lat: dealer.lat,
    lng: dealer.lng,
    city: dealer.city ? { name: dealer.city.name, slug: dealer.city.slug } : null,
    country: dealer.country,
    openingHours: dealer.openingHours,
    verified: dealer.verification === 'VERIFIED',
    verifiedAt: dealer.verifiedAt,
    ratingAvg: dealer.ratingAvg,
    ratingCount: dealer.ratingCount,
    vehicleCount: dealer._count.vehicles,
    memberSince: dealer.user.createdAt,
    reviews: dealer.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      verified: r.verified,
      createdAt: r.createdAt,
      author: { name: r.author.name, image: r.author.image },
    })),
  });
});
