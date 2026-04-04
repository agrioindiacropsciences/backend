type SnapshotValue = string | null;

export interface DistributorProfileChange {
  field: string;
  label: string;
  previous: SnapshotValue;
  current: SnapshotValue;
}

type SnapshotRecord = Record<string, SnapshotValue>;

const TRACKED_FIELDS: Array<{ key: keyof SnapshotRecord; label: string }> = [
  { key: 'phone', label: 'Business Contact Number' },
  { key: 'email', label: 'Business Email' },
  { key: 'address_street', label: 'Street Address' },
  { key: 'address_area', label: 'Area / Locality' },
  { key: 'address_city', label: 'City' },
  { key: 'address_state', label: 'State' },
  { key: 'address_pincode', label: 'Pincode' },
  { key: 'coordinates', label: 'Coordinates' },
];

const normalizeValue = (value: unknown): SnapshotValue => {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const normalizeCoordinateValue = (value: unknown): SnapshotValue => {
  if (value === null || value === undefined) return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return normalizeValue(value);
  }

  return parsed
    .toFixed(8)
    .replace(/\.?0+$/, '');
};

const resolveCoordinatePair = (lat: unknown, lng: unknown): SnapshotValue => {
  const normalizedLat = normalizeCoordinateValue(lat);
  const normalizedLng = normalizeCoordinateValue(lng);

  if (!normalizedLat && !normalizedLng) return null;
  return [normalizedLat, normalizedLng].filter(Boolean).join(', ');
};

export const buildApprovedDistributorSnapshot = (distributor: any): SnapshotRecord => ({
  phone: normalizeValue(distributor?.phone),
  email: normalizeValue(distributor?.email),
  address_street: normalizeValue(distributor?.addressStreet ?? distributor?.address_street),
  address_area: normalizeValue(distributor?.addressArea ?? distributor?.address_area),
  address_city: normalizeValue(distributor?.addressCity ?? distributor?.address_city),
  address_state: normalizeValue(distributor?.addressState ?? distributor?.address_state),
  address_pincode: normalizeValue(distributor?.addressPincode ?? distributor?.address_pincode),
  coordinates: resolveCoordinatePair(
    distributor?.locationLat ?? distributor?.location_lat,
    distributor?.locationLng ?? distributor?.location_lng,
  ),
});

export const getDistributorProfileChanges = (
  approvedSnapshot: unknown,
  distributor: any,
): DistributorProfileChange[] => {
  if (!approvedSnapshot || typeof approvedSnapshot !== 'object' || Array.isArray(approvedSnapshot)) {
    return [];
  }

  const currentSnapshot = buildApprovedDistributorSnapshot(distributor);
  const baselineSnapshot = approvedSnapshot as Record<string, unknown>;

  return TRACKED_FIELDS.flatMap(({ key, label }) => {
    const previous = normalizeValue(baselineSnapshot[key]);
    const current = currentSnapshot[key];

    if (previous === current) {
      return [];
    }

    return [
      {
        field: key,
        label,
        previous,
        current,
      },
    ];
  });
};
