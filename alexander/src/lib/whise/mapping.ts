type FieldMap = Record<string, string>;

const DEFAULT_MAP: FieldMap = {
  energy_class: "energy_class",
  usable_floor_area_m2: "usable_floor_area_m2",
  year_of_construction: "year_of_construction",
  certificate_id: "epc_certificate_id",
  certificate_date: "epc_certificate_date",
  address: "address",
  postal_code: "postal_code",
  municipality: "municipality",
};

export function getWhiseFieldMap() {
  const raw = process.env.WHISE_FIELD_MAP_JSON;
  if (!raw) {
    return DEFAULT_MAP;
  }

  try {
    const parsed = JSON.parse(raw) as FieldMap;
    return { ...DEFAULT_MAP, ...parsed };
  } catch {
    return DEFAULT_MAP;
  }
}
