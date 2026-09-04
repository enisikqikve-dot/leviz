import type { VehicleDetail } from '@/features/vehicles/queries';
import { kwToHp } from '@/features/vehicles/format';
import { siteConfig } from '@/lib/site';

/** Übersetzung der internen Werte in die Begriffe von schema.org. */
const FUEL: Record<string, string> = {
  PETROL: 'Gasoline', DIESEL: 'Diesel', LPG: 'LPG', CNG: 'CNG',
  HYBRID_PETROL: 'Hybrid', HYBRID_DIESEL: 'Hybrid', PLUGIN_HYBRID: 'Hybrid',
  ELECTRIC: 'Electric', HYDROGEN: 'Hydrogen',
};

const TRANSMISSION: Record<string, string> = {
  MANUAL: 'ManualTransmission',
  AUTOMATIC: 'AutomaticTransmission',
  SEMI_AUTOMATIC: 'SemiAutomaticTransmission',
};

/**
 * Strukturierte Daten nach schema.org/Car. Damit kann Google Preis,
 * Kilometerstand und Baujahr direkt in den Ergebnissen zeigen.
 */
export function VehicleJsonLd({
  vehicle,
  url,
}: {
  vehicle: VehicleDetail;
  url: string;
}) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: vehicle.title,
    url,
    sku: vehicle.publicCode,
    brand: { '@type': 'Brand', name: vehicle.brand.name },
    model: vehicle.model.name,
    itemCondition:
      vehicle.condition === 'NEW'
        ? 'https://schema.org/NewCondition'
        : 'https://schema.org/UsedCondition',
    offers: {
      '@type': 'Offer',
      url,
      price: (vehicle.priceCents / 100).toFixed(2),
      priceCurrency: 'EUR',
      availability:
        vehicle.status === 'ACTIVE'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/SoldOut',
      seller: {
        '@type': vehicle.dealer ? 'AutoDealer' : 'Person',
        name: vehicle.dealer?.companyName ?? vehicle.seller.name ?? siteConfig.name,
      },
    },
  };

  if (vehicle.images.length > 0) data.image = vehicle.images.slice(0, 6).map((i) => i.url);
  if (vehicle.description) data.description = vehicle.description;
  if (vehicle.firstRegistration) {
    data.vehicleModelDate = String(vehicle.firstRegistration.getFullYear());
    data.productionDate = vehicle.firstRegistration.toISOString().slice(0, 10);
  }
  if (vehicle.mileageKm !== null) {
    data.mileageFromOdometer = {
      '@type': 'QuantitativeValue', value: vehicle.mileageKm, unitCode: 'KMT',
    };
  }
  if (vehicle.fuel && FUEL[vehicle.fuel]) data.fuelType = FUEL[vehicle.fuel];
  if (vehicle.transmission) data.vehicleTransmission = TRANSMISSION[vehicle.transmission];
  if (vehicle.doors) data.numberOfDoors = vehicle.doors;
  if (vehicle.color) data.color = vehicle.color;
  if (vehicle.vin) data.vehicleIdentificationNumber = vehicle.vin;
  if (vehicle.powerKw) {
    data.vehicleEngine = {
      '@type': 'EngineSpecification',
      enginePower: {
        '@type': 'QuantitativeValue', value: kwToHp(vehicle.powerKw), unitCode: 'BHP',
      },
      ...(vehicle.displacementCcm
        ? {
            engineDisplacement: {
              '@type': 'QuantitativeValue', value: vehicle.displacementCcm, unitCode: 'CMQ',
            },
          }
        : {}),
    };
  }

  return (
    <script
      type="application/ld+json"
      // Der Inhalt stammt aus der eigenen Datenbank und wird als JSON serialisiert.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
