import { describe, expect, it } from 'vitest'
import { parseLayout, toCentimetreLayout, type LayoutFile } from './layoutPersistence'

const layout: LayoutFile = {
  version: 1,
  room: [
    { x: 0, y: 0 },
    { x: 5.25, y: 0 },
    { x: 5.25, y: 3.5 },
    { x: 0, y: 3.5 },
  ],
  furniture: [
    {
      id: 'desk',
      name: 'Desk',
      width: 1.2,
      length: 0.6,
      color: '#3355aa',
      x: 1.25,
      y: 0.8,
      rotation: 90,
    },
  ],
  openings: [
    { id: 'door', kind: 'door', wallIndex: 0, offset: 0.95, size: 0.9 },
  ],
}

describe('layout persistence', () => {
  it('serializes every persisted measurement as an integer centimetre in v2', () => {
    expect(toCentimetreLayout(layout)).toEqual({
      version: 2,
      units: 'cm',
      room: [
        { x: 0, y: 0 },
        { x: 525, y: 0 },
        { x: 525, y: 350 },
        { x: 0, y: 350 },
      ],
      furniture: [
        {
          id: 'desk',
          name: 'Desk',
          width: 120,
          length: 60,
          color: '#3355aa',
          x: 125,
          y: 80,
          rotation: 90,
        },
      ],
      openings: [
        { id: 'door', kind: 'door', wallIndex: 0, offset: 95, size: 90 },
      ],
    })
  })

  it('imports valid v2 centimetre layouts and restores internal coordinates', () => {
    const parsed = parseLayout(toCentimetreLayout(layout))

    expect(parsed).toEqual({ layout, source: 'v2' })
  })

  it('converts legacy v1 values to nearest-centimetre precision', () => {
    const parsed = parseLayout({
      ...layout,
      furniture: [{ ...layout.furniture[0], x: 1.2349 }],
    })

    expect(parsed?.source).toBe('v1')
    expect(parsed?.layout.furniture[0].x).toBe(1.23)
  })

  it('rejects non-integer centimetre values and unknown versions', () => {
    expect(parseLayout({
      ...toCentimetreLayout(layout),
      furniture: [{ ...toCentimetreLayout(layout).furniture[0], width: 120.5 }],
    })).toBeUndefined()
    expect(parseLayout({ version: 3, room: [], furniture: [], openings: [] })).toBeUndefined()
  })
})
