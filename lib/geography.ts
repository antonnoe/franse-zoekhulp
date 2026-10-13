import type { Place } from "./model";
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = (n: number) => n * Math.PI / 180;
  const x = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
// Density describes concentration of inhabitants, not access to amenities or quality of life.
export function densityFits(p: Place, preferences: string[]): boolean | null {
  if (!preferences.length) return true;
  if (p.density === null) return null;
  if (preferences.includes("hybrid") || preferences.includes("suburban")) return null;
  return (preferences.includes("urban") && p.density <= 4) || (preferences.includes("rural") && p.density >= 5);
}
