export const CENTIMETRES_PER_METRE = 100
export const MIN_ROOM_DIMENSION_CENTIMETRES = 10
export const MAX_ROOM_DIMENSION_CENTIMETRES = 10_000

export function centimetresToMetres(centimetres: number): number {
  // SVG geometry stays in metres; all UI and persisted measurements stay in cm.
  return centimetres / CENTIMETRES_PER_METRE
}

export function metresToCentimetres(metres: number): number {
  return Math.round(metres * CENTIMETRES_PER_METRE)
}

export function roundToCentimetre(metres: number): number {
  return centimetresToMetres(metresToCentimetres(metres))
}

export function isWholeCentimetre(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value)
}

export function formatCentimetres(metres: number): string {
  return `${metresToCentimetres(metres)} cm`
}
