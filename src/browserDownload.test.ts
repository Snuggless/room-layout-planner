import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadJsonFile } from './browserDownload'
import { toCentimetreLayout, type LayoutFile } from './layoutPersistence'

const layout: LayoutFile = {
  version: 1,
  room: [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
  ],
  furniture: [],
  openings: [],
}

describe('browser JSON download', () => {
  const createObjectUrl = vi.fn((_blob: Blob) => 'blob:roomform-layout')
  const revokeObjectUrl = vi.fn()
  const click = vi.fn()
  const remove = vi.fn()
  const append = vi.fn()
  const link = {
    href: '',
    download: '',
    click,
    remove,
  } as unknown as HTMLAnchorElement

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('URL', {
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl,
    })
    vi.stubGlobal('document', {
      createElement: vi.fn(() => link),
      body: { append },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    link.href = ''
    link.download = ''
  })

  it('clicks a v2 centimetre download before revoking its object URL', async () => {
    downloadJsonFile('room-layout-v2-cm.json', toCentimetreLayout(layout))

    expect(link.download).toBe('room-layout-v2-cm.json')
    expect(link.href).toBe('blob:roomform-layout')
    expect(append).toHaveBeenCalledWith(link)
    expect(click).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledOnce()
    expect(revokeObjectUrl).not.toHaveBeenCalled()

    const blob = createObjectUrl.mock.calls[0][0]
    const savedLayout = JSON.parse(await blob.text()) as {
      version: number
      units: string
      room: Array<{ x: number; y: number }>
    }
    expect(savedLayout.version).toBe(2)
    expect(savedLayout.units).toBe('cm')
    expect(savedLayout.room.slice(0, 2)).toEqual([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ])

    vi.runOnlyPendingTimers()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:roomform-layout')
  })

  it('releases the object URL and propagates a browser click failure', () => {
    click.mockImplementationOnce(() => {
      throw new Error('Download blocked')
    })

    expect(() => downloadJsonFile('room-layout-v2-cm.json', {})).toThrow(
      'Download blocked',
    )
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:roomform-layout')
    expect(remove).toHaveBeenCalledOnce()
  })
})
