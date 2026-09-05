import type { Point } from './geometry'
import {
  centimetresToMetres,
  isWholeCentimetre,
  metresToCentimetres,
  roundToCentimetre,
} from './units'

export type Rotation = 0 | 90 | 180 | 270

export interface Furniture {
  id: string
  name: string
  width: number
  length: number
  color: string
  x: number
  y: number
  rotation: Rotation
}

export interface Opening {
  id: string
  kind: 'door' | 'window'
  wallIndex: number
  offset: number
  size: number
}

export interface LayoutFile {
  version: 1
  room: Point[]
  furniture: Furniture[]
  openings: Opening[]
}

interface CentimetrePoint {
  x: number
  y: number
}

interface CentimetreFurniture extends Omit<Furniture, 'width' | 'length' | 'x' | 'y'> {
  width: number
  length: number
  x: number
  y: number
}

interface CentimetreOpening extends Omit<Opening, 'offset' | 'size'> {
  offset: number
  size: number
}

export interface CentimetreLayoutFile {
  version: 2
  units: 'cm'
  room: CentimetrePoint[]
  furniture: CentimetreFurniture[]
  openings: CentimetreOpening[]
}

export interface ParsedLayout {
  layout: LayoutFile
  source: 'v1' | 'v2'
}

function isLegacyLayoutFile(value: unknown): value is LayoutFile {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<LayoutFile>
  if (
    candidate.version !== 1 ||
    !Array.isArray(candidate.room) ||
    !Array.isArray(candidate.furniture) ||
    !Array.isArray(candidate.openings)
  ) {
    return false
  }
  const pointsValid = candidate.room.every(
    (point) => point && Number.isFinite(point.x) && Number.isFinite(point.y),
  )
  const furnitureValid = candidate.furniture.every(
    (item) =>
      item &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.color === 'string' &&
      Number.isFinite(item.width) &&
      Number.isFinite(item.length) &&
      Number.isFinite(item.x) &&
      Number.isFinite(item.y) &&
      [0, 90, 180, 270].includes(item.rotation as number) &&
      item.width > 0 &&
      item.length > 0,
  )
  const openingsValid = candidate.openings.every(
    (opening) =>
      opening &&
      typeof opening.id === 'string' &&
      (opening.kind === 'door' || opening.kind === 'window') &&
      Number.isInteger(opening.wallIndex) &&
      Number.isFinite(opening.offset) &&
      Number.isFinite(opening.size),
  )
  return pointsValid && furnitureValid && openingsValid
}

function isCentimetreLayoutFile(value: unknown): value is CentimetreLayoutFile {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CentimetreLayoutFile>
  if (
    candidate.version !== 2 ||
    candidate.units !== 'cm' ||
    !Array.isArray(candidate.room) ||
    !Array.isArray(candidate.furniture) ||
    !Array.isArray(candidate.openings)
  ) {
    return false
  }
  const pointsValid = candidate.room.every(
    (point) => point && isWholeCentimetre(point.x) && isWholeCentimetre(point.y),
  )
  const furnitureValid = candidate.furniture.every(
    (item) =>
      item &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.color === 'string' &&
      isWholeCentimetre(item.width) &&
      isWholeCentimetre(item.length) &&
      isWholeCentimetre(item.x) &&
      isWholeCentimetre(item.y) &&
      [0, 90, 180, 270].includes(item.rotation as number) &&
      item.width > 0 &&
      item.length > 0,
  )
  const openingsValid = candidate.openings.every(
    (opening) =>
      opening &&
      typeof opening.id === 'string' &&
      (opening.kind === 'door' || opening.kind === 'window') &&
      Number.isInteger(opening.wallIndex) &&
      isWholeCentimetre(opening.offset) &&
      isWholeCentimetre(opening.size),
  )
  return pointsValid && furnitureValid && openingsValid
}

function layoutFromCentimetres(layout: CentimetreLayoutFile): LayoutFile {
  return {
    version: 1,
    room: layout.room.map((point) => ({
      x: centimetresToMetres(point.x),
      y: centimetresToMetres(point.y),
    })),
    furniture: layout.furniture.map((item) => ({
      ...item,
      width: centimetresToMetres(item.width),
      length: centimetresToMetres(item.length),
      x: centimetresToMetres(item.x),
      y: centimetresToMetres(item.y),
    })),
    openings: layout.openings.map((opening) => ({
      ...opening,
      offset: centimetresToMetres(opening.offset),
      size: centimetresToMetres(opening.size),
    })),
  }
}

function roundLayoutToCentimetres(layout: LayoutFile): LayoutFile {
  return {
    ...layout,
    room: layout.room.map((point) => ({
      x: roundToCentimetre(point.x),
      y: roundToCentimetre(point.y),
    })),
    furniture: layout.furniture.map((item) => ({
      ...item,
      width: roundToCentimetre(item.width),
      length: roundToCentimetre(item.length),
      x: roundToCentimetre(item.x),
      y: roundToCentimetre(item.y),
    })),
    openings: layout.openings.map((opening) => ({
      ...opening,
      offset: roundToCentimetre(opening.offset),
      size: roundToCentimetre(opening.size),
    })),
  }
}

export function toCentimetreLayout(layout: LayoutFile): CentimetreLayoutFile {
  return {
    version: 2,
    units: 'cm',
    room: layout.room.map((point) => ({
      x: metresToCentimetres(point.x),
      y: metresToCentimetres(point.y),
    })),
    furniture: layout.furniture.map((item) => ({
      ...item,
      width: metresToCentimetres(item.width),
      length: metresToCentimetres(item.length),
      x: metresToCentimetres(item.x),
      y: metresToCentimetres(item.y),
    })),
    openings: layout.openings.map((opening) => ({
      ...opening,
      offset: metresToCentimetres(opening.offset),
      size: metresToCentimetres(opening.size),
    })),
  }
}

export function parseLayout(value: unknown): ParsedLayout | undefined {
  if (isCentimetreLayoutFile(value)) {
    return { layout: layoutFromCentimetres(value), source: 'v2' }
  }
  if (isLegacyLayoutFile(value)) {
    // Version 1 values use the former coordinate unit, so normalize before validation.
    return { layout: roundLayoutToCentimetres(value), source: 'v1' }
  }
  return undefined
}
