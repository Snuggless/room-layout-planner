import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent, PointerEvent } from 'react'
import {
  closestPointOnSegment,
  createRectangularRoomFromCentimetres,
  distance,
  findAvailableFurniturePosition,
  furnitureCorners,
  furnitureIsInsideRoom,
  furnitureOverlaps,
  isSimplePolygon,
  type Point,
} from './geometry'
import {
  parseLayout,
  toCentimetreLayout,
  type Furniture,
  type LayoutFile,
  type Opening,
  type Rotation,
} from './layoutPersistence'
import { downloadJsonFile } from './browserDownload'
import {
  centimetresToMetres,
  formatCentimetres,
  isWholeCentimetre,
  MAX_ROOM_DIMENSION_CENTIMETRES,
  metresToCentimetres,
  MIN_ROOM_DIMENSION_CENTIMETRES,
  roundToCentimetre,
} from './units'
import './App.css'

type OpeningKind = 'door' | 'window'
type DragTarget =
  | { kind: 'furniture'; id: string }
  | { kind: 'vertex'; index: number }
  | { kind: 'opening'; id: string }
type Dragging = DragTarget & { pointerId: number }

const INITIAL_ROOM: Point[] = createRectangularRoomFromCentimetres(600, 400) ?? []
const MIN_OPENING_SIZE_CENTIMETRES = 50
const MAX_OPENING_SIZE_CENTIMETRES = 250
const MIN_OPENING_SIZE = centimetresToMetres(MIN_OPENING_SIZE_CENTIMETRES)
const MAX_OPENING_SIZE = centimetresToMetres(MAX_OPENING_SIZE_CENTIMETRES)
const numberValue = (value: string) => Number(value)
const uid = () => crypto.randomUUID()

function wallLength(room: Point[], wallIndex: number) {
  return distance(room[wallIndex], room[(wallIndex + 1) % room.length])
}

function openingsAreValid(openings: Opening[], room: Point[]) {
  return openings.every((opening, index) => {
    if (
      !Number.isFinite(opening.size) ||
      !Number.isFinite(opening.offset) ||
      opening.wallIndex < 0 ||
      opening.wallIndex >= room.length ||
      opening.size < MIN_OPENING_SIZE ||
      opening.size > MAX_OPENING_SIZE
    ) {
      return false
    }
    const length = wallLength(room, opening.wallIndex)
    if (opening.size > length || opening.offset < opening.size / 2 || opening.offset > length - opening.size / 2) return false
    return !openings.some(
      (other, otherIndex) =>
        otherIndex !== index &&
        other.wallIndex === opening.wallIndex &&
        Math.abs(other.offset - opening.offset) < (opening.size + other.size) / 2,
    )
  })
}

function layoutIsValid(layout: LayoutFile) {
  if (!isSimplePolygon(layout.room) || !openingsAreValid(layout.openings, layout.room)) return false
  return layout.furniture.every(
    (item, index) =>
      furnitureIsInsideRoom(item, layout.room) &&
      !layout.furniture.some((other, otherIndex) => otherIndex !== index && furnitureOverlaps(item, other)),
  )
}

function findFurniturePosition(
  item: Omit<Furniture, 'id' | 'x' | 'y' | 'rotation'>,
  room: Point[],
  furniture: Furniture[],
): Furniture | undefined {
  const position = findAvailableFurniturePosition(item.width, item.length, room, furniture)
  return position === undefined ? undefined : { ...item, id: '', ...position, rotation: 0 as const }
}

function App() {
  const [room, setRoom] = useState<Point[]>(INITIAL_ROOM)
  const [roomForm, setRoomForm] = useState({ width: '600', length: '400' })
  const [furniture, setFurniture] = useState<Furniture[]>([])
  const [openings, setOpenings] = useState<Opening[]>([])
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null)
  const [selectedVertex, setSelectedVertex] = useState<number | null>(null)
  const [selectedWall, setSelectedWall] = useState(0)
  const [selectedOpening, setSelectedOpening] = useState<string | null>(null)
  const [pendingRoom, setPendingRoom] = useState<Point[] | null>(null)
  const [mode, setMode] = useState<'select' | 'add-vertex'>('select')
  const [dragging, setDragging] = useState<Dragging | null>(null)
  const [notice, setNotice] = useState('Tip: select a wall, then use “Add corner” to shape your room.')
  const [form, setForm] = useState({ name: 'Sofa', width: '180', length: '85', color: '#5267e9' })
  const svgRef = useRef<SVGSVGElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const viewBox = useMemo(() => {
    const xs = room.map((point) => point.x)
    const ys = room.map((point) => point.y)
    const padding = 1
    const minX = Math.min(...xs) - padding
    const minY = Math.min(...ys) - padding
    return { minX, minY, width: Math.max(...xs) - minX + padding, height: Math.max(...ys) - minY + padding }
  }, [room])
  const metricBounds = useMemo(() => ({
    minX: Math.min(...room.map((point) => point.x)),
    maxX: Math.max(...room.map((point) => point.x)),
    minY: Math.min(...room.map((point) => point.y)),
    maxY: Math.max(...room.map((point) => point.y)),
  }), [room])
  const selectedFurnitureItem = furniture.find((item) => item.id === selectedFurniture)
  const selectedOpeningItem = openings.find((item) => item.id === selectedOpening)

  const roomCanChange = (candidate: Point[], candidateOpenings = openings) =>
    isSimplePolygon(candidate) &&
    openingsAreValid(candidateOpenings, candidate) &&
    furniture.every((item) => furnitureIsInsideRoom(item, candidate))

  const applyRectangularRoom = (candidate: Point[], message: string) => {
    setRoom(candidate)
    setFurniture([])
    setOpenings([])
    resetSelection()
    setSelectedWall(0)
    setMode('select')
    setPendingRoom(null)
    setNotice(message)
  }

  const updateRoomRectangle = (event: FormEvent) => {
    event.preventDefault()
    const width = numberValue(roomForm.width)
    const length = numberValue(roomForm.length)
    const candidate = createRectangularRoomFromCentimetres(width, length)
    if (!candidate) {
      setNotice(`Room width and length must be whole centimetres from ${MIN_ROOM_DIMENSION_CENTIMETRES} to ${MAX_ROOM_DIMENSION_CENTIMETRES} cm.`)
      return
    }
    if (furniture.length > 0 || openings.length > 0) {
      setPendingRoom(candidate)
      setNotice('Review the room reset notice before clearing your existing layout.')
      return
    }
    applyRectangularRoom(candidate, 'Rectangular room created from the supplied metric dimensions.')
  }

  const eventPoint = (event: PointerEvent<SVGElement>) => {
    const bounds = svgRef.current?.getBoundingClientRect()
    if (!bounds) return { x: 0, y: 0 }
    // Quantize pointer edits at the UI boundary so internal geometry and saved cm values agree.
    return {
      x: roundToCentimetre(viewBox.minX + ((event.clientX - bounds.left) / bounds.width) * viewBox.width),
      y: roundToCentimetre(viewBox.minY + ((event.clientY - bounds.top) / bounds.height) * viewBox.height),
    }
  }

  const resetSelection = () => {
    setSelectedFurniture(null)
    setSelectedVertex(null)
    setSelectedOpening(null)
  }

  const startDrag = (
    event: PointerEvent<SVGElement>,
    target: DragTarget,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    // Capture on the canvas so labels and canvas edges cannot steal an active drag.
    svgRef.current?.setPointerCapture(event.pointerId)
    setDragging({ ...target, pointerId: event.pointerId })
  }

  const endDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (dragging !== null && dragging.pointerId !== event.pointerId) return
    if (svgRef.current?.hasPointerCapture(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId)
    }
    setDragging(null)
  }

  const selectFurnitureFromKeyboard = (
    event: KeyboardEvent<SVGGElement>,
    item: Furniture,
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    selectFurniture(item)
  }

  const onCanvasPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragging || dragging.pointerId !== event.pointerId) return
    event.preventDefault()
    const point = eventPoint(event)
    if (dragging.kind === 'furniture') {
      const current = furniture.find((item) => item.id === dragging.id)
      if (!current) return
      const candidate = { ...current, ...point }
      if (
        furnitureIsInsideRoom(candidate, room) &&
        !furniture.some((item) => item.id !== current.id && furnitureOverlaps(candidate, item))
      ) {
        setFurniture((items) => items.map((item) => (item.id === current.id ? candidate : item)))
      } else {
        setNotice('Furniture stays in its last valid position: it cannot overlap or cross the room boundary.')
      }
      return
    }
    if (dragging.kind === 'opening') {
      const current = openings.find((item) => item.id === dragging.id)
      if (!current) return
      const start = room[current.wallIndex]
      const end = room[(current.wallIndex + 1) % room.length]
      const closest = closestPointOnSegment(point, start, end)
      const candidate = {
        ...current,
        offset: roundToCentimetre(closest.t * wallLength(room, current.wallIndex)),
      }
      const updated = openings.map((item) => (item.id === current.id ? candidate : item))
      if (openingsAreValid(updated, room)) {
        setOpenings(updated)
      } else {
        setNotice('Opening stays in its last valid position: it must fit its wall without overlapping another opening.')
      }
      return
    }
    const candidate = room.map((vertex, index) => (index === dragging.index ? point : vertex))
    if (roomCanChange(candidate)) {
      setRoom(candidate)
      setNotice('Corner moved. The room remains valid and all pieces still fit.')
    } else {
      setNotice('Corner stays in its last valid position: the room must remain simple and contain its contents.')
    }
  }

  const addVertex = (wallIndex: number, point: Point) => {
    if (openings.some((opening) => opening.wallIndex === wallIndex)) {
      setNotice('Move or remove the wall opening before splitting that wall.')
      return
    }
    const start = room[wallIndex]
    const end = room[(wallIndex + 1) % room.length]
    const closest = closestPointOnSegment(point, start, end)
    if (closest.t < 0.08 || closest.t > 0.92) {
      setNotice('Choose a spot away from an existing corner.')
      return
    }
    const candidate = [...room.slice(0, wallIndex + 1), closest.point, ...room.slice(wallIndex + 1)]
    const adjustedOpenings = openings.map((opening) =>
      opening.wallIndex > wallIndex ? { ...opening, wallIndex: opening.wallIndex + 1 } : opening,
    )
    if (!roomCanChange(candidate, adjustedOpenings)) {
      setNotice('That corner would make the room invalid or exclude furniture.')
      return
    }
    setRoom(candidate)
    setOpenings(adjustedOpenings)
    setSelectedVertex(wallIndex + 1)
    setSelectedWall(wallIndex)
    setMode('select')
    setNotice('Corner added. Drag it to form your room.')
  }

  const deleteSelectedVertex = () => {
    if (selectedVertex === null) return
    if (room.length <= 3) {
      setNotice('A room needs at least three corners.')
      return
    }
    const previousWall = (selectedVertex - 1 + room.length) % room.length
    if (openings.some((opening) => opening.wallIndex === selectedVertex || opening.wallIndex === previousWall)) {
      setNotice('Remove openings from the adjoining walls before removing this corner.')
      return
    }
    const candidate = room.filter((_, index) => index !== selectedVertex)
    const adjustedOpenings = openings.map((opening) =>
      opening.wallIndex > selectedVertex ? { ...opening, wallIndex: opening.wallIndex - 1 } : opening,
    )
    if (!roomCanChange(candidate, adjustedOpenings)) {
      setNotice('Removing that corner would invalidate the room or exclude furniture.')
      return
    }
    setRoom(candidate)
    setOpenings(adjustedOpenings)
    setSelectedVertex(null)
    setSelectedWall(Math.min(selectedWall, candidate.length - 1))
    setNotice('Corner removed.')
  }

  const addFurniture = (event: FormEvent) => {
    event.preventDefault()
    const widthCentimetres = numberValue(form.width)
    const lengthCentimetres = numberValue(form.length)
    if (
      !form.name.trim() ||
      !isWholeCentimetre(widthCentimetres) ||
      !isWholeCentimetre(lengthCentimetres) ||
      widthCentimetres <= 0 ||
      lengthCentimetres <= 0
    ) {
      setNotice('Give the furniture a name and positive whole-centimetre dimensions.')
      return
    }
    const width = centimetresToMetres(widthCentimetres)
    const length = centimetresToMetres(lengthCentimetres)
    if (selectedFurnitureItem) {
      const updatedItem = {
        ...selectedFurnitureItem,
        name: form.name.trim(),
        width,
        length,
        color: form.color,
      }
      if (
        furnitureIsInsideRoom(updatedItem, room) &&
        !furniture.some((item) => item.id !== updatedItem.id && furnitureOverlaps(updatedItem, item))
      ) {
        setFurniture((items) => items.map((item) => (item.id === updatedItem.id ? updatedItem : item)))
        setNotice(`${updatedItem.name} updated.`)
      } else {
        setNotice('Those dimensions would collide with an item or cross the room boundary.')
      }
      return
    }
    const newItem = findFurniturePosition({ name: form.name.trim(), width, length, color: form.color }, room, furniture)
    if (!newItem) {
      setNotice('No free spot can fit this piece. Resize it or clear more room.')
      return
    }
    const withId = { ...newItem, id: uid() }
    setFurniture((items) => [...items, withId])
    setSelectedFurniture(null)
    setSelectedVertex(null)
    setNotice(`${withId.name} added in the first available free position. Add another item or click a piece to edit it.`)
  }

  const rotateSelectedFurniture = () => {
    if (!selectedFurnitureItem) return
    const rotation = ((selectedFurnitureItem.rotation + 90) % 360) as Rotation
    const candidate = { ...selectedFurnitureItem, rotation }
    if (
      furnitureIsInsideRoom(candidate, room) &&
      !furniture.some((item) => item.id !== candidate.id && furnitureOverlaps(candidate, item))
    ) {
      setFurniture((items) => items.map((item) => (item.id === candidate.id ? candidate : item)))
      setNotice('Furniture rotated 90°.')
    } else {
      setNotice('That rotation would collide with an item or cross the room boundary.')
    }
  }

  const addOpening = (kind: OpeningKind) => {
    const length = wallLength(room, selectedWall)
    const size = centimetresToMetres(
      Math.min(90, metresToCentimetres(length) - 10),
    )
    const opening: Opening = {
      id: uid(),
      kind,
      wallIndex: selectedWall,
      offset: roundToCentimetre(length / 2),
      size,
    }
    if (!openingsAreValid([...openings, opening], room)) {
      setNotice('That wall has no unoccupied space for this opening.')
      return
    }
    setOpenings((items) => [...items, opening])
    setSelectedOpening(opening.id)
    resetSelection()
    setSelectedOpening(opening.id)
    setNotice(`${kind === 'door' ? 'Door' : 'Window'} attached to wall ${selectedWall + 1}.`)
  }

  const updateSelectedOpening = (changes: Partial<Opening>) => {
    if (!selectedOpeningItem) return
    const candidate = { ...selectedOpeningItem, ...changes }
    const updated = openings.map((item) => (item.id === candidate.id ? candidate : item))
    if (openingsAreValid(updated, room)) {
      setOpenings(updated)
    } else {
      setNotice('Openings must fit their wall and cannot overlap another opening.')
    }
  }

  const downloadLayout = () => {
    try {
      downloadJsonFile(
        'room-layout-v2-cm.json',
        toCentimetreLayout({ version: 1, room, furniture, openings }),
      )
      setNotice('Version 2 centimetre layout downloaded.')
    } catch {
      setNotice('Could not download the layout. Your plan is unchanged; try again.')
    }
  }

  const loadLayout = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const parsed: unknown = JSON.parse(await file.text())
      const loaded = parseLayout(parsed)
      if (!loaded || !layoutIsValid(loaded.layout)) throw new Error('Invalid layout')
      setRoom(loaded.layout.room)
      setFurniture(loaded.layout.furniture)
      setOpenings(loaded.layout.openings)
      resetSelection()
      setSelectedWall(0)
      setNotice(loaded.source === 'v2'
        ? 'Centimetre layout loaded and validated. Your previous layout was replaced only after validation.'
        : 'Legacy version 1 layout converted to whole centimetres and validated before replacing your current layout.')
    } catch {
      setNotice('Could not load this file. The current layout has not been changed.')
    }
  }

  const selectFurniture = (item: Furniture) => {
    setSelectedFurniture(item.id)
    setSelectedVertex(null)
    setSelectedOpening(null)
    setForm({
      name: item.name,
      width: String(metresToCentimetres(item.width)),
      length: String(metresToCentimetres(item.length)),
      color: item.color,
    })
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="./" aria-label="Roomform home">
          <span className="brand-mark">R</span>
          <span>ROOMFORM</span>
        </a>
        <div className="topbar-actions">
          <button className="button button-quiet button-new-layout" type="button" onClick={() => {
            setRoomForm({ width: '600', length: '400' })
            applyRectangularRoom(INITIAL_ROOM, 'New layout ready with the default 600 cm × 400 cm room.')
          }}>New layout</button>
          <button className="button button-quiet" type="button" onClick={downloadLayout}>Save layout</button>
          <button className="button button-primary" type="button" onClick={() => fileRef.current?.click()}>Load layout</button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={loadLayout} hidden />
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar" aria-label="Planner controls">
          <div className="panel-heading">
            <p className="eyebrow">SPACE PLANNER</p>
            <h1>Shape your space.</h1>
            <p>Draw the room, then arrange each piece with precision.</p>
          </div>

          <section className="control-section">
            <div className="section-label"><span>01</span> Room geometry</div>
            <form className="room-form" onSubmit={updateRoomRectangle}>
              <div className="dimension-row">
                <label>Width (cm)<input type="number" min={MIN_ROOM_DIMENSION_CENTIMETRES} max={MAX_ROOM_DIMENSION_CENTIMETRES} step="1" required aria-describedby="room-dimension-help" value={roomForm.width} onChange={(event) => setRoomForm({ ...roomForm, width: event.target.value })} /></label>
                <label>Length (cm)<input type="number" min={MIN_ROOM_DIMENSION_CENTIMETRES} max={MAX_ROOM_DIMENSION_CENTIMETRES} step="1" required aria-describedby="room-dimension-help" value={roomForm.length} onChange={(event) => setRoomForm({ ...roomForm, length: event.target.value })} /></label>
              </div>
              <button className="button button-quiet full-width" type="submit">Set rectangular room</button>
            </form>
            <p id="room-dimension-help" className="helper-text">Enter whole centimetres from {MIN_ROOM_DIMENSION_CENTIMETRES} to {MAX_ROOM_DIMENSION_CENTIMETRES} cm. This creates a room from 0, 0.</p>
            {pendingRoom && (
              <div className="reset-warning" role="alert">
                <strong>Replace current layout?</strong>
                <p>This will clear {furniture.length} {furniture.length === 1 ? 'piece' : 'pieces'} of furniture and {openings.length} {openings.length === 1 ? 'opening' : 'openings'}.</p>
                <div className="reset-warning-actions">
                  <button className="button button-primary" type="button" onClick={() => applyRectangularRoom(pendingRoom, 'Rectangular room created. Existing furniture and openings were cleared.')}>Set room and clear layout</button>
                  <button className="button button-quiet" type="button" onClick={() => { setPendingRoom(null); setNotice('Room reset cancelled. Your current layout is unchanged.') }}>Cancel</button>
                </div>
              </div>
            )}
            <div className="control-grid">
              <button className={`tool-button ${mode === 'add-vertex' ? 'active' : ''}`} type="button" onClick={() => { setMode('add-vertex'); setNotice('Click a wall to add a new corner.'); }}>
                <span>＋</span> Add corner
              </button>
              <button className="tool-button" type="button" disabled={selectedVertex === null} onClick={deleteSelectedVertex}>
                <span>−</span> Remove corner
              </button>
            </div>
            <p className="helper-text">{mode === 'add-vertex' ? 'Add-corner mode: click a wall.' : 'Drag a round corner handle to reshape the room.'}</p>
          </section>

          <section className="control-section">
            <div className="section-label"><span>02</span> Add furniture</div>
            <form className="furniture-form" onSubmit={addFurniture}>
              <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={24} /></label>
              <div className="dimension-row">
                <label>Width (cm)<input type="number" min="1" step="1" value={form.width} onChange={(event) => setForm({ ...form, width: event.target.value })} /></label>
                <label>Length (cm)<input type="number" min="1" step="1" value={form.length} onChange={(event) => setForm({ ...form, length: event.target.value })} /></label>
              </div>
              <label className="color-control">Color<input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></label>
              <button className="button button-primary full-width" type="submit">{selectedFurnitureItem ? 'Update furniture' : 'Add to room'} <span>→</span></button>
            </form>
          </section>

          <section className="control-section">
            <div className="section-label"><span>03</span> Wall openings</div>
            <p className="helper-text">Wall {selectedWall + 1} selected. Openings stay attached as you reshape the room.</p>
            <div className="control-grid">
              <button className="tool-button" type="button" onClick={() => addOpening('door')}>⌑ Add door</button>
              <button className="tool-button" type="button" onClick={() => addOpening('window')}>▤ Add window</button>
            </div>
            {selectedOpeningItem && (
              <div className="opening-editor">
                <strong>{selectedOpeningItem.kind === 'door' ? 'Door' : 'Window'} settings</strong>
                <label>Size: {formatCentimetres(selectedOpeningItem.size)}
                  <input type="range" min={MIN_OPENING_SIZE_CENTIMETRES} max={MAX_OPENING_SIZE_CENTIMETRES} step="1" value={metresToCentimetres(selectedOpeningItem.size)} onChange={(event) => updateSelectedOpening({ size: centimetresToMetres(numberValue(event.target.value)) })} />
                </label>
                <label>Wall offset (cm)<input type="number" min="0" step="1" value={metresToCentimetres(selectedOpeningItem.offset)} onChange={(event) => updateSelectedOpening({ offset: centimetresToMetres(numberValue(event.target.value)) })} /></label>
                <button className="text-button danger" type="button" onClick={() => { setOpenings((items) => items.filter((item) => item.id !== selectedOpeningItem.id)); setSelectedOpening(null); }}>Remove opening</button>
              </div>
            )}
          </section>
        </aside>

        <section className="canvas-area" aria-label="Room layout canvas">
          <div className="canvas-header">
            <div><p className="eyebrow">CANVAS</p><h2>Untitled layout</h2></div>
            <div className="canvas-key"><i></i> 1 grid square = 10 cm</div>
          </div>
          <div className="planner-canvas">
            <svg
              ref={svgRef}
              viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onLostPointerCapture={endDrag}
              onPointerDown={(event) => { if (event.target === event.currentTarget) { resetSelection(); setMode('select') } }}
              aria-label="Top-down editable room plan"
            >
              <defs>
                <pattern id="grid" width="0.1" height="0.1" patternUnits="userSpaceOnUse"><path d="M .1 0 L 0 0 0 .1" fill="none" stroke="currentColor" strokeWidth="0.008" /></pattern>
              </defs>
              <rect x={viewBox.minX} y={viewBox.minY} width={viewBox.width} height={viewBox.height} className="grid-background" />
              <rect x={viewBox.minX} y={viewBox.minY} width={viewBox.width} height={viewBox.height} fill="url(#grid)" className="grid-lines" />
              <polygon points={room.map((point) => `${point.x},${point.y}`).join(' ')} className="room-fill" />
              {room.map((point, index) => {
                const end = room[(index + 1) % room.length]
                return <line key={`hit-${index}`} x1={point.x} y1={point.y} x2={end.x} y2={end.y} className={`wall-hit ${selectedWall === index ? 'selected' : ''}`} onPointerDown={(event) => { event.stopPropagation(); const canvasPoint = eventPoint(event); setSelectedWall(index); resetSelection(); if (mode === 'add-vertex') addVertex(index, canvasPoint); else setNotice(`Wall ${index + 1} selected.`) }} />
              })}
              <polygon points={room.map((point) => `${point.x},${point.y}`).join(' ')} className="room-outline" />
              <g className="dimension-lines">
                <line x1={metricBounds.minX} y1={metricBounds.minY - 0.38} x2={metricBounds.maxX} y2={metricBounds.minY - 0.38} />
                <text x={(metricBounds.minX + metricBounds.maxX) / 2} y={metricBounds.minY - 0.48}>{formatCentimetres(metricBounds.maxX - metricBounds.minX)}</text>
                <line x1={metricBounds.maxX + 0.38} y1={metricBounds.minY} x2={metricBounds.maxX + 0.38} y2={metricBounds.maxY} />
                <text x={metricBounds.maxX + 0.48} y={(metricBounds.minY + metricBounds.maxY) / 2}>{formatCentimetres(metricBounds.maxY - metricBounds.minY)}</text>
              </g>
              {openings.map((opening) => {
                const start = room[opening.wallIndex]
                const end = room[(opening.wallIndex + 1) % room.length]
                const length = wallLength(room, opening.wallIndex)
                const ux = (end.x - start.x) / length
                const uy = (end.y - start.y) / length
                const center = { x: start.x + ux * opening.offset, y: start.y + uy * opening.offset }
                const a = { x: center.x - ux * opening.size / 2, y: center.y - uy * opening.size / 2 }
                const b = { x: center.x + ux * opening.size / 2, y: center.y + uy * opening.size / 2 }
                const selected = opening.id === selectedOpening
                return <g key={opening.id} className={`opening ${opening.kind} ${selected ? 'selected' : ''}`} onPointerDown={(event) => { setSelectedOpening(opening.id); setSelectedFurniture(null); setSelectedVertex(null); startDrag(event, { kind: 'opening', id: opening.id }) }}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                  {opening.kind === 'door' && <path d={`M ${a.x} ${a.y} A ${opening.size} ${opening.size} 0 0 1 ${a.x + -uy * opening.size} ${a.y + ux * opening.size}`} />}
                  {opening.kind === 'window' && <line x1={a.x + -uy * 0.07} y1={a.y + ux * 0.07} x2={b.x + -uy * 0.07} y2={b.y + ux * 0.07} />}
                </g>
              })}
              {furniture.map((item) => {
                const corners = furnitureCorners(item)
                const selected = item.id === selectedFurniture
                const width = Math.abs(corners[1].x - corners[0].x)
                const length = Math.abs(corners[3].y - corners[0].y)
                return <g key={item.id} className={`furniture ${selected ? 'selected' : ''}`} role="button" tabIndex={0} aria-label={`Select ${item.name}`} onKeyDown={(event) => selectFurnitureFromKeyboard(event, item)} onPointerDown={(event) => { selectFurniture(item); startDrag(event, { kind: 'furniture', id: item.id }) }}>
                  <rect x={item.x - width / 2} y={item.y - length / 2} width={width} height={length} rx="0.08" fill={item.color} />
                  <text x={item.x} y={item.y - 0.05}>{item.name}</text>
                  <text x={item.x} y={item.y + 0.2} className="furniture-size">{formatCentimetres(item.width)} × {formatCentimetres(item.length)}</text>
                </g>
              })}
              {room.map((point, index) => <circle key={`vertex-${index}`} cx={point.x} cy={point.y} r="0.09" className={`vertex ${selectedVertex === index ? 'selected' : ''}`} onPointerDown={(event) => { setSelectedVertex(index); setSelectedFurniture(null); setSelectedOpening(null); startDrag(event, { kind: 'vertex', index }); }} />)}
            </svg>
            <div className="zoom-badge">TOP VIEW <b>100%</b></div>
          </div>
          <div className="status-bar" role="status"><span className="status-dot"></span>{notice}</div>
        </section>

        <aside className="inspector" aria-label="Selection inspector">
          <p className="eyebrow">INSPECTOR</p>
          {selectedFurnitureItem ? (
            <div className="inspector-card">
              <div className="furniture-swatch" style={{ backgroundColor: selectedFurnitureItem.color }}></div>
              <h2>{selectedFurnitureItem.name}</h2>
              <p>Selected furniture</p>
              <dl><div><dt>Width</dt><dd>{formatCentimetres(selectedFurnitureItem.width)}</dd></div><div><dt>Length</dt><dd>{formatCentimetres(selectedFurnitureItem.length)}</dd></div><div><dt>Rotation</dt><dd>{selectedFurnitureItem.rotation}°</dd></div></dl>
              <button className="button button-quiet full-width" type="button" onClick={rotateSelectedFurniture}>↻ Rotate 90°</button>
              <button className="text-button danger" type="button" onClick={() => { setFurniture((items) => items.filter((item) => item.id !== selectedFurnitureItem.id)); setSelectedFurniture(null); setNotice('Furniture removed.'); }}>Remove from room</button>
            </div>
          ) : (
            <div className="empty-inspector"><div className="selection-icon">⌖</div><h2>Select an item</h2><p>Click furniture to inspect, rotate, or remove it. Drag to place it freely.</p></div>
          )}
          <div className="constraint-note"><strong>Live constraints</strong><span>Furniture cannot overlap or cross your room boundary.</span></div>
        </aside>
      </section>
    </main>
  )
}

export default App
