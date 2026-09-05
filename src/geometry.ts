import {
  centimetresToMetres,
  isWholeCentimetre,
  MAX_ROOM_DIMENSION_CENTIMETRES,
  MIN_ROOM_DIMENSION_CENTIMETRES,
} from './units'

export type Point = { x: number; y: number }

export type FurnitureGeometry = {
  x: number
  y: number
  width: number
  length: number
  rotation: 0 | 90 | 180 | 270
}

const EPSILON = 0.000_001
export const MIN_ROOM_DIMENSION_METRES = centimetresToMetres(MIN_ROOM_DIMENSION_CENTIMETRES)
export const MAX_ROOM_DIMENSION_METRES = centimetresToMetres(MAX_ROOM_DIMENSION_CENTIMETRES)

export function createRectangularRoom(width: number, length: number): Point[] | undefined {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(length) ||
    width < MIN_ROOM_DIMENSION_METRES ||
    width > MAX_ROOM_DIMENSION_METRES ||
    length < MIN_ROOM_DIMENSION_METRES ||
    length > MAX_ROOM_DIMENSION_METRES
  ) {
    return undefined
  }

  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: length },
    { x: 0, y: length },
  ]
}

export function createRectangularRoomFromCentimetres(
  width: number,
  length: number,
): Point[] | undefined {
  if (
    !isWholeCentimetre(width) ||
    !isWholeCentimetre(length) ||
    width < MIN_ROOM_DIMENSION_CENTIMETRES ||
    width > MAX_ROOM_DIMENSION_CENTIMETRES ||
    length < MIN_ROOM_DIMENSION_CENTIMETRES ||
    length > MAX_ROOM_DIMENSION_CENTIMETRES
  ) {
    return undefined
  }

  return createRectangularRoom(
    centimetresToMetres(width),
    centimetresToMetres(length),
  )
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function polygonArea(points: Point[]) {
  return Math.abs(
    points.reduce(
      (area, point, index) =>
        area + point.x * points[(index + 1) % points.length].y -
        points[(index + 1) % points.length].x * point.y,
      0,
    ) / 2,
  )
}

function orientation(a: Point, b: Point, c: Point) {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
  if (Math.abs(value) < EPSILON) return 0
  return value > 0 ? 1 : -1
}

function onSegment(a: Point, b: Point, point: Point) {
  return (
    point.x <= Math.max(a.x, b.x) + EPSILON &&
    point.x + EPSILON >= Math.min(a.x, b.x) &&
    point.y <= Math.max(a.y, b.y) + EPSILON &&
    point.y + EPSILON >= Math.min(a.y, b.y)
  )
}

export function segmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  const abC = orientation(a, b, c)
  const abD = orientation(a, b, d)
  const cdA = orientation(c, d, a)
  const cdB = orientation(c, d, b)

  if (abC !== abD && cdA !== cdB) return true
  return (
    (abC === 0 && onSegment(a, b, c)) ||
    (abD === 0 && onSegment(a, b, d)) ||
    (cdA === 0 && onSegment(c, d, a)) ||
    (cdB === 0 && onSegment(c, d, b))
  )
}

export function isSimplePolygon(points: Point[]) {
  if (points.length < 3 || polygonArea(points) < EPSILON) return false
  for (let index = 0; index < points.length; index += 1) {
    const next = (index + 1) % points.length
    if (distance(points[index], points[next]) < EPSILON) return false
    for (let other = index + 1; other < points.length; other += 1) {
      const otherNext = (other + 1) % points.length
      const adjacent =
        index === other ||
        next === other ||
        otherNext === index ||
        (index === 0 && otherNext === points.length - 1)
      // Adjacent walls intentionally meet at a corner; all other intersections are invalid.
      if (!adjacent && segmentsIntersect(points[index], points[next], points[other], points[otherNext])) {
        return false
      }
    }
  }
  return true
}

export function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index]
    const b = polygon[previous]
    if (orientation(a, b, point) === 0 && onSegment(a, b, point)) return true
    const crosses = (a.y > point.y) !== (b.y > point.y)
    const xAtY = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    if (crosses && point.x < xAtY) inside = !inside
  }
  return inside
}

export function furnitureCorners(item: FurnitureGeometry): Point[] {
  const halfWidth = (item.rotation === 90 || item.rotation === 270 ? item.length : item.width) / 2
  const halfLength = (item.rotation === 90 || item.rotation === 270 ? item.width : item.length) / 2
  return [
    { x: item.x - halfWidth, y: item.y - halfLength },
    { x: item.x + halfWidth, y: item.y - halfLength },
    { x: item.x + halfWidth, y: item.y + halfLength },
    { x: item.x - halfWidth, y: item.y + halfLength },
  ]
}

export function furnitureIsInsideRoom(item: FurnitureGeometry, room: Point[]) {
  const corners = furnitureCorners(item)
  if (!corners.every((corner) => pointInPolygon(corner, room))) return false

  for (let edge = 0; edge < corners.length; edge += 1) {
    const edgeEnd = (edge + 1) % corners.length
    for (let wall = 0; wall < room.length; wall += 1) {
      const wallEnd = (wall + 1) % room.length
      if (segmentsIntersect(corners[edge], corners[edgeEnd], room[wall], room[wallEnd])) {
        // Boundary contact is allowed, but a footprint edge may not cross a wall.
        const endpointOnWall =
          corners.some((corner) => orientation(room[wall], room[wallEnd], corner) === 0 && onSegment(room[wall], room[wallEnd], corner))
        if (!endpointOnWall) return false
      }
    }
  }
  return true
}

export function furnitureOverlaps(a: FurnitureGeometry, b: FurnitureGeometry) {
  const aCorners = furnitureCorners(a)
  const bCorners = furnitureCorners(b)
  const aMinX = Math.min(...aCorners.map((point) => point.x))
  const aMaxX = Math.max(...aCorners.map((point) => point.x))
  const aMinY = Math.min(...aCorners.map((point) => point.y))
  const aMaxY = Math.max(...aCorners.map((point) => point.y))
  const bMinX = Math.min(...bCorners.map((point) => point.x))
  const bMaxX = Math.max(...bCorners.map((point) => point.x))
  const bMinY = Math.min(...bCorners.map((point) => point.y))
  const bMaxY = Math.max(...bCorners.map((point) => point.y))
  return aMinX < bMaxX - EPSILON && aMaxX > bMinX + EPSILON && aMinY < bMaxY - EPSILON && aMaxY > bMinY + EPSILON
}

export function findAvailableFurniturePosition(
  width: number,
  length: number,
  room: Point[],
  occupied: FurnitureGeometry[],
): Point | undefined {
  if (!Number.isFinite(width) || !Number.isFinite(length) || width <= 0 || length <= 0) {
    return undefined
  }

  const xs = room.map((point) => point.x)
  const ys = room.map((point) => point.y)
  for (let y = Math.min(...ys) + 0.2; y < Math.max(...ys); y += 0.2) {
    for (let x = Math.min(...xs) + 0.2; x < Math.max(...xs); x += 0.2) {
      const candidate: FurnitureGeometry = { x, y, width, length, rotation: 0 }
      if (
        furnitureIsInsideRoom(candidate, room) &&
        !occupied.some((existing) => furnitureOverlaps(candidate, existing))
      ) {
        return { x, y }
      }
    }
  }

  return undefined
}

export function closestPointOnSegment(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  const raw = lengthSquared === 0 ? 0 : ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
  const t = Math.max(0, Math.min(1, raw))
  return { point: { x: start.x + t * dx, y: start.y + t * dy }, t }
}
