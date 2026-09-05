import { describe, expect, it } from 'vitest'
import {
  centimetresToMetres,
  formatCentimetres,
  isWholeCentimetre,
  metresToCentimetres,
  roundToCentimetre,
} from './units'

describe('centimetre conversions', () => {
  it('rounds internal coordinates to the nearest centimetre', () => {
    expect(roundToCentimetre(1.2349)).toBe(1.23)
    expect(roundToCentimetre(1.2351)).toBe(1.24)
    expect(metresToCentimetres(1.2351)).toBe(124)
  })

  it('preserves whole-centimetre values through SVG conversion', () => {
    expect(centimetresToMetres(185)).toBe(1.85)
    expect(metresToCentimetres(centimetresToMetres(185))).toBe(185)
    expect(formatCentimetres(1.85)).toBe('185 cm')
  })

  it('accepts only finite whole centimetres for persisted values', () => {
    expect(isWholeCentimetre(120)).toBe(true)
    expect(isWholeCentimetre(120.5)).toBe(false)
    expect(isWholeCentimetre(Number.NaN)).toBe(false)
  })
})
