import { describe, expect, it } from 'vitest'
import {
  createRectangularRoom,
  createRectangularRoomFromCentimetres,
  findAvailableFurniturePosition,
  furnitureIsInsideRoom,
  furnitureOverlaps,
  isSimplePolygon,
  MAX_ROOM_DIMENSION_METRES,
  MIN_ROOM_DIMENSION_METRES,
  pointInPolygon,
} from './geometry'
import {
  MAX_ROOM_DIMENSION_CENTIMETRES,
  MIN_ROOM_DIMENSION_CENTIMETRES,
} from './units'

const rectangle = [
  { x: 0, y: 0 },
  { x: 6, y: 0 },
  { x: 6, y: 4 },
  { x: 0, y: 4 },
]

describe('room polygon validation', () => {
  it('creates a rectangular room precisely from the origin', () => {
    expect(createRectangularRoomFromCentimetres(525, 350)).toEqual([
      { x: 0, y: 0 },
      { x: 5.25, y: 0 },
      { x: 5.25, y: 3.5 },
      { x: 0, y: 3.5 },
    ])
  })

  it('rejects non-whole or out-of-range centimetre dimensions', () => {
    expect(createRectangularRoomFromCentimetres(525.5, 350)).toBeUndefined()
    expect(createRectangularRoomFromCentimetres(MIN_ROOM_DIMENSION_CENTIMETRES - 1, 400)).toBeUndefined()
    expect(createRectangularRoomFromCentimetres(400, MAX_ROOM_DIMENSION_CENTIMETRES + 1)).toBeUndefined()
  })

  it('keeps the internal metre factory bounded', () => {
    expect(createRectangularRoom(MIN_ROOM_DIMENSION_METRES - 0.01, 4)).toBeUndefined()
    expect(createRectangularRoom(4, MAX_ROOM_DIMENSION_METRES + 0.01)).toBeUndefined()
    expect(createRectangularRoom(Number.NaN, 4)).toBeUndefined()
  })

  it('rejects self-intersecting polygons', () => {
    expect(isSimplePolygon([{ x: 0, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }, { x: 4, y: 0 }])).toBe(false)
  })

  it('rejects a repeated vertex and includes points on a room boundary', () => {
    expect(isSimplePolygon([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 4 },
    ])).toBe(false)
    expect(pointInPolygon({ x: 3, y: 0 }, rectangle)).toBe(true)
  })

  it('recognizes a concave room correctly', () => {
    const room = [...rectangle, { x: 0, y: 2 }]
    expect(pointInPolygon({ x: 1, y: 1 }, room)).toBe(true)
    expect(pointInPolygon({ x: -1, y: 1 }, room)).toBe(false)
  })
})

describe('furniture constraints', () => {
  it('finds distinct valid placements for multiple furniture pieces', () => {
    const firstPosition = findAvailableFurniturePosition(1, 1, rectangle, [])
    expect(firstPosition).toBeDefined()

    const firstPiece = {
      x: firstPosition!.x,
      y: firstPosition!.y,
      width: 1,
      length: 1,
      rotation: 0 as const,
    }
    const secondPosition = findAvailableFurniturePosition(1, 1, rectangle, [firstPiece])
    expect(secondPosition).toBeDefined()

    const secondPiece = {
      x: secondPosition!.x,
      y: secondPosition!.y,
      width: 1,
      length: 1,
      rotation: 0 as const,
    }
    expect(furnitureIsInsideRoom(secondPiece, rectangle)).toBe(true)
    expect(furnitureOverlaps(firstPiece, secondPiece)).toBe(false)
  })

  it('does not allow furniture to extend beyond a room', () => {
    expect(furnitureIsInsideRoom({ x: 5.6, y: 2, width: 1, length: 1, rotation: 0 }, rectangle)).toBe(false)
  })

  it('allows edge contact but rejects a positive-area overlap', () => {
    const left = { x: 1, y: 1, width: 1, length: 1, rotation: 0 as const }
    const touching = { x: 2, y: 1, width: 1, length: 1, rotation: 0 as const }
    const overlapping = { x: 1.99, y: 1, width: 1, length: 1, rotation: 0 as const }

    expect(furnitureOverlaps(left, touching)).toBe(false)
    expect(furnitureOverlaps(left, overlapping)).toBe(true)
  })

  it('detects collision after a 90 degree rotation', () => {
    const a = { x: 2, y: 2, width: 2, length: 1, rotation: 90 as const }
    const b = { x: 2.4, y: 2, width: 1, length: 1, rotation: 0 as const }
    expect(furnitureOverlaps(a, b)).toBe(true)
  })
})
