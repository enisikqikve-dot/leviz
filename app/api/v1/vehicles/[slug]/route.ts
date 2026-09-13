import { isFavorite } from '@/features/favorites/core';
import { estimateForVehicle } from '@/features/pricing/queries';
import { getSimilarVehicles, getVehicleBySlug, recordView } from '@/features/vehicles/queries';
import { getApiUser } from '@/lib/api/auth';
import { handle, notFound, ok } from '@/lib/api/respond';

/**
 * GET /api/v1/vehicles/{slug}
 *
 * Die Fahrzeugseite als Daten: Fahrzeug, Verkaeufer, aehnliche Fahrzeuge,
 * Marktpreis-Einschaetzung. Mit Bearer-Token zusaetzlich, ob es gemerkt ist.
 *
 * Nur oeffentliche Inserate. Ein Entwurf oder ein gesperrtes Inserat ist von
 * aussen nicht da -- auch nicht fuer den, der die Adresse kennt.
 */
export const GET = handle(async (request, { params }) => {
  const { slug } = await params;

  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle || (vehicle.status !== 'ACTIVE' && vehicle.status !== 'SOLD')) {
    throw notFound('vehicle');
  }

  const user = await getApiUser(request);

  const [similar, estimate, favorited] = await Promise.all([
    getSimilarVehicles(vehicle),
    estimateForVehicle({
      brandId: vehicle.brandId,
      modelId: vehicle.modelId,
      year: vehicle.firstRegistration ? vehicle.firstRegistration.getFullYear() : null,
      mileageKm: vehicle.mileageKm,
      fuel: vehicle.fuel,
      bodyType: vehicle.bodyType,
      excludeVehicleId: vehicle.id,
    }),
    user ? isFavorite(user.id, vehicle.id) : Promise.resolve(false),
  ]);

  // Ein Aufruf zaehlt als Ansicht -- wie auf der Website.
  void recordView({ vehicleId: vehicle.id, userId: user?.id ?? null });

  return ok({ vehicle, similar, estimate, favorited });
});
