import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resumeExistingTile } from './wake-tile'

const { requestSessionResume } = vi.hoisted(() => ({ requestSessionResume: vi.fn() }))

vi.mock('@/store/session', () => ({ requestSessionResume }))

const OWNER = { connectionId: 'local', profile: 'revisor' } as const

describe('resumeExistingTile', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    requestSessionResume.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('refreshes the tile and never asks the core to resume when the delegate answers', async () => {
    const resumeTile = vi.fn().mockResolvedValue('runtime-1')

    await resumeExistingTile({ resumeTile }, 'stored-1', OWNER, 20_000)

    expect(resumeTile).toHaveBeenCalledWith('stored-1', { refreshTranscript: true })
    expect(requestSessionResume).not.toHaveBeenCalled()
  })

  it('falls back to the core resume request instead of hanging on a wedged delegate', async () => {
    // A tile delegate whose runtime never answers used to leave the Bot-Mode wake pending forever:
    // the overlay stayed up and the composer stayed blocked after the turn had finished.
    const resumeTile = vi.fn().mockReturnValue(new Promise(() => {}))
    const settled = vi.fn()

    void resumeExistingTile({ resumeTile }, 'stored-1', OWNER, 20_000).then(settled)

    await vi.advanceTimersByTimeAsync(19_999)
    expect(settled).not.toHaveBeenCalled()
    expect(requestSessionResume).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(settled).toHaveBeenCalled()
    expect(requestSessionResume).toHaveBeenCalledWith('stored-1', OWNER)
  })

  it('falls back on a rejected refresh too', async () => {
    const resumeTile = vi.fn().mockRejectedValue(new Error('runtime went away'))

    await resumeExistingTile({ resumeTile }, 'stored-1', null, 20_000)

    expect(requestSessionResume).toHaveBeenCalledWith('stored-1', undefined)
  })
})
