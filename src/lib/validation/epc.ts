import type { EpcExtraction } from "@/lib/ai/epc";

const REQUIRED_FIELDS = [
  "energy_class",
  "usable_floor_area_m2",
  "year_of_construction",
  "certificate_id",
  "certificate_date",
];

const ENERGY_CLASSES = new Set([
  "A+",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
]);

export function validateEpcExtraction(extraction: EpcExtraction) {
  const issues: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    const value = extraction.fields?.[field]?.value;
    if (value === null || value === undefined || value === "") {
      issues.push(`Missing required field: ${field}`);
    }
  }

  const energyClass = extraction.fields?.energy_class?.value;
  if (energyClass && !ENERGY_CLASSES.has(String(energyClass).toUpperCase())) {
    issues.push("Energy class is not in expected range.");
  }

  const areaValue = Number(extraction.fields?.usable_floor_area_m2?.value);
  if (!Number.isNaN(areaValue) && (areaValue < 10 || areaValue > 2000)) {
    issues.push("Usable floor area looks out of range.");
  }

  const yearValue = Number(extraction.fields?.year_of_construction?.value);
  const currentYear = new Date().getFullYear() + 1;
  if (!Number.isNaN(yearValue) && (yearValue < 1800 || yearValue > currentYear)) {
    issues.push("Year of construction looks out of range.");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
