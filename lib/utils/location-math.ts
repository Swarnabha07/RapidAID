/**
 * T4 - pure coordinate helpers for the report location picker.
 *
 * No imports: safe in the browser and in plain node tests. The limits mirror the location rule
 * in `firestore.rules` and `lib/validation/report.ts` (lat -90..90, lng -180..180).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export const LAT_MIN = -90;
export const LAT_MAX = 90;
export const LNG_MIN = -180;
export const LNG_MAX = 180;

/** Six decimals is about 0.1 m: more precision than any phone GPS or map click can justify. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/**
 * Leaflet reports a longitude outside -180..180 when the user pans across a repeated copy of the
 * world. firestore.rules would reject such a value, so wrap it back into range.
 */
export function wrapLongitude(lng: number): number {
  if (!Number.isFinite(lng)) return lng;
  if (lng >= LNG_MIN && lng <= LNG_MAX) return lng;
  const wrapped = ((((lng - LNG_MIN) % 360) + 360) % 360) + LNG_MIN;
  return wrapped;
}

/**
 * Returns a rounded, in-range coordinate pair, or null when the input cannot be a real place
 * (not finite, or latitude outside -90..90). Longitude is wrapped, latitude is never clamped.
 */
export function normalizeLatLng(lat: number, lng: number): LatLng | null {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < LAT_MIN || lat > LAT_MAX) return null;
  const wrapped = wrapLongitude(lng);
  const point = { lat: roundCoordinate(lat), lng: roundCoordinate(wrapped) };
  if (point.lng < LNG_MIN || point.lng > LNG_MAX) return null;
  return point;
}

export type CoordinateParseResult =
  | { ok: true; value: LatLng }
  | { ok: false; error: string };

const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)$/;

/** Parses typed latitude/longitude text. Accepts a comma as the decimal separator. */
export function parseCoordinateInput(latText: string, lngText: string): CoordinateParseResult {
  const latRaw = latText.trim().replace(",", ".");
  const lngRaw = lngText.trim().replace(",", ".");
  if (!latRaw || !lngRaw) {
    return { ok: false, error: "Enter both latitude and longitude." };
  }
  if (!NUMBER_PATTERN.test(latRaw) || !NUMBER_PATTERN.test(lngRaw)) {
    return { ok: false, error: "Latitude and longitude must be plain numbers, for example 22.5726 and 88.3639." };
  }
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (lat < LAT_MIN || lat > LAT_MAX) {
    return { ok: false, error: "Latitude must be between -90 and 90." };
  }
  if (lng < LNG_MIN || lng > LNG_MAX) {
    return { ok: false, error: "Longitude must be between -180 and 180." };
  }
  const point = normalizeLatLng(lat, lng);
  if (!point) return { ok: false, error: "That is not a valid location." };
  return { ok: true, value: point };
}

export function formatCoordinates(point: LatLng): string {
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}
