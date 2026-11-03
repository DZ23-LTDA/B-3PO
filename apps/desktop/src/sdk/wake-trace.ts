/** Slow-step reporter for the Bot-Mode wake.
 *
 *  The wake clears `$gatewaySwapTarget` only in a `finally`, so any await inside it that never
 *  settles keeps the "Waking up <profile>…" overlay on screen and the composer blocked — with no
 *  error, no timeout and nothing in the log. Three hypotheses about which await that is were tested
 *  and disproved by rebuilding and re-running the app; the answer has to come from observation, not
 *  another guess.
 *
 *  `traceWakeStep` wraps a wake await and, when it is still pending after `SLOW_STEP_MS`, emits one
 *  `[bot-wake] step still pending` warning naming the step. Reading the renderer console then points
 *  at the single await that hangs. It never changes control flow: the returned promise settles
 *  exactly like the wrapped one, and a rejection passes through untouched.
 */
const SLOW_STEP_MS = 5_000

export function traceWakeStep<T>(step: string, work: Promise<T>): Promise<T> {
  const startedAt = Date.now()
  const timer = setTimeout(() => {
    console.warn('[bot-wake] step still pending', { step, ms: Date.now() - startedAt })
  }, SLOW_STEP_MS)

  return work.finally(() => {
    clearTimeout(timer)
  })
}
