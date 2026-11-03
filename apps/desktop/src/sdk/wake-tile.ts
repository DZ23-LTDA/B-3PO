/** Bounded transcript refresh for an already-mounted session tile.
 *
 *  `resumeTile` is a runtime round-trip with no deadline of its own. A delegate whose runtime never
 *  answers left the caller's await pending for the life of the window, and because the Bot-Mode wake
 *  clears `$gatewaySwapTarget` only in a `finally`, that pending promise kept the
 *  "Waking up <profile>…" overlay on screen with the composer blocked long after the profile's turn
 *  had completed. Expiry falls back to the plain resume request — exactly what a failed tile refresh
 *  already did — so a wedged tile degrades to the core resume path instead of hanging.
 */
import { withTimeout } from '@/lib/with-timeout'
import { requestSessionResume } from '@/store/session'

interface TileResumeDelegate {
  resumeTile: (storedSessionId: string, options: { refreshTranscript: boolean }) => Promise<unknown>
}

export async function resumeExistingTile(
  tileDelegate: TileResumeDelegate,
  storedSessionId: string,
  ownerRoute: Parameters<typeof requestSessionResume>[1] | null,
  timeoutMs: number
): Promise<void> {
  try {
    await withTimeout(
      tileDelegate.resumeTile(storedSessionId, { refreshTranscript: true }),
      timeoutMs,
      `Timed out loading ${storedSessionId}'s session history.`
    )
  } catch {
    requestSessionResume(storedSessionId, ownerRoute || undefined)
  }
}
